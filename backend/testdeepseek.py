import os
import requests
from dotenv import load_dotenv

# Load .env variables
load_dotenv()
DEESPEEK_API_KEY = os.getenv("DEESPEEK_API_KEY")
DEESPEEK_API_URL = os.getenv("DEESPEEK_API_URL")

# Simple text to test embedding
test_text = "Hello, this is a test for DeepSeek embedding."

if not DEESPEEK_API_KEY or not DEESPEEK_API_URL:
    print("Error: DEESPEEK API key or URL not set")
else:
    headers = {"Authorization": f"Bearer {DEESPEEK_API_KEY}"}
    data = {"text": test_text}

    try:
        res = requests.post(DEESPEEK_API_URL, json=data, headers=headers)
        if res.status_code == 200:
            print("✅ Success! Embedding received:")
            print(res.json().get("embedding"))
        else:
            print(f"❌ Failed: {res.status_code}")
            print(res.text)
    except Exception as e:
        print(f"Error: {e}")
