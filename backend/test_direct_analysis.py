import pandas as pd
from analytics_engine import run_full_analysis
from model_loader import get_sentiment_model
from utils import clean_dataframe

# Create test data with all positive sentiment
data = [{'comment': f'Good #{i}!', 'value': 100-i} for i in range(15)]
df = pd.DataFrame(data)
df = clean_dataframe(df)

try:
    model = get_sentiment_model()
    print("Model loaded successfully")
    result = run_full_analysis(df, model)
    print("Analysis completed successfully")
    print(f"Keys in result: {list(result.keys())}")
except Exception as e:
    import traceback
    print(f"Error: {e}")
    print(traceback.format_exc())
