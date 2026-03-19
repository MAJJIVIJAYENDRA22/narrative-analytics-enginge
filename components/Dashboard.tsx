import React, { useMemo, useRef, useState } from 'react';
import {
  Bar,
  BarChart,
  Brush,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ArrowDownWideNarrow,
  ArrowUpWideNarrow,
  Download,
  FileDown,
  Filter,
  ImageDown,
  RefreshCcw,
  Table,
  TrendingUp,
} from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { AnalysisSummary, DataRow } from '../types';

interface DashboardProps {
  analysis: AnalysisSummary;
  onReset: () => void;
  data: DataRow[];
  fileName?: string;
}

type SortDirection = 'asc' | 'desc';

type ChartType = 'bar' | 'line' | 'pie';

type MetricType = 'number' | 'currency';

const COLORS = ['#0F172A', '#0E7490', '#1D4ED8', '#B45309', '#BE123C', '#4C1D95'];

const PANEL = 'rounded-2xl border border-slate-200 bg-white shadow-sm';
const SUBTLE = 'text-sm font-medium text-slate-500';

const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '');

const parseNumeric = (value: unknown): number => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string') {
    const parsed = Number(value.replace(/[$,%\s,]/g, ''));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const isLikelyDate = (value: unknown): boolean => {
  if (typeof value !== 'string' && typeof value !== 'number') return false;
  const d = new Date(value);
  return !Number.isNaN(d.getTime());
};

const toMonthLabel = (value: unknown): string | null => {
  if (!value) return null;
  const d = new Date(value as string);
  if (!Number.isNaN(d.getTime())) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }
  if (typeof value === 'string') {
    const text = value.trim();
    if (/^\d{4}-\d{2}$/.test(text)) return text;
    if (/^\d{4}$/.test(text)) return `${text}-01`;
  }
  return null;
};

const toCSVCell = (value: unknown): string => {
  const text = String(value ?? '');
  if (/[,"\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
};

const metricFormatter = (type: MetricType, value: number): string => {
  if (type === 'currency') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value);
  }
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 2,
  }).format(value);
};

