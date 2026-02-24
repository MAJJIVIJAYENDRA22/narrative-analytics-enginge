#!/usr/bin/env python
"""Comprehensive API test suite."""
import requests

print("=== COMPREHENSIVE API TESTS ===\n")

# Test 1: Empty/minimal data validation
print("Test 1: Minimal data validation")
try:
    r = requests.post('http://127.0.0.1:5000/analyze', 
                     json={'data': []}, timeout=10)
    if r.status_code == 400:
        print("✓ Empty data properly rejected")
    else:
        print(f"✗ Unexpected status: {r.status_code}")
except Exception as e:
    print(f"✗ Error: {e}")

# Test 2: Text analysis endpoint
print("\nTest 2: Text analysis endpoint")
try:
    r = requests.post('http://127.0.0.1:5000/analyze-text',
                     json={'text': 'This is amazing!'}, timeout=10)
    if r.status_code == 200:
        result = r.json()
        if 'sentiment' in result and 'confidence' in result:
            print(f"✓ Text analysis works: {result['sentiment']}")
        else:
            print(f"✗ Unexpected response: {list(result.keys())}")
    else:
        print(f"✗ Status: {r.status_code}")
except Exception as e:
    print(f"✗ Error: {e}")

# Test 3: Full analytics with proper structure
print("\nTest 3: Full analytics report")
data = {
    'data': [
        {'content': 'Excellent service!', 'rating': 5},
        {'content': 'Not satisfied', 'rating': 2},
        {'content': 'Very good', 'rating': 4},
        {'content': 'Bad experience', 'rating': 1},
        {'content': 'Amazing!', 'rating': 5},
        {'content': 'Poor', 'rating': 1},
        {'content': 'Good overall', 'rating': 4},
        {'content': 'Terrible', 'rating': 1},
    ]
}

try:
    r = requests.post('http://127.0.0.1:5000/analyze', json=data, timeout=30)
    if r.status_code == 200:
        result = r.json()
        required_keys = ['biOverview', 'descriptive', 'diagnostic', 'predictive', 'prescriptive']
        has_all = all(k in result for k in required_keys)
        if has_all:
            print("✓ Full analytics report generated")
            print(f"  Sections: {required_keys}")
            
            # Check nested structure
            desc = result.get('descriptive', {})
            if 'kpis' in desc and 'narrative' in desc:
                print("✓ Descriptive section has proper structure")
            pred = result.get('predictive', {})
            if 'narrative' in pred and 'confidence' in pred:
                print("✓ Predictive section has proper structure")
        else:
            missing = [k for k in required_keys if k not in result]
            print(f"✗ Missing sections: {missing}")
    else:
        print(f"✗ Status {r.status_code}: {r.text[:150]}")
except Exception as e:
    import traceback
    print(f"✗ Error: {e}")
    traceback.print_exc()

print("\n" + "="*50)
print("Testing complete!")
