import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  Activity, 
  X, 
  Menu,
  Database,
  Lock,
  RefreshCw,
  Server,
  Cpu,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Power
} from 'lucide-react';
import Sidebar from '../components/Sidebar';

export default function AdminDashboard({ user, onLogout, onSwitchToUserView }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  const [auditLogs, setAuditLogs] = useState([]);
  const [systemStats, setSystemStats] = useState({
    activeUsers: 0,
    totalUsers: 0,
    dbLatency: 'Measuring...',
    dbStatus: 'Connecting',
    cpuUsage: '0%',
    ramUsage: '0 GB'
  });

  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [logFilter, setLogFilter] = useState('ALL');

  const fetchWithAuth = async (url, options = {}) => {
    const token = sessionStorage.getItem('token') || localStorage.getItem('token');
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    };
    const res = await fetch(url, { ...options, headers });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || errData.error || `Server error (${res.status})`);
    }
    return res.json();
  };

  const fetchDashboardData = async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    setError(null);
    try {
      const [logsData, healthData, maintenanceData] = await Promise.all([
        fetchWithAuth('/api/admin/logs').catch(() => ({ logs: [] })),
        fetchWithAuth('/api/admin/health').catch(() => null),
        fetchWithAuth('/api/admin/system/maintenance').catch(() => null)
      ]);

      setAuditLogs(logsData.logs || logsData || []);
      if (healthData) setSystemStats(healthData);
      if (maintenanceData) setIsMaintenanceMode(!!maintenanceData.enabled);
    } catch (err) {
      console.error('Failed to load admin dashboard data:', err);
      setError(err.message);
    } finally {
      if (showLoading) setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData(true);

    const intervalId = setInterval(() => {
      fetchDashboardData(false);
    }, 5000);

    return () => clearInterval(intervalId);
  }, []);

  const handleToggleMaintenanceMode = async () => {
    const nextState = !isMaintenanceMode;
    // Optimistic UI update
    setIsMaintenanceMode(nextState);

    try {
      await fetchWithAuth('/api/admin/system/maintenance', {
        method: 'PATCH',
        body: JSON.stringify({ enabled: nextState })
      });
    } catch (err) {

      setIsMaintenanceMode(!nextState);
      alert(`Failed to update Maintenance Mode: ${err.message}`);
    }
  };

  const filteredLogs = auditLogs.filter(log => {
    if (logFilter === 'ALL') return true;
    return log.level === logFilter;
  });

  return (
    <div className="dashboard-container relative min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">


      {isSidebarOpen && (
        <Sidebar 
          user={user} 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
          onLogout={onLogout} 
          onSwitchView={onSwitchToUserView}
          isSupplyChainView={false}
        />
      )}

      <main className={`transition-all duration-300 p-6 md:p-10 flex-1 max-w-7xl mx-auto w-full ${isSidebarOpen ? 'pl-72' : 'pl-16'}`}>
        
        <header className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900/80 to-slate-900/20 p-6 rounded-2xl border border-slate-800/80 backdrop-blur-sm">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <span className="p-2 bg-purple-500/10 border border-purple-500/20 rounded-lg text-purple-400">
                <ShieldAlert size={22} />
              </span>
              <h1 className="text-2xl font-bold tracking-tight text-white">Admin Control Console</h1>
            </div>
            <p className="text-slate-400 text-sm">
              Manage system settings, view activity logs, and monitor system health.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={() => fetchDashboardData(true)}
              className="px-3.5 py-2 bg-slate-800/80 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-2 transition cursor-pointer border border-slate-700/60 shadow-sm"
            >
              <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} /> Refresh Data
            </button>
          </div>
        </header>

        {isMaintenanceMode && (
          <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/30 text-amber-300 rounded-xl text-sm flex items-center justify-between backdrop-blur-md">
            <div className="flex items-center gap-3">
              <AlertTriangle size={20} className="text-amber-400 shrink-0" />
              <div>
                <span className="font-bold">Maintenance Mode Active:</span> Standard user access is currently locked for maintenance operations.
              </div>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase">
              Live Lock
            </span>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm flex justify-between items-center backdrop-blur-md">
            <span><strong>Connection Error:</strong> {error}</span>
            <button onClick={() => fetchDashboardData(true)} className="underline text-xs cursor-pointer font-medium">Retry</button>
          </div>
        )}

        <div className="flex border-b border-slate-800 mb-6 gap-8 text-sm font-medium">
          {[
            { id: 'overview', label: 'System Overview' },
            { id: 'audit', label: 'Security Audit Logs' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 transition border-b-2 cursor-pointer font-medium ${
                activeTab === tab.id 
                  ? 'border-purple-500 text-purple-400' 
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Live Stats Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-900/60 transition p-5 rounded-2xl border border-slate-800/80 shadow-sm">
                <div className="flex justify-between items-center text-slate-400 mb-3">
                  <span className="text-xs font-semibold uppercase tracking-wider">Active Users</span>
                  <span className="p-2 bg-blue-500/10 text-blue-400 rounded-xl"><Activity size={16} /></span>
                </div>
                <p className="text-3xl font-extrabold text-white tracking-tight">{systemStats.activeUsers ?? 0}</p>
                <span className="text-xs text-slate-500 mt-1 block">{systemStats.totalUsers ?? 0} Total Accounts</span>
              </div>

              <div className="bg-slate-900/60 transition p-5 rounded-2xl border border-slate-800/80 shadow-sm">
                <div className="flex justify-between items-center text-slate-400 mb-3">
                  <span className="text-xs font-semibold uppercase tracking-wider">Database Status</span>
                  <span className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl"><Database size={16} /></span>
                </div>
                <p className="text-3xl font-extrabold text-emerald-400 tracking-tight">{systemStats.dbStatus || 'Connected'}</p>
                <span className="text-xs text-slate-500 mt-1 block">SQL Latency ({systemStats.dbLatency || '3ms'})</span>
              </div>

              <div className="bg-slate-900/60 transition p-5 rounded-2xl border border-slate-800/80 shadow-sm">
                <div className="flex justify-between items-center text-slate-400 mb-3">
                  <span className="text-xs font-semibold uppercase tracking-wider">Security Layer</span>
                  <span className="p-2 bg-purple-500/10 text-purple-400 rounded-xl"><Lock size={16} /></span>
                </div>
                <p className="text-3xl font-extrabold text-purple-400 tracking-tight">Strict RBAC</p>
                <span className="text-xs text-slate-500 mt-1 block">JWT Secure Verification</span>
              </div>

              <div className="bg-slate-900/60 transition p-5 rounded-2xl border border-slate-800/80 shadow-sm">
                <div className="flex justify-between items-center text-slate-400 mb-3">
                  <span className="text-xs font-semibold uppercase tracking-wider">Server Workload</span>
                  <span className="p-2 bg-amber-500/10 text-amber-400 rounded-xl"><Cpu size={16} /></span>
                </div>
                <p className="text-3xl font-extrabold text-amber-400 tracking-tight">{systemStats.cpuUsage || '12%'}</p>
                <span className="text-xs text-slate-500 mt-1 block">RAM Usage: {systemStats.ramUsage || 'Normal'}</span>
              </div>
            </div>

            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Power size={18} className={isMaintenanceMode ? "text-amber-400" : "text-slate-400"} />
                    <h2 className="text-base font-semibold text-white">System Maintenance Mode</h2>
                  </div>
                </div>

                <button
                  onClick={handleToggleMaintenanceMode}
                  className={`px-5 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-2 border shadow-sm shrink-0 ${
                    isMaintenanceMode
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30 shadow-amber-500/10'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                  }`}
                >
                  <Power size={14} className={isMaintenanceMode ? "text-amber-400 animate-pulse" : "text-slate-400"} />
                  {isMaintenanceMode ? 'Disable Maintenance Mode' : 'Enable Maintenance Mode'}
                </button>
              </div>
            </div>


            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1 bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 flex flex-col justify-between space-y-6 shadow-sm">
                <div>
                  <h2 className="text-base font-semibold text-white flex items-center gap-2 border-b border-slate-800 pb-3 mb-4">
                    <Activity size={18} className="text-blue-400" /> Operational View
                  </h2>
                  <p className="text-sm text-slate-400 mb-4 leading-relaxed">
                    Switch to the supply chain operational layout to inspect order logs and sales metrics.
                  </p>
                </div>

                <button 
                  onClick={onSwitchToUserView}
                  className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer border border-slate-700/60 shadow-sm group"
                >
                  <span>Switch to Supply Chain View</span>
                  <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </button>
              </div>

              <div className="lg:col-span-2 bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 shadow-sm">
                <h2 className="text-base font-semibold text-white flex items-center gap-2 border-b border-slate-800 pb-3 mb-5">
                  <Server size={18} className="text-emerald-400" /> Infrastructure Diagnostics
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div className="p-5 bg-slate-950/60 rounded-xl border border-slate-800/60 flex flex-col justify-between">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">SQL Connection Pool</p>
                    <div className="flex items-center justify-between">
                      <span className={`font-semibold font-mono text-sm ${error ? 'text-red-400' : 'text-emerald-400'}`}>
                        {error ? 'Disconnected' : (systemStats.sqlStatus || systemStats.dbStatus || 'Connected')}
                      </span>
                      {error ? <AlertTriangle size={18} className="text-red-400" /> : <CheckCircle2 size={18} className="text-emerald-400" />}
                    </div>
                  </div>

                  <div className="p-5 bg-slate-950/60 rounded-xl border border-slate-800/60 flex flex-col justify-between">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">System Status</p>
                    <div className="flex items-center justify-between">
                      <span className={`font-semibold font-mono text-sm ${error ? 'text-amber-400' : 'text-purple-400'}`}>
                        {error ? 'Offline' : 'Operational'}
                      </span>
                      {error ? <AlertTriangle size={18} className="text-amber-400" /> : <CheckCircle2 size={18} className="text-purple-400" />}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/*Tab 2*/}
        {activeTab === 'audit' && (
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-800 pb-4 mb-4 gap-4">
              <div className="flex items-center gap-2.5">
                <h2 className="font-semibold text-white flex items-center gap-2 text-base">
                  <Activity size={18} className="text-purple-400" /> Platform Security & Activity Logs
                </h2>
                <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live
                </span>
              </div>

              <div className="flex gap-2 text-xs">
                {['ALL', 'INFO', 'WARNING'].map(level => (
                  <button
                    key={level}
                    onClick={() => setLogFilter(level)}
                    className={`px-3.5 py-1.5 rounded-xl font-semibold transition cursor-pointer border shadow-sm ${
                      logFilter === level 
                        ? 'bg-purple-600 text-white border-purple-500 shadow-purple-600/20' 
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              {filteredLogs.length === 0 ? (
                <p className="text-center text-slate-500 text-xs py-10">
                  {isLoading ? 'Querying security logs...' : 'No system logs recorded.'}
                </p>
              ) : (
                filteredLogs.map((log) => (
                  <div key={log.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3.5 bg-slate-950/40 rounded-xl border border-slate-800/60 gap-2 text-sm">
                    <div className="flex items-center gap-3">
                      {log.level === 'WARNING' ? (
                        <AlertTriangle size={16} className="text-amber-400 shrink-0" />
                      ) : (
                        <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                      )}
                      <div>
                        <span className="font-mono text-xs text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded-md border border-purple-500/20 mr-2">
                          {log.user || log.username || 'System'}
                        </span>
                        <span className="text-slate-200">{log.action || log.message}</span>
                      </div>
                    </div>
                    <span className="text-xs text-slate-500 whitespace-nowrap font-mono">{log.time || log.timestamp || 'Just now'}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}