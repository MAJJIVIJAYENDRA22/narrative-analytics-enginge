
export interface DataRow {
  [key: string]: any;
}

export interface ChartMeta {
  /** Chart type selected by the backend based on data characteristics. */
  type: 'bar' | 'bar_horizontal' | 'line' | 'area' | 'pie';
  xKey: string;
  yKeys: string[];
  /** Whether y-axis values should be formatted as currency or plain numbers. */
  valueType: 'currency' | 'number';
}

export interface AnalysisSummary {
  executive: {
    kpis: Array<{ label: string; value: number; change?: string; trend: 'up' | 'down' | 'neutral' }>;
    profitLoss: Array<{ period: string; profit: number; loss: number }>;
    revenueExpenses: Array<{ period: string; revenue: number; expenses: number }>;
    salesByCategory: Array<{ category: string; sales: number }>;
    regionalPerformance: Array<{ region: string; sales: number; profit: number }>;
    topProducts: Array<{ product: string; sales: number; profit: number }>;
    chartMeta?: {
      profitLoss: ChartMeta;
      revenueExpenses: ChartMeta;
      salesByCategory: ChartMeta;
      regionalPerformance: ChartMeta;
      topProducts: ChartMeta;
    };
  };
  biOverview: {
    composition: Array<{ label: string; value: number }>;
    trend: Array<{ name: string; value: number }>;
    distribution: Array<{ category: string; value: number }>;
  };
  descriptive: {
    kpis: Array<{ label: string; value: string | number; change?: string; trend: 'up' | 'down' | 'neutral' }>;
    narrative: string;
    chartData: any[];
  };
  diagnostic: {
    narrative: string;
    correlations: Array<{ factor: string; relationship: string; strength: number }>;
  };
  predictive: {
    narrative: string;
    forecast: any[];
    confidence: number;
    modelExplanation: string;
  };
  prescriptive: {
    narrative: string;
    recommendations: Array<{ action: string; impact: string; priority: 'High' | 'Medium' | 'Low' }>;
    disclaimer: string;
  };
}

export interface DataQualityReport {
  status: 'green' | 'yellow' | 'red';
  score: number;
  checks: Array<{ name: string; status: 'pass' | 'warning' | 'fail'; message: string }>;
}
