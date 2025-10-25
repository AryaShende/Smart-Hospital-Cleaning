import os
import sys
from dotenv import load_dotenv
import google.generativeai as genai
from supabase import create_client, Client

# Load all environment variables from the single .env file
load_dotenv()

# --- Load All Keys ---
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_KEY")
gemini_api_key = os.getenv("GEMINI_API_KEY")
jwt_secret = os.getenv("JWT_SECRET")

# --- Validate All Keys ---
# This check ensures the app doesn't start with missing configuration
if not all([supabase_url, supabase_key, gemini_api_key, jwt_secret]):
    print("FATAL ERROR: One or more required environment variables are missing.", file=sys.stderr)
    print("Please check your .env file and ensure all 4 keys are present.", file=sys.stderr)
    sys.exit(1)

# --- Initialize Supabase Client ---
try:
    supabase: Client = create_client(supabase_url, supabase_key)
    print("Supabase client initialized successfully.")
except Exception as e:
    print(f"Error initializing Supabase client: {e}", file=sys.stderr)
    sys.exit(1)

# --- Initialize Gemini Client ---
try:
    genai.configure(api_key=gemini_api_key)
    # Use the latest model that supports image analysis
    gemini_model = genai.GenerativeModel(model_name="models/gemini-flash-latest")
    print("Gemini model initialized successfully.")
except Exception as e:
    print(f"Error initializing Gemini model: {e}", file=sys.stderr)
    sys.exit(1)
