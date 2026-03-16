**Narrative Analytics Engine
Overview**

The Narrative Analytics Engine is a web-based analytics platform that transforms structured datasets into clear narratives, insights, and recommendations.
Unlike traditional dashboards that rely only on charts, this system provides human-readable explanations and structured analytics categories to help users understand data more easily.

The platform validates data quality, cleans datasets, extracts insights, and generates narrative explanations while supporting responsible visualization and downloadable reports.

**Key Features**
1. Cleaned Dataset Download

Allows users to download the cleaned and preprocessed dataset.

Ensures transparency between raw and processed data.

Enables reuse of cleaned data for future analysis.

2. Intelligent Data Validation & Quality Control

Automatically validates dataset schema and column types.

Generates a Data Quality Report with a quality score.

Prevents analysis if dataset quality falls below the required threshold.

3. Automated Data Cleaning & Preprocessing

Handles missing values and duplicates.

Normalizes categorical data.

Detects and treats outliers.

Maintains a cleaning log (audit trail).

4. Insight Categorization

The system organizes insights into four analytical categories:

Descriptive Insights

What happened in the data

Trends, patterns, and correlations

Diagnostic Insights

Why it happened

Root cause analysis

Predictive Insights

What may happen next

Trend forecasting

Prescriptive Insights

What actions should be taken

Data-driven recommendations

5. Responsible Visualization

Charts are displayed only for descriptive insights.

Predictive and prescriptive outputs are explained through narratives to avoid misleading visualizations.

6. Automated Insight Extraction

Detects trends, anomalies, and patterns automatically.

Ranks insights based on importance and impact.

7. Narrative Insight Generation

Converts numerical analysis results into human-readable explanations using rule-based Natural Language Generation (NLG).

Makes analytics understandable for non-technical users.

8. Overall Insight Summary

Provides an executive-level overview summarizing:

descriptive findings

diagnostic causes

predictive trends

prescriptive recommendations

9. Complete Report Download

Users can download a full analysis report including:

Data Quality Report

Cleaned Dataset Summary

Categorized Insights

Visualizations

Overall Insight Summary

10. Unified Web Dashboard

The platform provides a clean dashboard with dedicated sections for:

Data Quality

Cleaned Data

Descriptive Insights

Diagnostic Insights

Predictive Insights

Prescriptive Insights

Overall Summary

**Technology Stack**

Frontend

React

HTML

CSS

Backend

FastAPI

Python

Data Processing

Pandas

NumPy

Machine Learning / Analytics

Scikit-learn

Statistical analysis methods

Visualization

Plotly / Chart libraries

**System Architecture**
User Upload
      │
      ▼
Data Validation & Quality Assessment
      │
      ▼
Data Cleaning & Preprocessing
      │
      ▼
Insight Extraction Engine
      │
      ├── Descriptive Insights (with charts)
      ├── Diagnostic Insights
      ├── Predictive Insights
      └── Prescriptive Insights
      │
      ▼
Narrative Generation
      │
      ▼
Dashboard Visualization
      │
      ▼
Report & Dataset Download
Project Workflow

User uploads dataset (CSV / JSON).

System validates dataset structure and quality.

Data cleaning and preprocessing are applied.

Analytical insights are extracted and categorized.

Narratives are generated from analytical results.

Descriptive insights are visualized.

Final report and cleaned dataset are available for download.

**Installation**
Clone the repository
git clone: https://github.com/MAJJIVIJAYENDRA22/narrative-analytics-enginge.git
Navigate to the project directory
cd narrative-analytics-engine
Install dependencies
pip install -r requirements.txt
Run backend
uvicorn main:app --reload
Run frontend
npm install
npm start
Future Improvements

Integration with real-time data sources

Advanced machine learning models

Natural language query interface

Interactive storytelling dashboards
