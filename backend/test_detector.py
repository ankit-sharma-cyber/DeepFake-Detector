# test_detector.py — run this to debug
import sys
import os
from dotenv import load_dotenv

# Add current directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from services.image_detector import ImageDeepfakeDetector
load_dotenv('.env')

detector = ImageDeepfakeDetector()

# Test with test.jpg
result = detector.detect("test.jpg")

print("\n" + "="*50)
print("DETECTION RESULT:")
print("="*50)
for key, value in result.items():
    if key == 'gemini_report' and value:
        print(f"{key}:")
        for k, v in value.items():
            print(f"  {k}: {v}")
    else:
        print(f"{key}: {value}")
print("="*50)
