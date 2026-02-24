"""Test the /analyze endpoint"""
import json
import requests

API_URL = "http://127.0.0.1:5000/analyze"

# Simple test data
test_data = [
    {"text": "This is great!", "rating": 5},
    {"text": "Not good", "rating": 2},
    {"text": "Amazing product", "rating": 5},
]

print("Testing /analyze endpoint...")
print(f"URL: {API_URL}")
print(f"Payload: {json.dumps({'data': test_data}, indent=2)}")

try:
    response = requests.post(
        API_URL,
        json={"data": test_data},
        headers={"Content-Type": "application/json"},
        timeout=30
    )
    
    print(f"\nStatus Code: {response.status_code}")
    
    if response.status_code == 200:
        print("✅ SUCCESS! API is responding correctly")
        result = response.json()
        print(f"\n✅ Response structure includes:")
        for key in result.keys():
            print(f"  - {key}")
    else:
        print(f"❌ ERROR: {response.status_code}")
        print(f"Response: {response.text}")
        
except requests.exceptions.ConnectionError:
    print("❌ CONNECTION ERROR: Cannot connect to backend at http://127.0.0.1:5000")
    print("Make sure the Flask server is running!")
except Exception as e:
    print(f"❌ ERROR: {str(e)}")
