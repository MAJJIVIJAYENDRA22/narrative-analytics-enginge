
import React from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Cell, AreaChart, Area, PieChart, Pie, Legend, Label, LabelList
} from 'recharts';
import { AnalysisSummary, DataRow } from '../types';
import { 
  TrendingUp, Activity, BarChart2, Lightbulb, 
  ShieldCheck, AlertCircle, ArrowUpRight, ArrowDownRight,
  Layout as LayoutIcon, Maximize2, Filter, Share2, Download
} from 'lucide-react';

interface DashboardProps {
  analysis: AnalysisSummary;
  onReset: () => void;
  data: DataRow[];
}

const COLORS = ['#1e293b', '#64748b', '#94a3b8', '#cbd5e1', '#f1f5f9'];

export const Dashboard: React.FC<DashboardProps> = ({ analysis, onReset, data }) => {
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

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-lg">
          <p className="text-xs font-bold text-slate-900 mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm font-semibold" style={{ color: entry.color }}>
              {entry.name}: <span className="font-black">{typeof entry.value === 'number' ? entry.value.toFixed(2) : entry.value}</span>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const renderCustomLabel = (props: any) => {
    const { x, y, width, value } = props;
    return (
      <text 
        x={x + width / 2} 
        y={y - 10} 
        fill="#0f172a" 
        textAnchor="middle" 
        className="text-xs font-bold"
      >
        {typeof value === 'number' ? value.toFixed(1) : value}
      </text>
    );
  };

  const renderPieLabel = (entry: any) => {
    return `${entry.name}: ${entry.value}`;
  };

  return (
    <div className="space-y-12 animate-in fade-in duration-700 bg-slate-50 -mx-6 px-6 py-12">
      {/* BI Command Center Header */}
      <div className="flex items-center justify-between mb-8 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <LayoutIcon className="w-5 h-5 text-slate-400" />
          <h2 className="text-lg font-bold text-slate-800 tracking-tight uppercase">Executive BI Canvas</h2>
        </div>
        <div className="flex gap-2">
          <button className="p-2 hover:bg-slate-50 rounded-lg text-slate-400"><Filter className="w-4 h-4" /></button>
          <button className="p-2 hover:bg-slate-50 rounded-lg text-slate-400"><Share2 className="w-4 h-4" /></button>
          <button 
            onClick={downloadCleanedCSV}
            className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 border border-slate-200 rounded-lg text-slate-600 text-xs font-bold transition-all"
            title="Export the cleaned dataset used for these insights"
          >
            <Download className="w-4 h-4" /> EXPORT CLEAN DATA
          </button>
          <button onClick={onReset} className="ml-4 px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 transition-all">NEW ANALYSIS</button>
        </div>
      </div>

      {/* Metric Tiles Tier (Power BI Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {analysis.descriptive.kpis.map((kpi, idx) => (
          <div key={idx} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">{kpi.label}</p>
            <div className="flex items-end justify-between">
              <div>
                <span className="text-3xl font-black text-slate-900">{kpi.value}</span>
                {kpi.change && (
                  <div className={`flex items-center text-xs font-bold mt-2 ${kpi.trend === 'up' ? 'text-emerald-600' : kpi.trend === 'down' ? 'text-rose-600' : 'text-slate-400'}`}>
                    {kpi.trend === 'up' ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
                    {kpi.change}
                  </div>
                )}
              </div>
              <div className="w-16 h-8 opacity-20">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={analysis.biOverview.trend.slice(-5)}>
                    <Area type="monotone" dataKey="value" stroke={kpi.trend === 'up' ? '#10b981' : '#f43f5e'} fill={kpi.trend === 'up' ? '#10b981' : '#f43f5e'} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Visual Canvas Tier */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h4 className="text-sm font-bold text-slate-800 uppercase tracking-widest">Performance Momentum</h4>
            <Maximize2 className="w-4 h-4 text-slate-300" />
          </div>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analysis.biOverview.trend}>
                <defs>
                  <linearGradient id="colorTrend" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0f172a" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#0f172a" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#94a3b8', fontSize: 11, fontWeight: 600}} 
                  label={{ value: 'Time Period', position: 'insideBottom', offset: -5, style: { fill: '#64748b', fontSize: 10, fontWeight: 700 } }}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#94a3b8', fontSize: 11, fontWeight: 600}}
                  label={{ value: 'Value', angle: -90, position: 'insideLeft', style: { fill: '#64748b', fontSize: 10, fontWeight: 700 } }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#0f172a" 
                  fillOpacity={1} 
                  fill="url(#colorTrend)" 
                  strokeWidth={3}
                >
                  <LabelList dataKey="value" position="top" style={{ fill: '#0f172a', fontSize: 11, fontWeight: 700 }} formatter={(value: number) => value.toFixed(1)} />
                </Area>
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-4 bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <h4 className="text-sm font-bold text-slate-800 uppercase tracking-widest">Category Split</h4>
          </div>
          <div className="flex-1 h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={analysis.biOverview.composition}
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  label={(entry) => `${entry.name}: ${entry.value}`}
                  labelLine={{ stroke: '#94a3b8', strokeWidth: 1 }}
                >
                  {analysis.biOverview.composition.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  iconType="circle" 
                  wrapperStyle={{ fontSize: '12px', fontWeight: 600 }}
                  formatter={(value, entry: any) => `${value} (${entry.payload.value})`}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-12 bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h4 className="text-sm font-bold text-slate-800 uppercase tracking-widest">Comparative Distribution</h4>
          </div>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analysis.biOverview.distribution}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="category" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#94a3b8', fontSize: 11, fontWeight: 600}}
                  label={{ value: 'Categories', position: 'insideBottom', offset: -5, style: { fill: '#64748b', fontSize: 10, fontWeight: 700 } }}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#94a3b8', fontSize: 11, fontWeight: 600}}
                  label={{ value: 'Count', angle: -90, position: 'insideLeft', style: { fill: '#64748b', fontSize: 10, fontWeight: 700 } }}
                />
                <Tooltip content={<CustomTooltip />} cursor={{fill: '#f8fafc'}} />
                <Bar dataKey="value" fill="#0f172a" radius={[4, 4, 0, 0]} barSize={40}>
                  <LabelList dataKey="value" position="top" content={renderCustomLabel} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
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
