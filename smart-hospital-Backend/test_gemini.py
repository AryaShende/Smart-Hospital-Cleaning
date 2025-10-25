import os
from dotenv import load_dotenv
import google.generativeai as genai
from PIL import Image

# Load environment variables
load_dotenv()
gemini_api_key = os.getenv("GEMINI_API_KEY")

if not gemini_api_key:
    print("FATAL ERROR: GEMINI_API_KEY not found in .env file.")
    exit()

print("API Key loaded successfully.")

try:
    # Configure the client
    genai.configure(api_key=gemini_api_key)
    
    # Initialize the model
    model = genai.GenerativeModel(model_name="models/gemini-flash-latest")
    print("Gemini model initialized successfully.")

    # Open a local test image
    print("Opening test image...")
    img = Image.open("test_image.jpeg") # Make sure you have this image file

    # The prompt
    prompt = "Analyze this image of a hospital room. What is its cleanliness status?"

    # Generate content
    print("Sending request to Gemini API...")
    response = model.generate_content([prompt, img])

    print("\n--- GEMINI RESPONSE ---")
    print(response.text)
    print("-----------------------\n")
    print("Test completed successfully!")

except Exception as e:
    print(f"\n--- AN ERROR OCCURRED ---")
    print(f"Error Type: {type(e).__name__}")
    print(f"Error Details: {e}")
    print("-------------------------\n")