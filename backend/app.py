import os

import pandas as pd
from flask import Flask, jsonify, request
from flask_cors import CORS

from analytics_engine import run_full_analysis
from model_loader import get_sentiment_model
from utils import clean_dataframe, clean_text

app = Flask(__name__)
CORS(
    app,
    resources={r"/*": {"origins": "*"}},
    supports_credentials=True,
    allow_headers=["Content-Type", "Authorization"],
    methods=["GET", "POST", "OPTIONS"]
)

# Lazy load sentiment model to avoid startup crashes
SENTIMENT_MODEL = None


def get_model():
    """Lazy load the sentiment model."""
    global SENTIMENT_MODEL
    if SENTIMENT_MODEL is None:
        try:
            SENTIMENT_MODEL = get_sentiment_model()
        except Exception as e:
            app.logger.error(f"Failed to load sentiment model: {e}")
            raise
    return SENTIMENT_MODEL


@app.route("/analyze-text", methods=["POST"])
def analyze_text():
    payload = request.get_json(silent=True)
    if not payload or "text" not in payload:
        return jsonify({"error": "Missing 'text' in request body."}), 400

    text = payload.get("text")
    if not isinstance(text, str) or not text.strip():
        return jsonify({"error": "'text' must be a non-empty string."}), 400

    try:
        cleaned_text = clean_text(text)
        model = get_model()
        result = model(cleaned_text)[0]
        return jsonify(
            {
                "sentiment": result.get("label", "UNKNOWN"),
                "confidence": float(result.get("score", 0.0)),
            }
        )
    except Exception:
        app.logger.exception("Sentiment analysis failed.")
        return jsonify({"error": "Failed to analyze text."}), 500


@app.route("/analyze-dataset", methods=["POST"])
def analyze_dataset():
    if "file" not in request.files:
        return jsonify({"error": "Missing CSV file upload with key 'file'."}), 400

    file_storage = request.files["file"]
    if not file_storage or file_storage.filename == "":
        return jsonify({"error": "Empty filename for uploaded file."}), 400

    try:
        df = pd.read_csv(file_storage)
    except Exception:
        app.logger.exception("Failed to parse CSV.")
        return jsonify({"error": "Failed to parse CSV file."}), 400

    try:
        df = clean_dataframe(df)
        model = get_model()
        report = run_full_analysis(df, model)
        return jsonify(report)
    except Exception as e:
        app.logger.exception("Dataset analytics failed.")
        import traceback
        error_details = traceback.format_exc()
        print(f"Analytics Error (dataset): {str(e)}\n{error_details}", flush=True)
        return jsonify({"error": f"Failed to generate analytics report: {str(e)}"}), 500


@app.route("/analyze", methods=["POST"])
def analyze_json_dataset():
    payload = request.get_json(silent=True)
    if not payload or "data" not in payload:
        return jsonify({"error": "Missing 'data' in request body."}), 400

    data = payload.get("data")
    if not isinstance(data, list) or len(data) == 0:
        return jsonify({"error": "'data' must be a non-empty array."}), 400

    try:
        df = pd.DataFrame(data)
    except Exception:
        app.logger.exception("Failed to build DataFrame from JSON.")
        return jsonify({"error": "Failed to parse JSON data."}), 400

    try:
        df = clean_dataframe(df)
        model = get_model()
        report = run_full_analysis(df, model)
        return jsonify(report)
    except Exception as e:
        app.logger.exception("JSON dataset analytics failed.")
        import traceback
        error_details = traceback.format_exc()
        print(f"Analytics Error: {str(e)}\n{error_details}", flush=True)
        return jsonify({"error": f"ANALYTICS_ERROR: {str(e)} -- TRACEBACK: {error_details}"}), 500


if __name__ == "__main__":
    host = os.getenv("HOST", "127.0.0.1")
    port = int(os.getenv("PORT", "5000"))
    app.run(host=host, port=port, debug=False)
