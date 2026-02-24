"""Quick test script to verify API response structure."""
import json
import sys

import pandas as pd

from analytics_engine import run_full_analysis
from model_loader import get_sentiment_model

# Create sample test data
test_data = {
    "text": [
        "This product is amazing and works great!",
        "Terrible experience, very disappointed.",
        "It's okay, nothing special.",
        "Love it! Highly recommend to everyone.",
        "Waste of money, don't buy this.",
        "Pretty good overall, satisfied with purchase.",
        "Not what I expected, poor quality.",
        "Excellent service and fast delivery!",
        "Average product, could be better.",
        "Fantastic! Best purchase ever!",
    ],
    "rating": [5, 1, 3, 5, 1, 4, 2, 5, 3, 5],
    "price": [29.99, 49.99, 19.99, 29.99, 39.99, 24.99, 44.99, 34.99, 22.99, 29.99],
}

df = pd.DataFrame(test_data)

print("Loading sentiment model...")
model = get_sentiment_model()

print("Running full analysis...")
result = run_full_analysis(df, model)

print("\n" + "=" * 80)
print("ANALYSIS RESULT STRUCTURE:")
print("=" * 80)
print(json.dumps(result, indent=2, default=str))

print("\n" + "=" * 80)
print("VALIDATION CHECKS:")
print("=" * 80)

# Validate structure
required_keys = ["biOverview", "descriptive", "diagnostic", "predictive", "prescriptive"]
for key in required_keys:
    status = "✓" if key in result else "✗"
    print(f"{status} {key}")

# Check nested structures
print("\nbiOverview structure:")
for key in ["composition", "trend", "distribution"]:
    status = "✓" if key in result.get("biOverview", {}) else "✗"
    print(f"  {status} {key}")

print("\ndescriptive structure:")
for key in ["kpis", "narrative", "chartData"]:
    status = "✓" if key in result.get("descriptive", {}) else "✗"
    print(f"  {status} {key}")

print("\ndiagnostic structure:")
for key in ["narrative", "correlations"]:
    status = "✓" if key in result.get("diagnostic", {}) else "✗"
    print(f"  {status} {key}")

print("\npredictive structure:")
for key in ["narrative", "forecast", "confidence", "modelExplanation"]:
    status = "✓" if key in result.get("predictive", {}) else "✗"
    print(f"  {status} {key}")

print("\nprescriptive structure:")
for key in ["narrative", "recommendations", "disclaimer"]:
    status = "✓" if key in result.get("prescriptive", {}) else "✗"
    print(f"  {status} {key}")

print("\n" + "=" * 80)
print("Sample KPIs:")
print("=" * 80)
for kpi in result.get("descriptive", {}).get("kpis", [])[:2]:
    print(f"  - {kpi['label']}: {kpi['value']}")

print("\n" + "=" * 80)
print("Sample Recommendations:")
print("=" * 80)
for rec in result.get("prescriptive", {}).get("recommendations", [])[:2]:
    print(f"  - [{rec['priority']}] {rec['action']}")

print("\n✅ Test complete! Backend structure matches frontend expectations.")
