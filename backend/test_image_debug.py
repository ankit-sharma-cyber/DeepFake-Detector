import os
import sys
import logging
import json
from dotenv import load_dotenv

# Load env before importing detector
load_dotenv(".env")
from services.image_detector import ImageDeepfakeDetector

logging.basicConfig(level=logging.INFO)
detector = ImageDeepfakeDetector()
filepath = r"c:\Users\ankit_frj21mc\OneDrive\Desktop\oracles-decree\backend\uploads\54233cdd4b4345dab8aaf8f6c3933e1a_localhost_5173_.png"

print(f"Starting detection test for {filepath}")
print(f"Gemini Key found: {bool(os.getenv('GEMINI_API_KEY'))}")
print(f"Model: {detector.gemini_model.model_name if detector.gemini_model else 'None'}")

try:
    result = detector.detect(filepath)
    print("SUCCESS (within detect method logic)")
    print(json.dumps(result, indent=2))
except Exception as e:
    print("FAILURE in script")
    print(f"ERROR_MESSAGE: {e}")
    import traceback
    traceback.print_exc()
