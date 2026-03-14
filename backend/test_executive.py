import pandas as pd
from analytics_engine import _create_executive_kpis, _create_executive_charts

# Create test data
test_data = pd.DataFrame({
    'revenue': [100, 150, 200, 180, 220],
    'profit': [20, 30, 40, 35, 45],
    'loss': [5, 10, 8, 12, 6],
    'orders': [10, 15, 20, 18, 22],
    'category': ['A', 'B', 'A', 'C', 'B'],
    'region': ['North', 'South', 'North', 'West', 'South'],
    'product': ['P1', 'P2', 'P3', 'P1', 'P2']
})

print("Testing _create_executive_kpis...")
try:
    kpis = _create_executive_kpis(test_data)
    print(f"✓ KPIs created: {len(kpis)} items")
    for kpi in kpis:
        print(f"  - {kpi}")
except Exception as e:
    print(f"✗ Error creating KPIs: {e}")
    import traceback
    traceback.print_exc()

print("\nTesting _create_executive_charts...")
try:
    charts = _create_executive_charts(test_data)
    print(f"✓ Charts created with keys: {list(charts.keys())}")
    for key, value in charts.items():
        print(f"  - {key}: {len(value)} items")
except Exception as e:
    print(f"✗ Error creating charts: {e}")
    import traceback
    traceback.print_exc()
