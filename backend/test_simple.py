import sys
import json

# Force output to be visible
sys.stdout = sys.__stdout__
sys.stderr = sys.__stderr__

print("=" * 80, flush=True)
print("TESTING /analyze ENDPOINT", flush=True)
print("=" * 80, flush=True)

try:
    import requests
    
    url = "http://127.0.0.1:5000/analyze"
    payload = {
        "data": [
            {"text": "Great product!", "rating": 5},
            {"text": "Not good", "rating": 2},
            {"text": "Amazing!", "rating": 5},
        ]
    }
    
    print(f"\nSending POST to: {url}", flush=True)
    print(f"Payload: {json.dumps(payload, indent=2)}", flush=True)
    print("\nWaiting for response...", flush=True)
    
    response = requests.post(
        url,
        json=payload,
        headers={"Content-Type": "application/json"},
        timeout=60
    )
    
    print(f"\nStatus Code: {response.status_code}", flush=True)
    
    if response.status_code == 200:
        print("\n✅ SUCCESS!", flush=True)
        data = response.json()
        print("\nResponse keys:", list(data.keys()), flush=True)
    else:
        print(f"\n❌ ERROR: {response.status_code}", flush=True)
        print(f"Response: {response.text[:500]}", flush=True)
        
except Exception as e:
    print(f"\n❌ EXCEPTION: {type(e).__name__}: {str(e)}", flush=True)
    import traceback
    traceback.print_exc()

print("\n" + "=" * 80, flush=True)
print("TEST COMPLETE", flush=True)
print("=" * 80, flush=True)
