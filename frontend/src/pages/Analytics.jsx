import React, { useState, useEffect } from 'react';
import { 
  BrainCircuit, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  Loader2, 
  Sparkles,
  BarChart3,
  AlertCircle
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  ComposedChart, 
  Line, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  Legend 
} from 'recharts';

export default function MLDemandAnalytics() {
  const [products, setProducts] = useState([]);
  const [selectedSku, setSelectedSku] = useState('');
  const [forecastData, setForecastData] = useState([]);
  const [metrics, setMetrics] = useState(null);
  
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingForecast, setLoadingForecast] = useState(false);
  const [productError, setProductError] = useState(null);
  const [forecastError, setForecastError] = useState(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    if (selectedSku) {
      fetchMLForecast(selectedSku);
    }
  }, [selectedSku]);

  const fetchProducts = async () => {
    try {
      setLoadingProducts(true);
      setProductError(null);

      const res = await fetch('/api/products');
      if (!res.ok) throw new Error('Failed to fetch products');
      
      const data = await res.json();
      setProducts(data);
      if (data.length > 0) {
        setSelectedSku(data[0].sku);
      }
    } catch (err) {
      setProductError('Unable to connect to database server.');
    } finally { 
      setLoadingProducts(false);
    }
  };

  const fetchMLForecast = async (sku) => {
    try {
      setLoadingForecast(true);
      setForecastError(null);

      const res = await fetch(`/api/forecast/${sku}`);
      if (!res.ok) throw new Error('Forecast service unavailable');
      
      const data = await res.json();
      setForecastData(data.chartData || []);
      setMetrics(data.metrics || null);
    } catch (err) {
      setForecastError(err.message);
      setForecastData([]);
      setMetrics(null);
    } finally {
      setLoadingForecast(false);
    }
  };

  const activeProduct = products.find(p => p.sku === selectedSku);

  return (
    <div className="space-y-8">
      <header className="border-b border-slate-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <BrainCircuit className="text-purple-400" /> ML Demand Analytics & Forecasts
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Random Forest Regressor predictions mapped against live historical inventory demands
          </p>
        </div>

        <div className="flex items-center gap-3 bg-slate-900 p-2 rounded-xl border border-slate-800">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider pl-2">Target SKU:</span>
          {loadingProducts ? (
            <Loader2 className="animate-spin text-purple-400" size={18} />
          ) : productError ? (
            <span className="text-xs text-red-400 px-2 flex items-center gap-1">
              <AlertCircle size={14} /> Product Error
            </span>
          ) : (
            <select 
              value={selectedSku} 
              onChange={(e) => setSelectedSku(e.target.value)}
              className="bg-slate-950 text-purple-300 border border-slate-700 font-mono text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-purple-500 cursor-pointer"
            >
              {products.map((p) => (
                <option key={p.id || p.sku} value={p.sku}>
                  {p.sku} {p.category ? `— (${p.category})` : ''}
                </option>
              ))}
            </select>
          )}
        </div>
      </header>

      {activeProduct && (
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-950/50 border border-purple-800/40 rounded-xl text-purple-400">
              <BarChart3 size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white font-mono">{activeProduct.sku}</h3>
              <p className="text-xs text-slate-400">Category: <span className="text-slate-200 capitalize">{activeProduct.category || 'N/A'}</span></p>
            </div>
          </div>

          <div className="flex items-center gap-6 text-sm">
            <div>
              <p className="text-slate-400 text-xs">Current Stock</p>
              <p className="font-bold text-white">{activeProduct.current_stock || 0} units</p>
            </div>
            <div className="border-l border-slate-800 pl-6">
              <p className="text-slate-400 text-xs">Safety Threshold</p>
              <p className="font-bold text-slate-300">{activeProduct.safety_stock || 0} units</p>
            </div>
            <div className="border-l border-slate-800 pl-6">
              <p className="text-slate-400 text-xs">Model Status</p>
              {(activeProduct.current_stock || 0) <= (activeProduct.safety_stock || 0) ? (
                <span className="text-red-400 flex items-center gap-1 font-semibold text-xs">
                  <AlertTriangle size={14} /> Stockout Risk
                </span>
              ) : (
                <span className="text-emerald-400 flex items-center gap-1 font-semibold text-xs">
                  <CheckCircle2 size={14} /> Healthy Buffer
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3 bg-slate-900 border border-slate-800 p-6 rounded-2xl">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="font-bold text-white flex items-center gap-2">
                <TrendingUp size={18} className="text-purple-400" /> Demand Trajectory & AI Prediction
              </h2>
              <p className="text-xs text-slate-400">Historical Actual Demand vs. Random Forest ML Projection</p>
            </div>
            <span className="px-3 py-1 bg-purple-950/40 border border-purple-800/50 text-purple-300 rounded-full text-xs font-mono flex items-center gap-1">
              <Sparkles size={12} /> Model: Random Forest
            </span>
          </div>

          {loadingForecast ? (
            <div className="h-80 flex flex-col items-center justify-center text-slate-400 gap-3">
              <Loader2 className="animate-spin text-purple-400" size={32} />
              <p className="text-sm font-mono">Running ML inference for {selectedSku}...</p>
            </div>
          ) : forecastError ? (
            <div className="h-80 flex flex-col items-center justify-center text-red-400 gap-2 bg-red-950/20 rounded-xl border border-red-900/30 p-6">
              <AlertCircle size={32} />
              <p className="text-sm font-semibold">{forecastError}</p>
            </div>
          ) : forecastData.length === 0 ? (
            <div className="h-80 flex flex-col items-center justify-center text-slate-500 gap-2">
              <BarChart3 size={32} />
              <p className="text-sm">No historical or forecast data points available for {selectedSku}.</p>
            </div>
          ) : (
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={forecastData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="date" stroke="#64748b" textAnchor="end" tick={{ fontSize: 12 }} />
                  <YAxis stroke="#64748b" tick={{ fontSize: 12 }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff' }}
                    itemStyle={{ fontSize: '13px' }}
                  />
                  <Legend wrapperStyle={{ paddingTop: '10px' }} />
                  <Area type="monotone" dataKey="forecast" fill="url(#colorForecast)" stroke="none" />
                  <Line type="monotone" dataKey="actual" name="Historical Actual Sales" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} connectNulls />
                  <Line type="monotone" dataKey="forecast" name="Predicted Demand (ML)" stroke="#a855f7" strokeWidth={3} strokeDasharray="5 5" dot={{ r: 4 }} connectNulls />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-white mb-1 flex items-center gap-2">
              <Sparkles className="text-amber-400" size={18} /> Model Evaluation
            </h3>
            <p className="text-xs text-slate-400 mb-6">Validation metrics returned from ML process execution</p>

            <div className="space-y-4">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                <p className="text-xs text-slate-400 font-medium">R² Score (Accuracy)</p>
                <p className="text-2xl font-bold text-emerald-400 mt-1">
                  {metrics?.r2 ? `${(metrics.r2 * 100).toFixed(1)}%` : 'N/A'}
                </p>
                <span className="text-[10px] text-slate-500">Variance coverage ratio</span>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                <p className="text-xs text-slate-400 font-medium">Mean Absolute Error (MAE)</p>
                <p className="text-2xl font-bold text-purple-400 mt-1">
                  {metrics?.mae ?? 'N/A'}{' '}
                  <span className="text-xs text-slate-400 font-normal">units</span>
                </p>
                <span className="text-[10px] text-slate-500">Average forecast variance</span>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                <p className="text-xs text-slate-400 font-medium">Root Mean Sq. Error (RMSE)</p>
                <p className="text-2xl font-bold text-blue-400 mt-1">
                  {metrics?.rmse ?? 'N/A'}
                </p>
                <span className="text-[10px] text-slate-500">Outlier penalization score</span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800 text-[11px] text-slate-500 text-center font-mono">
            RandomForestRegressor Subprocess
          </div>
        </div>
      </div>
    </div>
  );
}