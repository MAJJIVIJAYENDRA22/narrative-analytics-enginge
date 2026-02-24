#!/usr/bin/env python
"""Diagnostic script to test the analytics endpoint directly."""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

import pandas as pd
from analytics_engine import run_full_analysis
from model_loader import get_sentiment_model
from utils import clean_dataframe

# Test 1: Direct function call with mixed sentiment
print("=" * 60)
print("TEST 1: Direct analytics with mixed sentiment")
print("=" * 60)

data1 = [
    {'comment': 'Excellent!', 'value': 100},
    {'comment': 'Poor', 'value': 10},
    {'comment': 'Good!', 'value': 80},
]

try:
    df1 = pd.DataFrame(data1)
    df1 = clean_dataframe(df1)
    model = get_sentiment_model()
    result1 = run_full_analysis(df1, model)
    print("✓ Success - Mixed sentiment works")
except Exception as e:
    print(f"✗ Failed: {e}")

# Test 2: Direct function call with single sentiment (should gracefully skip)
print("\n" + "=" * 60)
print("TEST 2: Direct analytics with single sentiment (15 records)")
print("=" * 60)

data2 = [{'comment': f'Good #{i}!', 'value': 100-i} for i in range(15)]

try:
    df2 = pd.DataFrame(data2)
    df2 = clean_dataframe(df2)
    model = get_sentiment_model()
    result2 = run_full_analysis(df2, model)
    print("✓ Success - Single sentiment handled gracefully")
    print(f"  Predicted status: {result2.get('predictive', {}).get('narrative', '')[:100]}")
except Exception as e:
    import traceback
    print(f"✗ Failed: {e}")
    traceback.print_exc()

# Test 3: Flask endpoint
print("\n" + "=" * 60)
print("TEST 3: Flask endpoint via HTTP")
print("=" * 60)

import requests
import time
time.sleep(2)

try:
    r = requests.post('http://127.0.0.1:5000/analyze', json={'data': data2}, timeout=30)
    print(f"HTTP Status: {r.status_code}")
    if r.status_code == 200:
        print("✓ Flask endpoint returned 200 OK")
    else:
        print(f"✗ Flask endpoint returned {r.status_code}")
        print(f"  Response: {r.text[:200]}")
except Exception as e:
    print(f"✗ Request failed: {e}")
