
import React, { useMemo, useRef, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, LineChart, Line, LabelList,
  PieChart, Pie, Cell, Legend, ScatterChart, Scatter
} from 'recharts';
import { AnalysisSummary, ChartMeta, DataRow } from '../types';
import { 
  TrendingUp, Activity, BarChart2, Lightbulb, 
  ShieldCheck, AlertCircle, ArrowUpRight, ArrowDownRight,
  Layout as LayoutIcon, Maximize2, Filter, Share2, Download, FileDown, Loader2
} from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface DashboardProps {
  analysis: AnalysisSummary;
  onReset: () => void;
  data: DataRow[];
  fileName?: string;
}

export const Dashboard: React.FC<DashboardProps> = ({ analysis, onReset, data, fileName = 'report' }) => {
  console.log('Dashboard rendering with analysis:', analysis);
  
  const visualizationsRef = useRef<HTMLDivElement>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  
  const executive = analysis.executive ?? {
    kpis: [],
    profitLoss: [],
    revenueExpenses: [],
    salesByCategory: [],
    regionalPerformance: [],
    topProducts: [],
  };

  const [selectedDate, setSelectedDate] = useState<string>('All');
  const [selectedRegion, setSelectedRegion] = useState<string>('All');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedSegment, setSelectedSegment] = useState<string>('All');

  const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '');
  const parseNumeric = (value: any): number => {
    if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
    if (typeof value === 'string') {
      const cleaned = value.replace(/[$,%\s,]/g, '');
      const parsed = Number(cleaned);
      return Number.isFinite(parsed) ? parsed : 0;
    }
    return 0;
  };
  const toMonthLabel = (value: any): string | null => {
    if (!value) return null;
    const d = new Date(value);
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
  const buildBucketSeries = (rows: DataRow[], buckets = 6) => {
    if (rows.length === 0) return [] as string[];
    const bucketCount = Math.min(buckets, rows.length);
    return rows.map((_, i) => `P${Math.floor((i * bucketCount) / rows.length) + 1}`);
  };

  const detectedColumns = useMemo(() => {
    const columns = data.length ? Object.keys(data[0]) : [];
    const findByKeywords = (keywords: string[]) => {
      const normalizedKeywords = keywords.map(normalize);
      return columns.find((col) => {
        const candidate = normalize(col);
        return normalizedKeywords.some((kw) => candidate.includes(kw));
      });
    };

    const numericColumns = columns
      .map((col) => {
        const sample = data.slice(0, 200);
        if (sample.length === 0) return { col, ratio: 0 };
        const valid = sample.filter((row) => {
          const raw = row[col];
          if (raw === null || raw === undefined || raw === '') return false;
          return Number.isFinite(parseNumeric(raw));
        }).length;
        return { col, ratio: valid / sample.length };
      })
      .filter((entry) => entry.ratio >= 0.6)
      .map((entry) => entry.col);

    const revenue = findByKeywords(['revenue', 'sales', 'income', 'turnover']) ?? numericColumns[0];
    const profit = findByKeywords(['profit', 'margin', 'netincome']) ?? numericColumns[1] ?? numericColumns[0];
    const orders = findByKeywords(['orders', 'order', 'quantity', 'qty', 'units', 'transactions']) ?? numericColumns[2];
    const discount = findByKeywords(['discount', 'disc', 'promotion', 'coupon']) ?? numericColumns.find((col) => col !== revenue && col !== profit);

    return {
      date: findByKeywords(['date', 'month', 'year', 'period', 'time']),
      region: findByKeywords(['region', 'country', 'state', 'city', 'territory']),
      category: findByKeywords(['category', 'department', 'class', 'type']),
      segment: findByKeywords(['segment', 'customersegment', 'tier', 'customertype']),
      product: findByKeywords(['product', 'item', 'sku', 'model', 'name']),
      revenue,
      profit,
      orders,
      discount,
    };
  }, [data]);

  const filterOptions = useMemo(() => {
    const dateOptionsSet = new Set<string>();
    const regionOptionsSet = new Set<string>();
    const categoryOptionsSet = new Set<string>();
    const segmentOptionsSet = new Set<string>();

    data.forEach((row) => {
      const d = detectedColumns.date ? toMonthLabel(row[detectedColumns.date]) : null;
      if (d) dateOptionsSet.add(d);
      if (detectedColumns.region && row[detectedColumns.region]) regionOptionsSet.add(String(row[detectedColumns.region]));
      if (detectedColumns.category && row[detectedColumns.category]) categoryOptionsSet.add(String(row[detectedColumns.category]));
      if (detectedColumns.segment && row[detectedColumns.segment]) segmentOptionsSet.add(String(row[detectedColumns.segment]));
    });

    return {
      dates: Array.from(dateOptionsSet).sort(),
      regions: Array.from(regionOptionsSet).sort(),
      categories: Array.from(categoryOptionsSet).sort(),
      segments: Array.from(segmentOptionsSet).sort(),
    };
  }, [data, detectedColumns]);

  const filteredRows = useMemo(() => {
    return data.filter((row) => {
      const rowDate = detectedColumns.date ? toMonthLabel(row[detectedColumns.date]) : null;
      const rowRegion = detectedColumns.region ? String(row[detectedColumns.region] ?? '') : '';
      const rowCategory = detectedColumns.category ? String(row[detectedColumns.category] ?? '') : '';
      const rowSegment = detectedColumns.segment ? String(row[detectedColumns.segment] ?? '') : '';

      if (selectedDate !== 'All' && rowDate !== selectedDate) return false;
      if (selectedRegion !== 'All' && rowRegion !== selectedRegion) return false;
      if (selectedCategory !== 'All' && rowCategory !== selectedCategory) return false;
      if (selectedSegment !== 'All' && rowSegment !== selectedSegment) return false;
      return true;
    });
  }, [
    data,
    detectedColumns,
    selectedDate,
    selectedRegion,
    selectedCategory,
    selectedSegment,
  ]);

  const executiveData = useMemo(() => {
    const revenueKey = detectedColumns.revenue;
    const profitKey = detectedColumns.profit;
    const ordersKey = detectedColumns.orders;
    const categoryKey = detectedColumns.category;
    const regionKey = detectedColumns.region;
    const productKey = detectedColumns.product;
    const segmentKey = detectedColumns.segment;
    const discountKey = detectedColumns.discount;

    const monthlyMap = new Map<string, number>();
    const categoryMap = new Map<string, { sales: number; profit: number }>();
    const regionMap = new Map<string, number>();
    const productMap = new Map<string, number>();
    const segmentMap = new Map<string, number>();
    const discountImpact: Array<{ discount: number; profit: number }> = [];

    const fallbackPeriods = buildBucketSeries(filteredRows);

    let totalRevenue = 0;
    let totalProfit = 0;
    let totalOrders = 0;

    filteredRows.forEach((row, idx) => {
      const revenue = revenueKey ? parseNumeric(row[revenueKey]) : 0;
      const profit = profitKey ? parseNumeric(row[profitKey]) : revenue * 0.2;
      const orders = ordersKey ? parseNumeric(row[ordersKey]) : 1;
      const monthLabel = detectedColumns.date
        ? toMonthLabel(row[detectedColumns.date]) ?? fallbackPeriods[idx]
        : fallbackPeriods[idx];

      totalRevenue += revenue;
      totalProfit += profit;
      totalOrders += orders;

      monthlyMap.set(monthLabel, (monthlyMap.get(monthLabel) ?? 0) + revenue);

      const category = categoryKey ? String(row[categoryKey] ?? 'Unknown') : 'Unknown';
      const catAgg = categoryMap.get(category) ?? { sales: 0, profit: 0 };
      catAgg.sales += revenue;
      catAgg.profit += profit;
      categoryMap.set(category, catAgg);

      const region = regionKey ? String(row[regionKey] ?? 'Unknown') : 'Unknown';
      regionMap.set(region, (regionMap.get(region) ?? 0) + revenue);

      const product = productKey ? String(row[productKey] ?? 'Unknown') : `Product ${idx + 1}`;
      productMap.set(product, (productMap.get(product) ?? 0) + revenue);

      const segment = segmentKey ? String(row[segmentKey] ?? 'Unknown') : 'All Customers';
      segmentMap.set(segment, (segmentMap.get(segment) ?? 0) + 1);

      if (discountKey) {
        const discount = parseNumeric(row[discountKey]);
        if (Number.isFinite(discount) && Number.isFinite(profit)) {
          discountImpact.push({ discount, profit });
        }
      }
    });

    const monthlyRevenue = Array.from(monthlyMap.entries())
      .map(([month, revenue]) => ({ month, revenue }))
      .sort((a, b) => a.month.localeCompare(b.month));

    const previous = monthlyRevenue.length > 1 ? monthlyRevenue[monthlyRevenue.length - 2].revenue : 0;
    const latest = monthlyRevenue.length > 0 ? monthlyRevenue[monthlyRevenue.length - 1].revenue : 0;
    const growthRate = previous > 0 ? ((latest - previous) / previous) * 100 : 0;

    const categoryPerformance = Array.from(categoryMap.entries())
      .map(([category, values]) => ({ category, sales: values.sales, profit: values.profit }))
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 10);

    const regionalPerformance = Array.from(regionMap.entries())
      .map(([region, sales]) => ({ region, sales }))
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 10);

    const topProducts = Array.from(productMap.entries())
      .map(([product, sales]) => ({ product, sales }))
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 10);

    const customerSegments = Array.from(segmentMap.entries())
      .map(([segment, count]) => ({ segment, count }))
      .sort((a, b) => b.count - a.count);

    return {
      totalRevenue,
      totalProfit,
      totalOrders,
      growthRate,
      monthlyRevenue,
      categoryPerformance,
      regionalPerformance,
      topProducts,
      customerSegments,
      discountImpact: discountImpact.slice(0, 500),
    };
  }, [filteredRows, detectedColumns]);

  const downloadCleanedCSV = () => {
    if (!data || data.length === 0) return;
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(row => Object.values(row).join(','));
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "narrative_cleaned_data.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadPDF = async () => {
    if (!visualizationsRef.current || isGeneratingPDF) return;
    
    setIsGeneratingPDF(true);
    
    try {
      const element = visualizationsRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#f8fafc'
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      
      let heightLeft = imgHeight * ratio;
      let position = 0;
      
      pdf.addImage(imgData, 'PNG', imgX, position, imgWidth * ratio, imgHeight * ratio);
      heightLeft -= pdfHeight;
      
      while (heightLeft > 0) {
        position = heightLeft - imgHeight * ratio;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', imgX, position, imgWidth * ratio, imgHeight * ratio);
        heightLeft -= pdfHeight;
      }
      
      const sanitizedFileName = fileName.replace(/[^a-z0-9_-]/gi, '_');
      pdf.save(`${sanitizedFileName}_overview_report.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const SectionHeader = ({ icon: Icon, title, subtitle }: { icon: any, title: string, subtitle: string }) => (
    <div className="flex items-start gap-4 mb-8">
      <div className="p-3 bg-slate-900 rounded-xl">
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div>
        <h3 className="text-2xl font-bold text-slate-900 leading-none mb-1">{title}</h3>
        <p className="text-slate-500 text-sm font-medium">{subtitle}</p>
      </div>
    </div>
  );

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      maximumFractionDigits: 0,
    }).format(value);
  };

  // ---------------------------------------------------------------------------
  // DynamicChart — selects the right Recharts component based on chartMeta.type
  // ---------------------------------------------------------------------------
  const PIE_COLORS = ['#0f172a', '#14b8a6', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
  const BAR_COLORS = ['#0f172a', '#14b8a6', '#3b82f6'];
  const LINE_COLORS = ['#0f172a', '#64748b', '#14b8a6'];
  const axisStyle = { fill: '#94a3b8', fontSize: 11, fontWeight: 600 } as const;
  const gridProps = { strokeDasharray: '3 3', stroke: '#f1f5f9' } as const;

  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  const DynamicChart = ({
    data,
    meta,
    height = 320,
    emptyMessage = 'No data available.',
  }: {
    data: any[];
    meta: ChartMeta;
    height?: number;
    emptyMessage?: string;
  }) => {
    if (!data || data.length === 0) {
      return (
        <div className="flex items-center justify-center h-full text-sm text-slate-400">
          {emptyMessage}
        </div>
      );
    }
    const fmtValue = meta.valueType === 'currency' ? formatCurrency : formatNumber;
    const tickFmt = (v: number) => fmtValue(v);

    if (meta.type === 'pie') {
      return (
        <ResponsiveContainer width="100%" height={height}>
          <PieChart>
            <Pie
              data={data}
              dataKey={meta.yKeys[0]}
              nameKey={meta.xKey}
              cx="50%"
              cy="45%"
              outerRadius={Math.min(height / 2 - 40, 120)}
              label={({ name, percent }) =>
                `${String(name).length > 12 ? String(name).slice(0, 12) + '…' : name} ${
                  (percent * 100).toFixed(0)
                }%`
              }
              labelLine={false}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(v: number) => fmtValue(v)} />
            <Legend wrapperStyle={{ fontSize: 11, fontWeight: 600, color: '#94a3b8' }} />
          </PieChart>
        </ResponsiveContainer>
      );
    }

    if (meta.type === 'bar_horizontal') {
      const maxLabelLen = Math.max(...data.map(d => String(d[meta.xKey] ?? '').length));
      const yAxisWidth = Math.min(Math.max(80, maxLabelLen * 7), 200);
      return (
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={data} layout="vertical" margin={{ left: 10 }}>
            <CartesianGrid {...gridProps} horizontal={false} />
            <XAxis type="number" axisLine={false} tickLine={false} tick={axisStyle} tickFormatter={tickFmt} />
            <YAxis type="category" dataKey={meta.xKey} axisLine={false} tickLine={false} width={yAxisWidth} tick={axisStyle} />
            <Tooltip formatter={(v: number) => fmtValue(v)} />
            {meta.yKeys.map((key, i) => (
              <Bar key={key} dataKey={key} name={capitalize(key)} fill={BAR_COLORS[i] ?? '#0f172a'} radius={[0, 4, 4, 0]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      );
    }

    if (meta.type === 'line') {
      return (
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={data}>
            <CartesianGrid {...gridProps} vertical={false} />
            <XAxis dataKey={meta.xKey} axisLine={false} tickLine={false} tick={axisStyle} />
            <YAxis axisLine={false} tickLine={false} tick={axisStyle} tickFormatter={tickFmt} />
            <Tooltip formatter={(v: number) => fmtValue(v)} />
            {meta.yKeys.map((key, i) => (
              <Line key={key} type="monotone" dataKey={key} name={capitalize(key)} stroke={LINE_COLORS[i] ?? '#0f172a'} strokeWidth={3} dot={false} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      );
    }

    // default: vertical bar
    return (
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data}>
          <CartesianGrid {...gridProps} vertical={false} />
          <XAxis dataKey={meta.xKey} axisLine={false} tickLine={false} tick={axisStyle} />
          <YAxis axisLine={false} tickLine={false} tick={axisStyle} tickFormatter={tickFmt} />
          <Tooltip formatter={(v: number) => fmtValue(v)} />
          {meta.yKeys.map((key, i) => (
            <Bar key={key} dataKey={key} name={capitalize(key)} fill={BAR_COLORS[i] ?? '#0f172a'} radius={[4, 4, 0, 0]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    );
  };

  // Dataset-driven fallback metadata: if backend metadata is missing, infer chart type from data shape.
  type ExecutiveChartKey = 'profitLoss' | 'revenueExpenses' | 'salesByCategory' | 'regionalPerformance' | 'topProducts';

  const BASE_CHART_META: Record<ExecutiveChartKey, Omit<ChartMeta, 'type'>> = {
    profitLoss:          { xKey: 'period',   yKeys: ['profit', 'loss'],      valueType: 'currency' },
    revenueExpenses:     { xKey: 'period',   yKeys: ['revenue', 'expenses'], valueType: 'currency' },
    salesByCategory:     { xKey: 'category', yKeys: ['sales'],               valueType: 'currency' },
    regionalPerformance: { xKey: 'region',   yKeys: ['sales', 'profit'],     valueType: 'currency' },
    topProducts:         { xKey: 'product',  yKeys: ['sales', 'profit'],     valueType: 'currency' },
  };

  const inferChartType = (
    chartKey: ExecutiveChartKey,
    rows: any[],
    yKeys: string[],
    xKey: string,
  ): ChartMeta['type'] => {
    const points = rows.length;
    const metrics = yKeys.length;
    const avgLabelLength = points > 0
      ? rows.reduce((sum, row) => sum + String(row?.[xKey] ?? '').length, 0) / points
      : 0;

    // Time-based trend: line for richer sequences, bar for short snapshots.
    if (chartKey === 'revenueExpenses') {
      return points > 6 ? 'line' : 'bar';
    }

    // Ranked lists with one metric: pie for compact part-to-whole, else horizontal bars.
    if (chartKey === 'salesByCategory' && metrics === 1) {
      return points > 0 && points <= 6 ? 'pie' : 'bar_horizontal';
    }

    // Product rankings and long labels are easier to scan horizontally.
    if (chartKey === 'topProducts' || points > 10 || avgLabelLength > 12) {
      return 'bar_horizontal';
    }

    return 'bar';
  };

  const resolveChartMeta = (chartKey: ExecutiveChartKey, rows: any[]): ChartMeta => {
    const backendMeta = executive.chartMeta?.[chartKey];
    if (backendMeta) {
      return backendMeta;
    }
    const base = BASE_CHART_META[chartKey];
    return {
      ...base,
      type: inferChartType(chartKey, rows, base.yKeys, base.xKey),
    };
  };

  const chartMeta = {
    profitLoss: resolveChartMeta('profitLoss', executive.profitLoss),
    revenueExpenses: resolveChartMeta('revenueExpenses', executive.revenueExpenses),
    salesByCategory: resolveChartMeta('salesByCategory', executive.salesByCategory),
    regionalPerformance: resolveChartMeta('regionalPerformance', executive.regionalPerformance),
    topProducts: resolveChartMeta('topProducts', executive.topProducts),
  };

  return (
    <div className="space-y-12 animate-in fade-in duration-700 bg-slate-50 -mx-6 px-6 py-12">
      {/* Visualizations Section for PDF Export */}
      <div ref={visualizationsRef}>
      {/* BI Command Center Header */}
      <div className="flex items-center justify-between mb-8 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <LayoutIcon className="w-5 h-5 text-slate-400" />
          <div>
            <h2 className="text-lg font-bold text-slate-800 tracking-tight uppercase">Executive BI Canvas</h2>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">
              Visualization is always chosen according to the data type and the analysis goal,
              so every chart matches the data and delivers clear insights.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="p-2 hover:bg-slate-50 rounded-lg text-slate-400"><Filter className="w-4 h-4" /></button>
          <button className="p-2 hover:bg-slate-50 rounded-lg text-slate-400"><Share2 className="w-4 h-4" /></button>
          <button 
            onClick={downloadPDF}
            disabled={isGeneratingPDF}
            className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 border border-slate-200 rounded-lg text-slate-600 text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            title="Download insights report as PDF"
          >
            {isGeneratingPDF ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> GENERATING...</>
            ) : (
              <><FileDown className="w-4 h-4" /> DOWNLOAD PDF</>
            )}
          </button>
          <button 
            onClick={downloadCleanedCSV}
            className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 border border-slate-200 rounded-lg text-slate-600 text-xs font-bold transition-all"
            title="Export the cleaned dataset used for these insights"
          >
            <Download className="w-4 h-4" /> EXPORT DATA
          </button>
          <button onClick={onReset} className="ml-4 px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 transition-all">NEW ANALYSIS</button>
        </div>
      </div>

      {/* Interactive Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] mb-2">Date</p>
          <select value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 bg-white">
            <option value="All">All</option>
            {filterOptions.dates.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] mb-2">Region</p>
          <select value={selectedRegion} onChange={(e) => setSelectedRegion(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 bg-white">
            <option value="All">All</option>
            {filterOptions.regions.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] mb-2">Category</p>
          <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 bg-white">
            <option value="All">All</option>
            {filterOptions.categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] mb-2">Segment</p>
          <select value={selectedSegment} onChange={(e) => setSelectedSegment(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 bg-white">
            <option value="All">All</option>
            {filterOptions.segments.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* KPI Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Total Revenue</p>
          <p className="text-3xl font-black text-slate-900">{formatCurrency(executiveData.totalRevenue)}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Total Profit</p>
          <p className="text-3xl font-black text-slate-900">{formatCurrency(executiveData.totalProfit)}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Total Orders</p>
          <p className="text-3xl font-black text-slate-900">{formatNumber(executiveData.totalOrders)}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Growth Rate</p>
          <div className="flex items-center gap-2">
            {executiveData.growthRate >= 0 ? (
              <ArrowUpRight className="w-5 h-5 text-emerald-600" />
            ) : (
              <ArrowDownRight className="w-5 h-5 text-rose-600" />
            )}
            <p className={`text-3xl font-black ${executiveData.growthRate >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
              {executiveData.growthRate.toFixed(1)}%
            </p>
          </div>
        </div>
      </div>

      {/* Executive Visual Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-2">
        <div className="lg:col-span-12 bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
          <h4 className="text-sm font-bold text-slate-800 uppercase tracking-widest mb-6">Revenue Trend (Monthly)</h4>
          <div className="h-[320px]">
            {executiveData.monthlyRevenue.length === 0 ? (
              <div className="flex items-center justify-center h-full text-sm text-slate-400">No revenue trend data available.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={executiveData.monthlyRevenue}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }} tickFormatter={(v) => formatNumber(Number(v))} />
                  <Tooltip formatter={(v: number) => formatCurrency(Number(v))} />
                  <Line type="monotone" dataKey="revenue" name="Revenue" stroke="#0f172a" strokeWidth={3} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="lg:col-span-6 bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
          <h4 className="text-sm font-bold text-slate-800 uppercase tracking-widest mb-6">Category Performance: Sales by Category</h4>
          <div className="h-[320px]">
            {executiveData.categoryPerformance.length === 0 ? (
              <div className="flex items-center justify-center h-full text-sm text-slate-400">No category sales data available.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={executiveData.categoryPerformance}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="category" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }} tickFormatter={(v) => formatNumber(Number(v))} />
                  <Tooltip formatter={(v: number) => formatCurrency(Number(v))} />
                  <Bar dataKey="sales" fill="#0f172a" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="lg:col-span-6 bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
          <h4 className="text-sm font-bold text-slate-800 uppercase tracking-widest mb-6">Category Performance: Profit by Category</h4>
          <div className="h-[320px]">
            {executiveData.categoryPerformance.length === 0 ? (
              <div className="flex items-center justify-center h-full text-sm text-slate-400">No category profit data available.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={executiveData.categoryPerformance}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="category" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }} tickFormatter={(v) => formatNumber(Number(v))} />
                  <Tooltip formatter={(v: number) => formatCurrency(Number(v))} />
                  <Bar dataKey="profit" fill="#14b8a6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="lg:col-span-6 bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
          <h4 className="text-sm font-bold text-slate-800 uppercase tracking-widest mb-6">Regional Performance: Sales by Region</h4>
          <div className="h-[320px]">
            {executiveData.regionalPerformance.length === 0 ? (
              <div className="flex items-center justify-center h-full text-sm text-slate-400">No regional sales data available.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={executiveData.regionalPerformance}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="region" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }} tickFormatter={(v) => formatNumber(Number(v))} />
                  <Tooltip formatter={(v: number) => formatCurrency(Number(v))} />
                  <Bar dataKey="sales" fill="#334155" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="lg:col-span-6 bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
          <h4 className="text-sm font-bold text-slate-800 uppercase tracking-widest mb-6">Customer Insights: Segment Mix</h4>
          <div className="h-[320px]">
            {executiveData.customerSegments.length === 0 ? (
              <div className="flex items-center justify-center h-full text-sm text-slate-400">No customer segment data available.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={executiveData.customerSegments}
                    dataKey="count"
                    nameKey="segment"
                    innerRadius={70}
                    outerRadius={110}
                    paddingAngle={2}
                  >
                    {executiveData.customerSegments.map((_, i) => (
                      <Cell key={i} fill={['#0f172a', '#14b8a6', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'][i % 6]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatNumber(Number(v))} />
                  <Legend wrapperStyle={{ fontSize: 11, fontWeight: 600 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="lg:col-span-12 bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
          <h4 className="text-sm font-bold text-slate-800 uppercase tracking-widest mb-6">Product Performance: Top 10 Products by Sales</h4>
          <div className="h-[340px]">
            {executiveData.topProducts.length === 0 ? (
              <div className="flex items-center justify-center h-full text-sm text-slate-400">No product sales data available.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={executiveData.topProducts} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }} tickFormatter={(v) => formatNumber(Number(v))} />
                  <YAxis type="category" dataKey="product" axisLine={false} tickLine={false} width={140} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }} />
                  <Tooltip formatter={(v: number) => formatCurrency(Number(v))} />
                  <Bar dataKey="sales" fill="#0f172a" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="lg:col-span-12 bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
          <h4 className="text-sm font-bold text-slate-800 uppercase tracking-widest mb-6">Discount Impact Analysis: Discount vs Profit</h4>
          <div className="h-[340px]">
            {executiveData.discountImpact.length === 0 ? (
              <div className="flex items-center justify-center h-full text-sm text-slate-400">No discount and profit columns available for scatter analysis.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis type="number" dataKey="discount" name="Discount" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }} />
                  <YAxis type="number" dataKey="profit" name="Profit" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }} tickFormatter={(v) => formatNumber(Number(v))} />
                  <Tooltip cursor={{ strokeDasharray: '3 3' }} formatter={(v: number, name: string) => name === 'Discount' ? `${Number(v).toFixed(2)}%` : formatCurrency(Number(v))} />
                  <Scatter name="Discount vs Profit" data={executiveData.discountImpact} fill="#0f172a" />
                </ScatterChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

      </div>
      </div>

      {/* Narrative Section */}
      <div className="space-y-12 mt-16 max-w-5xl mx-auto">
        <section className="bg-white rounded-[40px] p-12 border border-slate-200 shadow-lg">
          <SectionHeader 
            icon={BarChart2} 
            title="Descriptive Summary" 
            subtitle="Expert synthesis of observed patterns and performance metrics."
          />
          <div className="prose prose-slate prose-lg max-w-none">
            <p className="text-slate-600 leading-relaxed font-light">
              <span className="font-bold text-slate-900 border-b-2 border-slate-900 pb-1 mb-6 inline-block">EXECUTIVE TRANSCRIPT</span><br/>
              {analysis.descriptive.narrative}
            </p>
          </div>
        </section>

        <section className="bg-white rounded-[40px] p-12 border border-slate-200 shadow-lg">
          <SectionHeader 
            icon={Activity} 
            title="Diagnostic Deep Dive" 
            subtitle="Identifying the 'Why' behind current data trajectories."
          />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div className="prose prose-slate prose-lg">
               <p className="text-slate-600 leading-relaxed font-light">
                <span className="font-bold text-slate-900 border-b-2 border-slate-900 pb-1 mb-6 inline-block">ROOT CAUSE LOG</span><br/>
                {analysis.diagnostic.narrative}
              </p>
            </div>
            <div className="space-y-4">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-4">Statistical Correlations</h4>
              {analysis.diagnostic.correlations.map((corr, idx) => (
                <div key={idx} className="p-5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-slate-900">{corr.factor}</p>
                    <p className="text-xs text-slate-500 font-medium">{corr.relationship}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-slate-900 rounded-full transition-all duration-1000" 
                        style={{ width: `${corr.strength * 100}%` }}
                      />
                    </div>
                    <span className="text-xs font-mono font-bold text-slate-400">{(corr.strength * 100).toFixed(0)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-slate-900 rounded-[40px] p-12 text-white shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 -mr-32 -mt-32 rounded-full blur-3xl"></div>
          <div className="relative z-10">
            <SectionHeader 
              icon={TrendingUp} 
              title="Predictive Horizon" 
              subtitle="Statistical forecasting models applied to current momentum."
            />
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
              <div className="lg:col-span-8 h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={analysis.predictive.forecast}>
                    <defs>
                      <linearGradient id="colorWhite" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ffffff" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#ffffff" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                    <XAxis 
                      dataKey="period" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fill: '#94a3b8', fontSize: 11, fontWeight: 600}}
                      label={{ value: 'Forecast Period', position: 'insideBottom', offset: -5, style: { fill: '#94a3b8', fontSize: 10, fontWeight: 700 } }}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fill: '#94a3b8', fontSize: 11, fontWeight: 600}}
                      label={{ value: 'Predicted Value', angle: -90, position: 'insideLeft', style: { fill: '#94a3b8', fontSize: 10, fontWeight: 700 } }}
                    />
                    <Tooltip 
                      contentStyle={{backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff'}} 
                      labelStyle={{color: '#94a3b8', fontWeight: 600, fontSize: 11, marginBottom: 4}}
                      itemStyle={{color: '#fff', fontWeight: 700, fontSize: 13}}
                      formatter={(value: number) => [value.toFixed(2), 'Predicted']}
                    />
                    <Area type="monotone" dataKey="predicted" stroke="#ffffff" fillOpacity={1} fill="url(#colorWhite)" strokeWidth={3}>
                      <LabelList dataKey="predicted" position="top" style={{ fill: '#ffffff', fontSize: 11, fontWeight: 700 }} formatter={(value: number) => value.toFixed(1)} />
                    </Area>
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="lg:col-span-4 space-y-8">
                <div className="p-8 bg-white/5 backdrop-blur-md rounded-3xl border border-white/10">
                  <div className="flex items-center justify-between mb-6">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Confidence Interval</span>
                    <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  </div>
                  <p className="text-6xl font-black mb-2 tracking-tighter">{(analysis.predictive.confidence * 100).toFixed(0)}%</p>
                  <p className="text-xs text-slate-400 font-medium leading-relaxed">Probability score calibrated via monte carlo simulation.</p>
                </div>
              </div>
            </div>
            <div className="mt-12 prose prose-invert prose-lg max-w-none">
              <p className="text-slate-300 leading-relaxed font-light">
                <span className="font-bold text-white uppercase tracking-widest text-xs border-b border-white/20 pb-1 mb-4 inline-block">FORECAST NARRATIVE</span><br/>
                {analysis.predictive.narrative}
              </p>
            </div>
          </div>
        </section>

        <section className="bg-white rounded-[40px] p-12 border border-slate-200 shadow-lg">
          <SectionHeader 
            icon={Lightbulb} 
            title="Prescriptive Actions" 
            subtitle="Strategic roadmap generated from diagnostic and predictive findings."
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {analysis.prescriptive.recommendations.map((rec, idx) => (
              <div key={idx} className="flex flex-col p-8 bg-slate-50 border border-slate-100 rounded-[32px] hover:border-slate-900 transition-all group">
                <div className="mb-6">
                  <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full ${
                    rec.priority === 'High' ? 'bg-rose-100 text-rose-700' : 
                    rec.priority === 'Medium' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {rec.priority} PRIORITY
                  </span>
                </div>
                <h4 className="text-xl font-bold text-slate-900 mb-4 group-hover:text-slate-900">{rec.action}</h4>
                <p className="text-sm text-slate-500 leading-relaxed font-medium flex-1">{rec.impact}</p>
                <div className="mt-8 pt-8 border-t border-slate-200">
                  <button className="text-[10px] font-black text-slate-900 flex items-center gap-2 group-hover:gap-3 transition-all tracking-widest uppercase">
                    VIEW PLAN <ArrowUpRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-slate-50 p-10 rounded-[32px] border border-slate-100">
            <div className="flex items-start gap-4 mb-8">
              <AlertCircle className="w-5 h-5 text-slate-400 mt-1" />
              <p className="text-xs text-slate-500 font-medium italic leading-relaxed">
                <span className="font-bold text-slate-900 uppercase tracking-widest text-[9px] not-italic mr-2 px-2 py-0.5 bg-slate-200 rounded">Liability Notice:</span>
                {analysis.prescriptive.disclaimer}
              </p>
            </div>
            <div className="prose prose-slate prose-lg max-w-none">
              <p className="text-slate-600 leading-relaxed font-light">
                <span className="font-bold text-slate-900 italic border-b border-slate-200 pb-1 mb-6 inline-block">DECISION SUPPORT TRANSCRIPT</span><br/>
                {analysis.prescriptive.narrative}
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