const downloadBlob = (content: string, fileName: string, mime: string) => {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const inferMetricType = (column?: string): MetricType => {
  if (!column) return 'number';
  const candidate = normalize(column);
  if (candidate.includes('revenue') || candidate.includes('sales') || candidate.includes('profit') || candidate.includes('cost') || candidate.includes('amount') || candidate.includes('price')) {
    return 'currency';
  }
  return 'number';
};

export const Dashboard: React.FC<DashboardProps> = ({ analysis, onReset, data, fileName = 'report' }) => {
  const reportRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isExportingChart, setIsExportingChart] = useState(false);

  const [globalFilter, setGlobalFilter] = useState('all');
  const [drillValue, setDrillValue] = useState<string | null>(null);
  const [sortColumn, setSortColumn] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const columns = useMemo(() => (data.length ? Object.keys(data[0]) : []), [data]);

  const columnProfile = useMemo(() => {
    const sample = data.slice(0, 300);

    const numericColumns = columns.filter((col) => {
      if (!sample.length) return false;
      const numericCount = sample.filter((row) => {
        const value = row[col];
        if (value === null || value === undefined || value === '') return false;
        return Number.isFinite(parseNumeric(value));
      }).length;
      return numericCount / sample.length >= 0.6;
    });

    const categoricalColumns = columns.filter((col) => !numericColumns.includes(col));

    const dateColumn = columns.find((col) => {
      const normalized = normalize(col);
      if (normalized.includes('date') || normalized.includes('time') || normalized.includes('month') || normalized.includes('year')) {
        return true;
      }
      const values = sample.map((row) => row[col]).filter(Boolean);
      if (values.length < 5) return false;
      const dateLike = values.filter((v) => isLikelyDate(v)).length;
      return dateLike / values.length >= 0.7;
    });

    const keywordMatch = (keywords: string[]) => {
      const normalizedKeywords = keywords.map(normalize);
      return columns.find((col) => normalizedKeywords.some((kw) => normalize(col).includes(kw)));
    };

    return {
      numericColumns,
      categoricalColumns,
      dateColumn,
      defaultDimension:
        dateColumn ?? keywordMatch(['category', 'region', 'segment', 'product']) ?? categoricalColumns[0] ?? columns[0] ?? '',
      defaultMetric:
        keywordMatch(['revenue', 'sales', 'profit', 'amount', 'value']) ?? numericColumns[0] ?? '',
      defaultSecondaryMetric: numericColumns[1] ?? '',
    };
  }, [columns, data]);

  const [selectedDimension, setSelectedDimension] = useState<string>('');
  const [selectedMetric, setSelectedMetric] = useState<string>('');
  const [selectedSecondaryMetric, setSelectedSecondaryMetric] = useState<string>('');

  React.useEffect(() => {
    if (!selectedDimension && columnProfile.defaultDimension) setSelectedDimension(columnProfile.defaultDimension);
    if (!selectedMetric && columnProfile.defaultMetric) setSelectedMetric(columnProfile.defaultMetric);
    if (!selectedSecondaryMetric && columnProfile.defaultSecondaryMetric) setSelectedSecondaryMetric(columnProfile.defaultSecondaryMetric);
  }, [columnProfile, selectedDimension, selectedMetric, selectedSecondaryMetric]);

  const dimensionValues = useMemo(() => {
    if (!selectedDimension) return [] as string[];
    const values = new Set<string>();
    data.forEach((row) => {
      const raw = row[selectedDimension];
      if (raw !== null && raw !== undefined && raw !== '') {
        values.add(String(raw));
      }
    });
    return Array.from(values).sort();
  }, [data, selectedDimension]);

  const baseRows = useMemo(() => {
    let rows = data;
    if (globalFilter !== 'all' && selectedDimension) {
      rows = rows.filter((row) => String(row[selectedDimension] ?? '') === globalFilter);
    }
    if (drillValue && selectedDimension) {
      rows = rows.filter((row) => String(row[selectedDimension] ?? '') === drillValue);
    }
    return rows;
  }, [data, drillValue, globalFilter, selectedDimension]);

  const selectedChartType = useMemo<ChartType>(() => {
    if (!selectedDimension || !selectedMetric) return 'bar';
    const isTimeDimension = selectedDimension === columnProfile.dateColumn;
    const distinctCount = new Set(baseRows.map((row) => String(row[selectedDimension] ?? 'Unknown'))).size;
    if (isTimeDimension) return 'line';
    if (distinctCount > 0 && distinctCount <= 6) return 'pie';
    return 'bar';
  }, [baseRows, columnProfile.dateColumn, selectedDimension, selectedMetric]);

  const metricType = inferMetricType(selectedMetric);

  const chartData = useMemo(() => {
    if (!selectedDimension || !selectedMetric) return [] as Array<Record<string, unknown>>;

    const aggregation = new Map<string, { primary: number; secondary: number }>();

    baseRows.forEach((row) => {
      const rawDimension = row[selectedDimension];
      let key = String(rawDimension ?? 'Unknown');

      if (selectedDimension === columnProfile.dateColumn) {
        key = toMonthLabel(rawDimension) ?? key;
      }

      const bucket = aggregation.get(key) ?? { primary: 0, secondary: 0 };
      bucket.primary += parseNumeric(row[selectedMetric]);
      if (selectedSecondaryMetric) {
        bucket.secondary += parseNumeric(row[selectedSecondaryMetric]);
      }
      aggregation.set(key, bucket);
    });

    const rows = Array.from(aggregation.entries()).map(([label, values]) => ({
      label,
      primary: values.primary,
      secondary: values.secondary,
    }));

    if (selectedDimension === columnProfile.dateColumn) {
      return rows.sort((a, b) => String(a.label).localeCompare(String(b.label)));
    }

    return rows.sort((a, b) => Number(b.primary) - Number(a.primary)).slice(0, 25);
  }, [
    baseRows,
    columnProfile.dateColumn,
    selectedDimension,
    selectedMetric,
    selectedSecondaryMetric,
  ]);

  const datasetOverview = useMemo(() => {
    const rowCount = data.length;
    const colCount = columns.length;
    const missing = data.reduce((sum, row) => {
      return sum + Object.values(row).filter((v) => v === null || v === undefined || v === '').length;
    }, 0);
    const denominator = Math.max(1, rowCount * Math.max(1, colCount));
    const completeness = ((denominator - missing) / denominator) * 100;

    return { rowCount, colCount, missing, completeness };
  }, [columns.length, data]);

  const sortedTableRows = useMemo(() => {
    if (!baseRows.length) return [] as DataRow[];
    const activeSort = sortColumn || selectedMetric || columns[0] || '';
    if (!activeSort) return baseRows.slice(0, 50);

    const copy = [...baseRows];
    copy.sort((a, b) => {
      const av = a[activeSort];
      const bv = b[activeSort];
      const an = parseNumeric(av);
      const bn = parseNumeric(bv);
      const bothNumeric = Number.isFinite(an) && Number.isFinite(bn) && (typeof av === 'number' || typeof av === 'string') && (typeof bv === 'number' || typeof bv === 'string');

      let result = 0;
      if (bothNumeric && (String(av).trim() !== '' || String(bv).trim() !== '')) {
        result = an - bn;
      } else {
        result = String(av ?? '').localeCompare(String(bv ?? ''));
      }
      return sortDirection === 'asc' ? result : -result;
    });

    return copy.slice(0, 100);
  }, [baseRows, columns, selectedMetric, sortColumn, sortDirection]);

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortColumn(column);
    setSortDirection('desc');
  };

  const exportCleanedDataset = () => {
    if (!data.length) return;
    const headers = columns;
    const rows = data.map((row) => headers.map((h) => toCSVCell(row[h])).join(','));
    downloadBlob([headers.join(','), ...rows].join('\n'), 'cleaned_analytics_dataset.csv', 'text/csv;charset=utf-8;');
  };

  const exportChartImage = async () => {
    if (!chartRef.current || isExportingChart) return;
    setIsExportingChart(true);
    try {
      const canvas = await html2canvas(chartRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
      });
      const image = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = image;
      link.download = `${fileName.replace(/[^a-z0-9_-]/gi, '_')}_chart.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Chart export failed', err);
      alert('Chart export failed. Please try again.');
    } finally {
      setIsExportingChart(false);
    }
  };

  const exportReportPDF = async () => {
    if (!reportRef.current || isGeneratingPDF) return;
    setIsGeneratingPDF(true);
    try {
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#f8fafc',
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const renderWidth = imgWidth * ratio;
      const renderHeight = imgHeight * ratio;
      const x = (pdfWidth - renderWidth) / 2;

      let y = 0;
      let remaining = renderHeight;

      pdf.addImage(imgData, 'PNG', x, y, renderWidth, renderHeight);
      remaining -= pdfHeight;

      while (remaining > 0) {
        y = remaining - renderHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', x, y, renderWidth, renderHeight);
        remaining -= pdfHeight;
      }

      pdf.save(`${fileName.replace(/[^a-z0-9_-]/gi, '_')}_insights_report.pdf`);
    } catch (err) {
      console.error('PDF export failed', err);
      alert('PDF export failed. Please try again.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const chartTitle = useMemo(() => {
    if (!selectedDimension || !selectedMetric) return 'Interactive Chart';
    return `${selectedMetric} by ${selectedDimension}`;
  }, [selectedDimension, selectedMetric]);

  const chartLegend = useMemo(() => {
    if (!selectedSecondaryMetric) return [selectedMetric].filter(Boolean);
    return [selectedMetric, selectedSecondaryMetric].filter(Boolean);
  }, [selectedMetric, selectedSecondaryMetric]);

  return (
    <div className="-mx-6 bg-slate-50 px-6 py-8">
      <div ref={reportRef} className="mx-auto max-w-7xl space-y-8">
        <section className={`${PANEL} p-6`}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Analytics Dashboard</h2>
              <p className={SUBTLE}>Interactive, readable visuals with auto-selected chart types and drill-down analysis.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={exportChartImage}
                disabled={isExportingChart}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <ImageDown className="h-4 w-4" />
                {isExportingChart ? 'Exporting...' : 'Chart Image'}
              </button>
              <button
                onClick={exportReportPDF}
                disabled={isGeneratingPDF}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <FileDown className="h-4 w-4" />
                {isGeneratingPDF ? 'Generating...' : 'Report PDF'}
              </button>
              <button
                onClick={onReset}
                className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800"
              >
                <RefreshCcw className="h-4 w-4" />
                New Analysis
              </button>
            </div>
          </div>
        </section>

        <section className={`${PANEL} p-6`}>
          <h3 className="mb-4 text-lg font-bold text-slate-900">Dataset Overview</h3>
          <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Rows</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">{datasetOverview.rowCount.toLocaleString()}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Columns</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">{datasetOverview.colCount.toLocaleString()}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Missing Values</p>
              <p className="mt-2 text-2xl font-bold text-amber-700">{datasetOverview.missing.toLocaleString()}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Completeness</p>
              <p className="mt-2 text-2xl font-bold text-emerald-700">{datasetOverview.completeness.toFixed(1)}%</p>
            </div>
          </div>

          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700">
              <Filter className="h-3.5 w-3.5" />
              Global Filter
            </span>
            <select
              value={globalFilter}
              onChange={(e) => {
                setGlobalFilter(e.target.value);
                setDrillValue(null);
              }}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
            >
              <option value="all">All Values</option>
              {dimensionValues.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
            {drillValue && (
              <button
                onClick={() => setDrillValue(null)}
                className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800"
              >
                Clear Drill-down: {drillValue}
              </button>
            )}
          </div>

          <div className="overflow-auto rounded-xl border border-slate-200">
            <table className="min-w-full border-collapse text-sm">
              <thead className="bg-slate-100 text-left text-xs uppercase tracking-wide text-slate-600">
                <tr>
                  {columns.slice(0, 10).map((col) => (
                    <th key={col} className="px-4 py-3 font-semibold">
                      <button onClick={() => handleSort(col)} className="inline-flex items-center gap-1 hover:text-slate-900">
                        {col}
                        {sortColumn === col ? (
                          sortDirection === 'asc' ? <ArrowUpWideNarrow className="h-3.5 w-3.5" /> : <ArrowDownWideNarrow className="h-3.5 w-3.5" />
                        ) : null}
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedTableRows.slice(0, 10).map((row, idx) => (
                  <tr key={idx} className="border-t border-slate-100 hover:bg-slate-50">
                    {columns.slice(0, 10).map((col) => (
                      <td key={col} className="max-w-[220px] truncate px-4 py-2 text-slate-700" title={String(row[col] ?? '')}>
                        {String(row[col] ?? '')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-slate-500">Table supports sorting and reflects active filters/drill-down. Showing up to 10 rows.</p>
        </section>

        <section className={`${PANEL} p-6`}>
          <h3 className="mb-2 text-lg font-bold text-slate-900">Descriptive Insights (Charts)</h3>
          <p className={`${SUBTLE} mb-5`}>Chart type is selected automatically: line for time trends, pie for compact proportions, and bar for comparisons.</p>

          <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Dimension</label>
              <select
                value={selectedDimension}
                onChange={(e) => {
                  setSelectedDimension(e.target.value);
                  setGlobalFilter('all');
                  setDrillValue(null);
                }}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
              >
                {columns.map((col) => (
                  <option key={col} value={col}>
                    {col}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Primary Metric</label>
              <select
                value={selectedMetric}
                onChange={(e) => setSelectedMetric(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
              >
                {columnProfile.numericColumns.map((col) => (
                  <option key={col} value={col}>
                    {col}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Secondary Metric (Optional)</label>
              <select
                value={selectedSecondaryMetric}
                onChange={(e) => setSelectedSecondaryMetric(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
              >
                <option value="">None</option>
                {columnProfile.numericColumns.filter((col) => col !== selectedMetric).map((col) => (
                  <option key={col} value={col}>
                    {col}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div ref={chartRef} className="rounded-xl border border-slate-200 p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h4 className="text-base font-bold text-slate-900">{chartTitle}</h4>
                <p className="text-xs text-slate-500">Type: {selectedChartType.toUpperCase()} | Click a data point to drill down.</p>
              </div>
              <div className="text-xs font-medium text-slate-600">Legend: {chartLegend.join(' | ') || 'Primary metric'}</div>
            </div>

            <div className="h-[380px] w-full">
              {chartData.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-slate-400">No chart data available for current selection.</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  {selectedChartType === 'line' ? (
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis dataKey="label" tick={{ fill: '#64748B', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: '#64748B', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => metricFormatter(metricType, Number(v))} />
                      <Tooltip formatter={(value: number) => metricFormatter(metricType, Number(value))} />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="primary"
                        name={selectedMetric || 'Primary'}
                        stroke={COLORS[0]}
                        strokeWidth={3}
                        dot
                        onClick={(e: any) => setDrillValue(String(e?.payload?.label ?? ''))}
                      />
                      {selectedSecondaryMetric && (
                        <Line
                          type="monotone"
                          dataKey="secondary"
                          name={selectedSecondaryMetric}
                          stroke={COLORS[1]}
                          strokeWidth={2}
                          dot
                          onClick={(e: any) => setDrillValue(String(e?.payload?.label ?? ''))}
                        />
                      )}
                      <Brush dataKey="label" height={22} stroke="#0F172A" />
                    </LineChart>
                  ) : selectedChartType === 'pie' ? (
                    <PieChart>
                      <Pie
                        data={chartData}
                        dataKey="primary"
                        nameKey="label"
                        outerRadius={120}
                        label={({ name, percent }) => `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`}
                        onClick={(entry: any) => setDrillValue(String(entry?.label ?? ''))}
                      >
                        {chartData.map((_, i) => (
                          <Cell key={`slice-${i}`} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => metricFormatter(metricType, Number(value))} />
                      <Legend />
                    </PieChart>
                  ) : (
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis dataKey="label" tick={{ fill: '#64748B', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: '#64748B', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => metricFormatter(metricType, Number(v))} />
                      <Tooltip formatter={(value: number) => metricFormatter(metricType, Number(value))} />
                      <Legend />
                      <Bar
                        dataKey="primary"
                        name={selectedMetric || 'Primary'}
                        fill={COLORS[0]}
                        onClick={(entry: any) => setDrillValue(String(entry?.label ?? ''))}
                      />
                      {selectedSecondaryMetric && <Bar dataKey="secondary" name={selectedSecondaryMetric} fill={COLORS[1]} />}
                      <Brush dataKey="label" height={22} stroke="#0F172A" />
                    </BarChart>
                  )}
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </section>

        <section className={`${PANEL} p-6`}>
          <h3 className="mb-2 text-lg font-bold text-slate-900">Predictive Insights</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Model Confidence</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">{(analysis.predictive.confidence * 100).toFixed(1)}%</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4 md:col-span-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Forecast Narrative</p>
              <p className="mt-2 text-sm leading-6 text-slate-700">{analysis.predictive.narrative}</p>
            </div>
          </div>

          <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="mb-2 flex items-center gap-2 text-slate-700">
              <TrendingUp className="h-4 w-4" />
              <p className="text-sm font-semibold">Model Explanation</p>
            </div>
            <p className="text-sm leading-6 text-slate-600">{analysis.predictive.modelExplanation}</p>
          </div>
        </section>

        <section className={`${PANEL} p-6`}>
          <h3 className="mb-4 text-lg font-bold text-slate-900">Download Section</h3>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <button
              onClick={exportChartImage}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              <ImageDown className="h-4 w-4" />
              Download Chart Image
            </button>
            <button
              onClick={exportReportPDF}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              <FileDown className="h-4 w-4" />
              Download PDF Report
            </button>
            <button
              onClick={exportCleanedDataset}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              <Download className="h-4 w-4" />
              Download Cleaned Dataset
            </button>
          </div>
        </section>

        <section className={`${PANEL} p-6`}>
          <h3 className="mb-3 text-lg font-bold text-slate-900">Additional Diagnostic Summary</h3>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-slate-200 p-4">
              <h4 className="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
                <Table className="h-4 w-4" />
                Diagnostic Narrative
              </h4>
              <p className="text-sm leading-6 text-slate-600">{analysis.diagnostic.narrative}</p>
            </div>
            <div className="rounded-xl border border-slate-200 p-4">
              <h4 className="mb-2 text-sm font-semibold text-slate-700">Correlations</h4>
              <div className="space-y-2">
                {analysis.diagnostic.correlations.slice(0, 5).map((corr, idx) => (
                  <div key={`${corr.factor}-${idx}`} className="rounded-lg bg-slate-50 p-3">
                    <p className="text-sm font-semibold text-slate-800">{corr.factor}</p>
                    <p className="text-xs text-slate-600">{corr.relationship} ({(corr.strength * 100).toFixed(0)}%)</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
