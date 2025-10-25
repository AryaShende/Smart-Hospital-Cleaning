from flask import Flask, request, jsonify, Response
from flask_cors import CORS  # Import CORS
from datetime import datetime
import index  # Imports all functions from index.py
import storage # Imports all functions from storage.py

app = Flask(__name__)
CORS(app)  # Initialize CORS to allow all origins

# --- Auth Routes ---
@app.route("/register", methods=["POST"])
def register_route():
    data = request.get_json()
    if not data or not all(k in data for k in ["email", "password", "role", "full_name"]):
        return jsonify({"success": False, "message": "Missing required fields."}), 400
    
    result = index.register_new_user(data["email"], data["password"], data["role"], data["full_name"])
    if result["success"]:
        return jsonify(result), 201
    else:
        return jsonify(result), 409 # 409 Conflict for existing user

@app.route("/login", methods=["POST"])
def login_route():
    data = request.get_json()
    if not data or not all(k in data for k in ["email", "password"]):
        return jsonify({"success": False, "message": "Missing email or password."}), 400
    
    result = index.login_user(data["email"], data["password"])
    if result["success"]:
        return jsonify(result), 200
    else:
        return jsonify(result), 401 # 401 Unauthorized

# --- Task Routes ---
@app.route("/assign_task", methods=["POST"])
def assign_task_route():
    data = request.get_json()
    if not data or not all(k in data for k in ["room_id", "cleaner_id", "assignment_date", "assigned_by_id"]):
        return jsonify({"success": False, "message": "Missing required fields."}), 400
    
    result = index.assign_new_task(
        data["room_id"], data["cleaner_id"], data["assigned_by_id"],
        data["assignment_date"], data.get("notes", "")
    )
    return jsonify(result), (201 if result["success"] else 500)

@app.route("/tasks/<string:cleaner_id>", methods=["GET"])
def get_tasks_route(cleaner_id):
    result = index.get_cleaner_tasks(cleaner_id)
    return jsonify(result), (200 if result["success"] else 500)

# --- Verification Route ---
@app.route("/verify_room", methods=["POST"])
def verify_room_endpoint():
    if 'after_photo' not in request.files:
        return jsonify({"error": "No 'after_photo' file part in the request."}), 400
    
    after_photo = request.files['after_photo']
    room_id = request.form.get('room_id')
    cleaner_id = request.form.get('cleaner_id')
    
    if not all([room_id, cleaner_id]):
        return jsonify({"error": "Missing required form data."}), 400

    image_bytes = after_photo.read()
    ai_result = index.analyze_room_image(image_bytes)
    
    if not ai_result["success"]:
        # Pass the error from the index function to the client
        return jsonify({"error": ai_result.get("error", "Failed to analyze image.")}), 500

    # Placeholder for file upload
    after_photo_url = f"https://your-bucket-url.com/photos/{after_photo.filename}"
    before_photo_url = "http://example.com/before_placeholder.jpg" 

    save_result = storage.save_cleaning_record(
        room_id, cleaner_id, before_photo_url, after_photo_url,
        ai_result["status"], ai_result["remarks"]
    )
    return jsonify(save_result), (201 if save_result["success"] else 500)

# --- Dashboard Routes ---
@app.route("/dashboard", methods=["GET"])
def get_dashboard_data():
    result = index.get_dashboard_data()
    return jsonify(result), (200 if result["success"] else 500)

@app.route("/approve", methods=["POST"])
def approve_task_route():
    data = request.get_json()
    if not data or not all(k in data for k in ["record_id", "new_status"]):
        return jsonify({"success": False, "message": "Missing 'record_id' or 'new_status'."}), 400
    
    new_status = data["new_status"]
    if new_status not in ["Approved", "Rework"]:
        return jsonify({"success": False, "message": "Invalid status. Must be 'Approved' or 'Rework'."}), 400

    result = index.process_manager_approval(data["record_id"], new_status)
    return jsonify(result), (200 if result["success"] else 500)

# --- Report Route ---
@app.route("/report/weekly", methods=["GET"])
def generate_report_endpoint():
    result = storage.get_weekly_approved_records()
    
    if not result["success"]:
        return jsonify({"error": f"Failed to fetch data: {result['error']}"}), 500

    try:
        pdf_content = index.generate_pdf_report(result["data"])
        filename = f"Weekly_Report_{datetime.now().strftime('%Y-%m-%d')}.pdf"
        
        return Response(
            pdf_content,
            mimetype="application/pdf",
            headers={"Content-Disposition": f"attachment;filename={filename}"}
        )
    except Exception as e:
        return jsonify({"error": f"Failed to generate PDF: {str(e)}"}), 500

# --- Run the Single Server ---
if __name__ == "__main__":
    print("Starting single Smart Hospital server...")
    app.run(host="0.0.0.0", port=5000, debug=True)
