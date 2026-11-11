import React, { useState, useEffect } from 'react';
import { Cpu, Play, RefreshCw, TrendingUp, Truck, AlertCircle } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import '../styles/LogisticsSimulation.css';

export default function LogisticsSimulation() {
  const [products, setProducts] = useState([]);
  const [selectedSku, setSelectedSku] = useState('');
  const [leadTimeDelay, setLeadTimeDelay] = useState(3);
  const [demandSurge, setDemandSurge] = useState(25);
  const [simulating, setSimulating] = useState(false);
  const [simulationResults, setSimulationResults] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await fetch('/api/products');
        if (!res.ok) throw new Error('Failed to fetch product catalog');
        const data = await res.json();
        const list = Array.isArray(data) ? data : (data.products || []);
        setProducts(list);
        if (list.length > 0) {
          setSelectedSku(list[0].sku || '');
        }
      } catch (err) {
        setError('Could not load products for simulation.');
      }
    };
    fetchProducts();
  }, []);

  const runSimulation = async () => {
    if (!selectedSku) return;
    
    setSimulating(true);
    setError(null);

    try {
      const res = await fetch('/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sku: selectedSku, leadTimeDelay, demandSurge })
      });

      if (!res.ok) throw new Error(`Simulation process failed (${res.status})`);

      const data = await res.json();
      setSimulationResults(data);
    } catch (err) {
      setError(err.message || 'Error executing scenario model.');
      setSimulationResults(null);
    } finally {
      setSimulating(false);
    }
  };

  return (
    <div className="sim-container">
      {/* Header */}
      <header className="sim-header">
        <h1>
          <Cpu className="icon-purple" /> Stress Test Simulation
        </h1>
        <p>Model supply chain shocks to predict stockout exposures and demand spikes</p>
      </header>

      <div className="sim-grid">
        {/* Controls Column */}
        <div className="panel-card">
          <h2 className="panel-title">
            <Truck className="icon-purple" size={18} /> Scenario Parameters
          </h2>

          <div className="field-group">
            <label className="field-label">Target Product (SKU)</label>
            <select
              value={selectedSku}
              onChange={(e) => setSelectedSku(e.target.value)}
              className="select-input"
            >
              {products.length === 0 ? (
                <option value="">No products available</option>
              ) : (
                products.map((p) => (
                  <option key={p.sku} value={p.sku}>
                    {p.sku} {p.category ? `— ${p.category}` : ''}
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="field-group">
            <div className="field-label">
              <span>Lead Time Delay</span>
              <span className="field-value">+{leadTimeDelay} Days</span>
            </div>
            <input 
              type="range" 
              min="0" 
              max="14" 
              value={leadTimeDelay}
              onChange={(e) => setLeadTimeDelay(Number(e.target.value))}
              className="range-input"
            />
          </div>

          <div className="field-group">
            <div className="field-label">
              <span>Demand Surge</span>
              <span className="field-value">+{demandSurge}%</span>
            </div>
            <input 
              type="range" 
              min="0" 
              max="100" 
              step="5"
              value={demandSurge}
              onChange={(e) => setDemandSurge(Number(e.target.value))}
              className="range-input"
            />
          </div>

          <button
            onClick={runSimulation}
            disabled={simulating || !selectedSku}
            className="btn-primary-purple"
          >
            {simulating ? (
              <>
                <RefreshCw size={16} className="spin" /> Running Simulation...
              </>
            ) : (
              <>
                <Play size={16} /> Run Analysis
              </>
            )}
          </button>
        </div>

        {/* Results / Graph Column */}
        <div className="results-card">
          <div>
            <h2 className="panel-title">
              <TrendingUp className="icon-purple" size={18} /> 
              Impact Forecast: <span style={{ fontFamily: 'monospace' }}>{selectedSku || '—'}</span>
            </h2>

            {error && (
              <div className="alert-banner">
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
            )}

            {!simulationResults && !simulating && !error && (
              <div className="state-box">
                <Cpu size={32} style={{ color: 'var(--text-muted)' }} />
                <span>Select a SKU and parameters, then click "Run Analysis".</span>
              </div>
            )}

            {simulating && (
              <div className="state-box">
                <RefreshCw size={32} className="spin icon-purple" />
                <span>Processing model calculation for {selectedSku}...</span>
              </div>
            )}

            {simulationResults && !simulating && (
              <div>
                <div className="metrics-grid">
                  <div className="metric-card">
                    <div className="metric-label">Simulated Peak</div>
                    <div className="metric-value">
                      {simulationResults.simulatedDemand} <span className="metric-unit">units/day</span>
                    </div>
                  </div>

                  <div className="metric-card">
                    <div className="metric-label">Stockout Risk</div>
                    <div className="metric-value text-red">
                      {simulationResults.projectedStockoutDays} <span className="metric-unit">days</span>
                    </div>
                  </div>

                  <div className="metric-card">
                    <div className="metric-label">Buffer Needed</div>
                    <div className="metric-value text-emerald">
                      +{simulationResults.recommendedReorderQty} <span className="metric-unit">units</span>
                    </div>
                  </div>
                </div>

                <div className="chart-box">
                  <div className="chart-title">7-Day Trajectory Projection ({selectedSku})</div>
                  <div className="chart-wrapper">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={simulationResults.chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                        <XAxis dataKey="day" stroke="#71717a" tick={{ fontSize: 12 }} />
                        <YAxis stroke="#71717a" tick={{ fontSize: 12 }} />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: '#18181b', 
                            borderColor: '#27272a', 
                            borderRadius: '6px', 
                            color: '#f4f4f5' 
                          }} 
                        />
                        <Area 
                          type="monotone" 
                          dataKey="Baseline" 
                          stroke="#3b82f6" 
                          fill="#3b82f6" 
                          fillOpacity={0.15} 
                          name="Baseline" 
                        />
                        <Area 
                          type="monotone" 
                          dataKey="StressedDemand" 
                          stroke="#9333ea" 
                          fill="#9333ea" 
                          fillOpacity={0.25} 
                          name="Stressed Demand" 
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="results-footer">
            <span>SKU: {selectedSku || 'None'}</span>
            <span>Mode: Simulation Engine</span>
          </div>
        </div>
      </div>
    </div>
  );
}