
import { AnalysisSummary, DataRow } from "../types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:5000";

/**
 * Performs heuristic-based data cleaning.
 * In a real-world app, this might also involve LLM-guided transformation.
 */
type InferredType = "numeric" | "date" | "categorical";

interface CleaningResult {
  cleanedData: DataRow[];
  report: string[];
  removedInvalidRows: number;
  removedDuplicates: number;
  imputedValues: number;
  normalizedValues: number;
}

const isMissingValue = (value: unknown): boolean => value === null || value === undefined || value === "";

const parseNumber = (value: unknown): number | null => {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;
  const parsed = Number(value.replace(/[$,%\s,]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
};

const parseDate = (value: unknown): string | null => {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
};

const inferColumnTypes = (rows: DataRow[], columns: string[]): Record<string, InferredType> => {
  const result: Record<string, InferredType> = {};

  columns.forEach((column) => {
    const values = rows
      .map((row) => row[column])
      .filter((value) => !isMissingValue(value))
      .slice(0, 300);

    if (!values.length) {
      result[column] = "categorical";
      return;
    }

    const numericRatio = values.filter((value) => parseNumber(value) !== null).length / values.length;
    const dateRatio = values.filter((value) => parseDate(value) !== null).length / values.length;

    if (numericRatio >= 0.8) {
      result[column] = "numeric";
    } else if (dateRatio >= 0.75) {
      result[column] = "date";
    } else {
      result[column] = "categorical";
    }
  });

  return result;
};

const median = (values: number[]): number => {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) return (sorted[mid - 1] + sorted[mid]) / 2;
  return sorted[mid];
};

const mode = (values: string[]): string => {
  if (!values.length) return "Unspecified";
  const counts = new Map<string, number>();
  values.forEach((v) => counts.set(v, (counts.get(v) ?? 0) + 1));
  let best = values[0];
  let maxCount = 0;
  counts.forEach((count, value) => {
    if (count > maxCount) {
      maxCount = count;
      best = value;
    }
  });
  return best;
};

export function cleanDataset(data: DataRow[]): CleaningResult {
  if (!data || data.length === 0) {
    return {
      cleanedData: [],
      report: ["Empty dataset provided."],
      removedInvalidRows: 0,
      removedDuplicates: 0,
      imputedValues: 0,
      normalizedValues: 0,
    };
  }

  const columns = Object.keys(data[0]);
  const inferredTypes = inferColumnTypes(data, columns);
  const report: string[] = [];

  let normalizedValues = 0;
  let imputedValues = 0;
  let removedInvalidRows = 0;

  const stagedRows: DataRow[] = [];

  data.forEach((row) => {
    if (!row || typeof row !== "object") {
      removedInvalidRows += 1;
      return;
    }

    let rowInvalid = false;
    const staged: DataRow = {};

    columns.forEach((column) => {
      const columnType = inferredTypes[column];
      const rawValue = row[column];

      if (isMissingValue(rawValue)) {
        staged[column] = null;
        return;
      }

      if (columnType === "numeric") {
        const parsed = parseNumber(rawValue);
        if (parsed === null) {
          rowInvalid = true;
        } else {
          staged[column] = parsed;
        }
        return;
      }

      if (columnType === "date") {
        const parsed = parseDate(rawValue);
        if (!parsed) {
          rowInvalid = true;
        } else {
          staged[column] = parsed;
        }
        return;
      }

      const asString = String(rawValue);
      const trimmed = asString.trim();
      if (trimmed !== asString) normalizedValues += 1;
      staged[column] = trimmed;
    });

    if (rowInvalid) {
      removedInvalidRows += 1;
      return;
    }

    stagedRows.push(staged);
  });

  // Build imputers from valid staged values.
  const numericImputers = new Map<string, number>();
  const categoricalImputers = new Map<string, string>();
  const dateImputers = new Map<string, string>();

  columns.forEach((column) => {
    const columnType = inferredTypes[column];
    if (columnType === "numeric") {
      const values = stagedRows
        .map((row) => row[column])
        .filter((value): value is number => typeof value === "number");
      numericImputers.set(column, median(values));
      return;
    }

    if (columnType === "date") {
      const values = stagedRows
        .map((row) => row[column])
        .filter((value): value is string => typeof value === "string");
      dateImputers.set(column, mode(values));
      return;
    }

    const values = stagedRows
      .map((row) => row[column])
      .filter((value): value is string => typeof value === "string");
    categoricalImputers.set(column, mode(values));
  });

  const imputedRows = stagedRows.map((row) => {
    const completed: DataRow = { ...row };
    columns.forEach((column) => {
      if (!isMissingValue(completed[column])) return;
      const type = inferredTypes[column];
      if (type === "numeric") {
        completed[column] = numericImputers.get(column) ?? 0;
      } else if (type === "date") {
        completed[column] = dateImputers.get(column) ?? "1970-01-01";
      } else {
        completed[column] = categoricalImputers.get(column) ?? "Unspecified";
      }
      imputedValues += 1;
    });
    return completed;
  });

  const seen = new Set<string>();
  const deduplicatedRows = imputedRows.filter((row) => {
    const signature = JSON.stringify(row);
    if (seen.has(signature)) return false;
    seen.add(signature);
    return true;
  });
  const removedDuplicates = imputedRows.length - deduplicatedRows.length;

  if (imputedValues > 0) report.push(`Handled ${imputedValues} missing values through imputation.`);
  if (removedDuplicates > 0) report.push(`Removed ${removedDuplicates} duplicate records.`);
  if (normalizedValues > 0) report.push(`Corrected ${normalizedValues} inconsistent text formats.`);
  if (removedInvalidRows > 0) report.push(`Filtered ${removedInvalidRows} invalid or corrupted records.`);
  report.push("Validated column data types (numeric, categorical, date) and standardized values.");

  if (report.length === 1) {
    report.unshift("Dataset passed cleaning checks with no major issues.");
  }

  return {
    cleanedData: deduplicatedRows,
    report,
    removedInvalidRows,
    removedDuplicates,
    imputedValues,
    normalizedValues,
  };
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
    const raw = await response.text();
    let message = "Failed to generate analytics.";

    try {
      const parsed = JSON.parse(raw);
      if (parsed?.error) {
        message = String(parsed.error);
      }
    } catch {
      // If backend returned HTML (e.g., fallback 500 page), keep user message clean.
      if (raw && !raw.trim().startsWith("<")) {
        message = raw;
      }
    }

    throw new Error(message);
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

  const inferredTypes = inferColumnTypes(data, columns);
  const seenRows = new Set<string>();
  let uncleanRowCount = 0;

  data.forEach((row) => {
    let isUnclean = false;

    const signature = JSON.stringify(row);
    if (seenRows.has(signature)) {
      isUnclean = true;
    } else {
      seenRows.add(signature);
    }

    columns.forEach((col) => {
      if (isUnclean) return;
      const value = row[col];
      if (value === null || value === undefined || value === '') {
        isUnclean = true;
        return;
      }

      const inferredType = inferredTypes[col];
      if (inferredType === 'numeric' && parseNumber(value) === null) {
        isUnclean = true;
      }
      if (inferredType === 'date' && parseDate(value) === null) {
        isUnclean = true;
      }
    });

    if (isUnclean) uncleanRowCount += 1;
  });

  const uncleanRatio = rowCount > 0 ? uncleanRowCount / rowCount : 0;

  checks.push({
    name: 'Data Cleanliness',
    status: uncleanRatio < 0.05 ? 'pass' : uncleanRatio < 0.2 ? 'warning' : 'fail',
    message: `${(uncleanRatio * 100).toFixed(1)}% unclean data (${uncleanRowCount}/${rowCount} rows require cleaning).`
  });

  checks.push({
    name: 'Completeness',
    status: missingRatio < 0.05 ? 'pass' : missingRatio < 0.2 ? 'warning' : 'fail',
    message: `${(missingRatio * 100).toFixed(1)}% missing data.`
  });

  const typeInconsistencyRatio = columns.length
    ? columns.reduce((sum, col) => {
        const values = data.map((row) => row[col]).filter((v) => v !== null && v !== undefined && v !== '');
        if (values.length === 0) return sum;
        const numeric = values.filter((v) => parseNumber(v) !== null).length;
        const date = values.filter((v) => parseDate(v) !== null).length;
        const dominant = Math.max(numeric, date, values.length - Math.max(numeric, date));
        return sum + (1 - dominant / values.length);
      }, 0) / columns.length
    : 0;

  checks.push({
    name: 'Type Consistency',
    status: typeInconsistencyRatio < 0.1 ? 'pass' : typeInconsistencyRatio < 0.25 ? 'warning' : 'fail',
    message: `${(typeInconsistencyRatio * 100).toFixed(1)}% inferred type inconsistency.`
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
