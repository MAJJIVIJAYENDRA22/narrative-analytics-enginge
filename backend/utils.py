import re
from typing import Any

import pandas as pd


def clean_text(text: str) -> str:
    text = text.replace("\x00", " ")
    text = re.sub(r"[\r\n\t]+", " ", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def _normalize_value(value: Any) -> Any:
    if isinstance(value, str):
        return clean_text(value)
    return value


def clean_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    """Basic cleaning: drop nulls, dedupe, normalize string whitespace."""
    cleaned = df.copy()
    cleaned = cleaned.dropna(how="all")
    cleaned = cleaned.drop_duplicates()
    for column in cleaned.columns:
        cleaned[column] = cleaned[column].apply(_normalize_value)
    return cleaned
