import os
from dotenv import load_dotenv
import google.generativeai as genai

# Load environment variables
load_dotenv()
gemini_api_key = os.getenv("GEMINI_API_KEY")

if not gemini_api_key:
    print("FATAL ERROR: GEMINI_API_KEY not found in .env file.")
    exit()

try:
    # Configure the client
    genai.configure(api_key=gemini_api_key)
    
    print("\n--- Available Models for 'generateContent' ---\n")
    
    count = 0
    # List all models and filter for the ones that support generateContent
    for m in genai.list_models():
        if 'generateContent' in m.supported_generation_methods:
            print(m.name)
            count += 1
    
    print(f"\nFound {count} models.")

    if count < 5:
        print("\nWARNING: This is a very short list. Your google-generativeai library is almost certainly outdated.")
        print("Please run: pip install --upgrade google-generativeai")

except Exception as e:
    print(f"\n--- AN ERROR OCCURRED ---")
    print(f"Error Type: {type(e).__name__}")
    print(f"Error Details: {e}")
    print("-------------------------\n")