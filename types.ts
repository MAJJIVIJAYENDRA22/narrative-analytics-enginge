
export interface DataRow {
  [key: string]: any;
}

export interface AnalysisSummary {
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
