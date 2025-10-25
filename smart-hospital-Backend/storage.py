from config import supabase
from datetime import datetime, timedelta, timezone

# --- User and Auth Functions ---
def create_user(email, password_hash, role, full_name):
    try:
        response = supabase.table("users").insert({
            "email": email, "password_hash": password_hash,
            "role": role, "full_name": full_name
        }).execute()
        return {"success": True, "data": response.data[0]}
    except Exception as e:
        return {"success": False, "error": str(e)}

def get_user_by_email(email):
    try:
        response = supabase.table("users").select("*").eq("email", email).limit(1).execute()
        return {"success": True, "data": response.data[0] if response.data else None}
    except Exception as e:
        return {"success": False, "error": str(e)}

# --- Task Assignment Functions ---
def create_task_assignment(room_id, cleaner_id, assigned_by_id, assignment_date, notes):
    try:
        task_data = {
            "room_id": room_id, "cleaner_id": cleaner_id, "assigned_by_id": assigned_by_id,
            "assignment_date": assignment_date, "notes": notes, "status": "Pending"
        }
        response = supabase.table("task_assignments").insert(task_data).execute()
        return {"success": True, "data": response.data[0]}
    except Exception as e:
        return {"success": False, "error": str(e)}

def get_tasks_for_cleaner(cleaner_id):
    try:
        response = supabase.table("task_assignments").select("*").eq("cleaner_id", cleaner_id).execute()
        return {"success": True, "data": response.data}
    except Exception as e:
        return {"success": False, "error": str(e)}

# --- Cleaning Records Functions ---
def save_cleaning_record(room_id, cleaner_id, before_photo_url, after_photo_url, cleanliness_status, ai_remarks):
    try:
        record = {
            "room_id": room_id, "cleaner_id": cleaner_id,
            "before_photo_url": before_photo_url, "after_photo_url": after_photo_url,
            "cleanliness_status": cleanliness_status, "ai_remarks": ai_remarks,
            "manager_approval_status": "Pending"
        }
        response = supabase.table('cleaning_records').insert(record).execute()
        return {"success": True, "data": response.data[0]}
    except Exception as e:
        return {"success": False, "error": str(e)}

def get_pending_records():
    try:
        response = supabase.table('cleaning_records').select('*').eq('manager_approval_status', 'Pending').execute()
        # Return a consistent dictionary
        return {"success": True, "data": response.data}
    except Exception as e:
        return {"success": False, "error": str(e)}

def update_record_status(record_id, new_status):
    try:
        response = supabase.table('cleaning_records').update({'manager_approval_status': new_status}).eq('id', record_id).execute()
        return {"success": True, "data": response.data[0]}
    except Exception as e:
        return {"success": False, "error": str(e)}

def get_weekly_approved_records():
    try:
        seven_days_ago = datetime.now(timezone.utc) - timedelta(days=7)
        response = supabase.table('cleaning_records').select('*').eq('manager_approval_status', 'Approved').gte('created_at', seven_days_ago.isoformat()).execute()
        print(f"Successfully fetched {len(response.data)} records for the weekly report.")
        # Return a consistent dictionary
        return {"success": True, "data": response.data, "error": None}
    except Exception as e:
        print(f"Database error fetching weekly report data: {e}")
        return {"success": False, "data": [], "error": str(e)}
