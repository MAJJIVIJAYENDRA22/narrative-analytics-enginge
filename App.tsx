
import React, { useState } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { ErrorBoundary } from './components/ErrorBoundary';
import { DataRow, AnalysisSummary, DataQualityReport } from './types';
import { assessDataQuality, analyzeDataset, cleanDataset } from './services/geminiService';
import { Upload, CheckCircle, AlertTriangle, XCircle, Loader2, Sparkles, AlertCircle, Wand2, Download, Table, ArrowRight } from 'lucide-react';

const App: React.FC = () => {
  const [rawData, setRawData] = useState<DataRow[] | null>(null);
  const [cleanedData, setCleanedData] = useState<DataRow[] | null>(null);
  const [cleaningReport, setCleaningReport] = useState<string[] | null>(null);
  const [qualityReport, setQualityReport] = useState<DataQualityReport | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [preprocessingComplete, setPreprocessingComplete] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string>('');

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Store filename without extension
    const fileNameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
    setUploadedFileName(fileNameWithoutExt);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const rows = text.split('\n').filter(r => r.trim());
        if (rows.length < 2) throw new Error("File is empty or missing headers.");
        
        const headers = rows[0].split(',').map(h => h.trim());
        const parsedData = rows.slice(1).map(row => {
          const values = row.split(',');
          const obj: any = {};
          headers.forEach((header, i) => {
            const val = values[i]?.trim();
            obj[header] = (val && !isNaN(Number(val))) ? Number(val) : val;
          });
          return obj;
        });

        setRawData(parsedData);
        setQualityReport(assessDataQuality(parsedData));
        setCleanedData(null);
        setCleaningReport(null);
        setError(null);
        setPreprocessingComplete(false);
        setSuccessMessage(`Upload successful: ${parsedData.length} rows and ${headers.length} columns detected.`);
      } catch (err: any) {
        setSuccessMessage(null);
        setPreprocessingComplete(false);
        setError(err.message || "Failed to parse the file.");
      }
    };
    reader.readAsText(file);
  };

  const handleCleaning = () => {
    if (!rawData) return;
    const { cleanedData, report } = cleanDataset(rawData);

    if (!cleanedData.length) {
      setCleanedData(null);
      setCleaningReport(report);
      setPreprocessingComplete(false);
      setError('Dataset is unclean. Cleaning required before generating insights.');
      setSuccessMessage(null);
      return;
    }

    setCleanedData(cleanedData);
    setCleaningReport(report);
    setPreprocessingComplete(true);
    setError(null);
    setSuccessMessage(`Cleaning completed. ${cleanedData.length} records ready for analysis.`);
  };

  const downloadCSV = () => {
    const dataToExport = cleanedData || rawData;
    if (!dataToExport || dataToExport.length === 0) return;

    const headers = Object.keys(dataToExport[0]).join(',');
    const rows = dataToExport.map(row => Object.values(row).join(','));
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "cleaned_analytics_dataset.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const runAnalysis = async () => {
    if (!preprocessingComplete || !cleanedData || cleanedData.length === 0) {
      setError('Dataset is unclean. Cleaning required before generating insights.');
      return;
    }

    const targetData = cleanedData;
    setIsLoading(true);
    setError(null);
    setLoadingStep('data');

    try {
      await new Promise(r => setTimeout(r, 700));
      setLoadingStep('chart');
      console.log('Sending data to backend:', targetData.length, 'records');
      const results = await analyzeDataset(targetData);
      console.log('Received analysis:', results);
      setLoadingStep('insights');
      await new Promise(r => setTimeout(r, 500));
      setAnalysis(results);
      setError(null);
    } catch (err: any) {
      console.error('Analysis error:', err);
      setError(`Synthesis Error: ${err.message || "Unknown error"}`);
    } finally {
      setIsLoading(false);
      setLoadingStep('');
    }
  };

  const reset = () => {
    setRawData(null);
    setCleanedData(null);
    setCleaningReport(null);
    setQualityReport(null);
    setAnalysis(null);
    setError(null);
    setSuccessMessage(null);
    setPreprocessingComplete(false);
    setUploadedFileName('');
  };

  const uploadedRowCount = (cleanedData || rawData || []).length;
  const uploadedColumnCount = Object.keys((cleanedData || rawData || [])[0] || {}).length;
  const dataCleanlinessMessage = qualityReport?.checks?.find((check: any) => check.name === 'Data Cleanliness')?.message;

  if (isLoading) {
    const pipelineSteps = [
      { key: 'data',     label: 'Right Data',     desc: 'Validating & preparing dataset' },
      { key: 'chart',    label: 'Right Chart',    desc: 'Selecting optimal chart types' },
      { key: 'insights', label: 'Clear Insights', desc: 'Synthesizing analytical narrative' },
    ];
    const activeIdx = pipelineSteps.findIndex(s => s.key === loadingStep);
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-14 text-center animate-in fade-in duration-500">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-50 border border-gray-100 rounded-full text-xs font-semibold tracking-widest text-gray-500 uppercase">
              <Loader2 className="w-3 h-3 animate-spin" /> Processing
            </div>
            <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Generating Your Analysis</h2>
          </div>

          <div className="flex items-start">
            {pipelineSteps.map((step, i) => {
              const isDone = i < activeIdx;
              const isActive = i === activeIdx;
              return (
                <React.Fragment key={step.key}>
                  <div className={`flex flex-col items-center gap-4 w-44 transition-all duration-500 ${
                    isActive ? 'opacity-100 scale-105' : isDone ? 'opacity-70' : 'opacity-25'
                  }`}>
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm transition-all duration-500 ${
                      isDone ? 'bg-emerald-500' : isActive ? 'bg-black' : 'bg-gray-100'
                    }`}>
                      {isDone
                        ? <CheckCircle className="w-7 h-7 text-white" />
                        : isActive
                          ? <Loader2 className="w-7 h-7 text-white animate-spin" />
                          : <span className="text-sm font-bold text-gray-400">{i + 1}</span>
                      }
                    </div>
                    <div>
                      <p className={`text-sm font-bold tracking-wide ${
                        isActive ? 'text-gray-900' : isDone ? 'text-gray-500' : 'text-gray-300'
                      }`}>{step.label}</p>
                      <p className="text-xs text-gray-400 font-light mt-0.5 max-w-[130px] mx-auto leading-snug">{step.desc}</p>
                    </div>
                  </div>
                  {i < pipelineSteps.length - 1 && (
                    <div className={`w-14 h-px mt-7 mx-2 transition-all duration-700 ${
                      i < activeIdx ? 'bg-emerald-400' : 'bg-gray-200'
                    }`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>

          <p className="text-gray-400 font-light text-sm max-w-xs">This may take a few moments as we compute the full analytical stack.</p>
        </div>
      </Layout>
    );
  }

  if (analysis) {
    console.log('Analysis data received:', JSON.stringify(analysis, null, 2));
    return (
      <Layout>
        <ErrorBoundary>
          <Dashboard 
            analysis={analysis} 
            onReset={reset} 
            data={cleanedData || rawData || []} 
            fileName={uploadedFileName}
          />
        </ErrorBoundary>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        {!rawData ? (
          <section className="text-center space-y-12 py-12 animate-in slide-in-from-bottom-8 duration-700">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-50 border border-gray-100 rounded-full text-xs font-semibold tracking-wider text-gray-500 uppercase">
                <Sparkles className="w-3 h-3" /> Research-Grade Insights
              </div>
              <h1 className="text-6xl font-bold text-gray-900 tracking-tight leading-[1.1]">
                Automated Analytics <br/>
                <span className="text-gray-300">Simplified Narrative</span>
              </h1>
              <p className="text-xl text-gray-500 font-light max-w-2xl mx-auto leading-relaxed">
                Upload your dataset to generate a comprehensive 4-tier analysis report. 
                Experience explainable ML designed for human decision-making.
              </p>
              <div className="flex items-center justify-center gap-3 pt-2">
                <span className="text-sm font-bold text-gray-900 tracking-tight">Right Data</span>
                <ArrowRight className="w-4 h-4 text-gray-300" />
                <span className="text-sm font-bold text-gray-900 tracking-tight">Right Chart</span>
                <ArrowRight className="w-4 h-4 text-gray-300" />
                <span className="text-sm font-bold text-gray-900 tracking-tight">Clear Insights</span>
              </div>
            </div>

            <div className="bg-white p-12 rounded-[40px] border-2 border-dashed border-gray-100 hover:border-gray-300 transition-all group relative cursor-pointer">
              <input 
                type="file" 
                accept=".csv"
                onChange={handleFileUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div className="flex flex-col items-center gap-6">
                <div className="w-20 h-20 bg-gray-50 rounded-3xl flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                  <Upload className="w-8 h-8 text-gray-400 group-hover:text-black" />
                </div>
                <div className="space-y-1">
                  <p className="text-lg font-medium text-gray-900">Drag & drop your CSV dataset</p>
                  <p className="text-sm text-gray-400">or click to browse local files</p>
                </div>
              </div>
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-600 text-sm justify-center">
                <XCircle className="w-4 h-4" /> {error}
              </div>
            )}

            {successMessage && (
              <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center gap-3 text-emerald-700 text-sm justify-center">
                <CheckCircle className="w-4 h-4" /> {successMessage}
              </div>
            )}
          </section>
        ) : (
          <section className="space-y-12 animate-in fade-in duration-500">
            <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Uploaded Dataset</p>
                  <h3 className="text-xl font-semibold text-gray-900 mt-1">
                    {uploadedFileName ? `${uploadedFileName}.csv` : 'Uploaded CSV'}
                  </h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-gray-50 rounded-xl px-4 py-3">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Rows</p>
                    <p className="text-lg font-semibold text-gray-900">{uploadedRowCount}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl px-4 py-3">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Columns</p>
                    <p className="text-lg font-semibold text-gray-900">{uploadedColumnCount}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl px-4 py-3 md:col-span-2">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Unclean Data Status</p>
                    <p className="text-sm font-medium text-gray-700 mt-1">{dataCleanlinessMessage || 'Not available yet.'}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between bg-white sticky top-24 z-40 py-4 border-b border-gray-100">
              <div className="flex items-center gap-4">
                <button onClick={reset} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <XCircle className="w-5 h-5 text-gray-400" />
                </button>
                <h2 className="text-2xl font-semibold text-gray-900">Data Staging</h2>
              </div>
              <div className="flex gap-3">
                {!cleanedData ? (
                  <button 
                    onClick={handleCleaning}
                    className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-lg shadow-indigo-100"
                  >
                    Clean Dataset <Wand2 className="w-4 h-4" />
                  </button>
                ) : (
                  <button 
                    onClick={downloadCSV}
                    className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition-all flex items-center gap-2 shadow-lg shadow-emerald-100"
                  >
                    Download Clean CSV <Download className="w-4 h-4" />
                  </button>
                )}
                <button 
                  onClick={runAnalysis}
                  disabled={!preprocessingComplete}
                  className={`px-6 py-3 rounded-xl font-medium transition-all shadow-sm flex items-center gap-2 ${
                    !preprocessingComplete
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                      : 'bg-black text-white hover:bg-gray-800'
                  }`}
                >
                  Generate Insights <Sparkles className="w-4 h-4" />
                </button>
              </div>
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-600 text-sm">
                <AlertCircle className="w-4 h-4" /> {error}
              </div>
            )}

            {successMessage && (
              <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center gap-3 text-emerald-700 text-sm">
                <CheckCircle className="w-4 h-4" /> {successMessage}
              </div>
            )}

            {!preprocessingComplete && rawData && (
              <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl flex items-center gap-3 text-amber-800 text-sm">
                <AlertTriangle className="w-4 h-4" /> Dataset is unclean. Cleaning required before generating insights.
              </div>
            )}

            {cleaningReport && (
              <div className="bg-white border border-indigo-100 rounded-3xl p-8 space-y-4 shadow-sm animate-in slide-in-from-top-4 duration-500">
                <div className="flex items-center gap-2 text-indigo-600 font-bold uppercase tracking-widest text-[10px]">
                  <Wand2 className="w-3 h-3" /> Cleaning Transformation Report
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {cleaningReport.map((line, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-3 bg-indigo-50/50 rounded-xl border border-indigo-50 text-sm text-indigo-900 font-medium">
                      <CheckCircle className="w-4 h-4 text-indigo-400 shrink-0" />
                      {line}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {qualityReport?.checks.map((check, idx) => (
                <div key={idx} className="p-8 bg-white border border-gray-100 rounded-3xl shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-widest">{check.name}</h3>
                    {check.status === 'pass' && <CheckCircle className="w-5 h-5 text-green-500" />}
                    {check.status === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-500" />}
                    {check.status === 'fail' && <XCircle className="w-5 h-5 text-red-500" />}
                  </div>
                  <p className="text-sm text-gray-500 font-light leading-relaxed">{check.message}</p>
                </div>
              ))}
            </div>

            <div className="bg-white border border-gray-100 rounded-[32px] overflow-hidden soft-shadow">
              <div className="p-6 border-b border-gray-50 bg-gray-50/30 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-500 flex items-center gap-2">
                  <Table className="w-4 h-4" /> {cleanedData ? 'Cleaned' : 'Raw'} Data Preview (First 5 Rows)
                </h3>
                <span className="text-xs text-gray-400">{(cleanedData || rawData || []).length} rows detected</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr>
                      {Object.keys((cleanedData || rawData)?.[0] || {}).map((h) => (
                        <th key={h} className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-white border-b border-gray-50">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(cleanedData || rawData)?.slice(0, 5).map((row, i) => (
                      <tr key={i} className="hover:bg-gray-50 transition-colors">
                        {Object.values(row).map((v, j) => (
                          <td key={j} className="px-6 py-4 text-sm text-gray-600 border-b border-gray-50">{String(v)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}
      </div>
    </Layout>
  );
};

export default App;
