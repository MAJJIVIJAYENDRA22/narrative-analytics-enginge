import os
from functools import lru_cache

from transformers import pipeline

MODEL_NAME = os.getenv(
    "SENTIMENT_MODEL",
    "distilbert-base-uncased-finetuned-sst-2-english",
)


@lru_cache(maxsize=1)
def get_sentiment_model():
    return pipeline("sentiment-analysis", model=MODEL_NAME)
