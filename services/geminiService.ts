
import { AnalysisSummary, DataRow } from "../types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:5000";

/**
 * Performs heuristic-based data cleaning.
 * In a real-world app, this might also involve LLM-guided transformation.
 */
export function cleanDataset(data: DataRow[]): { cleanedData: DataRow[], report: string[] } {
  if (!data || data.length === 0) return { cleanedData: [], report: ["Empty dataset provided."] };

  const report: string[] = [];
  const initialCount = data.length;
  const columns = Object.keys(data[0]);

  // 1. Deduplication
  const seen = new Set();
  const uniqueData = data.filter(row => {
    const s = JSON.stringify(row);
    return seen.has(s) ? false : seen.add(s);
  });
  const dupeCount = initialCount - uniqueData.length;
  if (dupeCount > 0) report.push(`Removed ${dupeCount} duplicate records.`);

  // 2. Imputation and Normalization
  let missingValueCount = 0;
  let normalizedCount = 0;

  const cleanedData = uniqueData.map(row => {
    const newRow = { ...row };
    columns.forEach(col => {
      let val = newRow[col];

      // Standardize strings
      if (typeof val === 'string') {
        const trimmed = val.trim();
        if (trimmed !== val) {
          newRow[col] = trimmed;
          normalizedCount++;
        }
      }

      // Handle nulls/empties
      if (val === null || val === undefined || val === '') {
        missingValueCount++;
        // Simple heuristic: Fill numbers with 0, strings with 'N/A'
        const columnType = typeof data.find(r => r[col] !== null && r[col] !== undefined)?.[col];
        newRow[col] = columnType === 'number' ? 0 : 'Unspecified';
      }
    });
    return newRow;
  });

  if (missingValueCount > 0) report.push(`Handled ${missingValueCount} missing or null values via imputation.`);
  if (normalizedCount > 0) report.push(`Normalized ${normalizedCount} string entries (whitespace/casing).`);
  if (report.length === 0) report.push("No significant cleaning required. Dataset structure is healthy.");

  return { cleanedData, report };
}

export async function analyzeDataset(data: DataRow[]): Promise<AnalysisSummary> {
  const response = await fetch(`${API_BASE_URL}/analyze`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ data }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Failed to generate analytics.");
  }

  return (await response.json()) as AnalysisSummary;
}

export function assessDataQuality(data: DataRow[]): { score: number; status: 'green' | 'yellow' | 'red'; checks: any[] } {
  if (!data || data.length === 0) return { score: 0, status: 'red', checks: [] };
  const columns = Object.keys(data[0]);
  const rowCount = data.length;
  const checks = [];
  let totalMissing = 0;
  data.forEach(row => {
    Object.values(row).forEach(val => {
      if (val === null || val === undefined || val === '') totalMissing++;
    });
  });
  const missingRatio = totalMissing / (rowCount * columns.length);
  checks.push({
    name: 'Completeness',
    status: missingRatio < 0.05 ? 'pass' : missingRatio < 0.2 ? 'warning' : 'fail',
    message: `${(missingRatio * 100).toFixed(1)}% missing data.`
  });
  checks.push({
    name: 'Robustness',
    status: rowCount > 50 ? 'pass' : 'warning',
    message: `${rowCount} rows detected.`
  });
  checks.push({
    name: 'Feature Diversity',
    status: columns.length > 3 ? 'pass' : 'warning',
    message: `${columns.length} columns identified.`
  });
  const failCount = checks.filter(c => c.status === 'fail').length;
  const warningCount = checks.filter(c => c.status === 'warning').length;
  let status: 'green' | 'yellow' | 'red' = 'green';
  if (failCount > 0) status = 'red';
  else if (warningCount > 1) status = 'yellow';
  return { score: Math.max(0, 100 - (failCount * 40 + warningCount * 15)), status, checks };
}
