import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Login from './components/Login';
import InventoryMonitor from './pages/InventoryMonitor';
import SupplyChainDashboard from './pages/SupplyChainDashboard';
import MLDemandAnalytics from './pages/Analytics';
import PurchaseOrders from './pages/PurchaseOrder';
import AdminDashboard from './pages/AdminDashboard';
import LogisticsSimulation from './pages/LogisticsSimulation';
import UserManagement from './pages/UserManagement';
import SystemDiagnostics from './pages/SystemDiagnostics';
import SalesLog from './pages/SalesLog';
import SafetyStockManager from './pages/SafetyStockManager';
import './App.css';

export default function App() {
  const [user, setUser] = useState(() => {
    try {
      const savedUser = sessionStorage.getItem('user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const role = user?.role?.toUpperCase();
  const isAdmin = role === 'ADMIN';
  const isLogisticsAdmin = role === 'LOGISTICS_ADMIN';

  const [isSupplyChainView, setIsSupplyChainView] = useState(() => {
    const savedView = sessionStorage.getItem('view_mode');
    return savedView ? savedView === 'supply_chain' : !isAdmin;
  });

  const [activeTab, setActiveTab] = useState(() => {
    const savedTab = sessionStorage.getItem('active_tab');
    if (savedTab) return savedTab;
    return isAdmin && !isSupplyChainView ? 'overview' : 'dashboard';
  });

  useEffect(() => {
    if (user) {
      sessionStorage.setItem('view_mode', isSupplyChainView ? 'supply_chain' : 'admin');
      sessionStorage.setItem('active_tab', activeTab);
    }
  }, [isSupplyChainView, activeTab, user]);

  const handleSwitchView = () => {
    if (!isAdmin) return;
    const nextView = !isSupplyChainView;
    setIsSupplyChainView(nextView);
    setActiveTab(nextView ? 'dashboard' : 'overview');
    setIsMobileMenuOpen(false);
  };

  const handleLogout = () => {
    localStorage.clear();
    sessionStorage.clear();
    setUser(null);
    setIsMobileMenuOpen(false);
  };

  const handleLoginSuccess = (data) => {
    if (data?.user) {
      sessionStorage.setItem('token', data.token || '');
      sessionStorage.setItem('user', JSON.stringify(data.user));

      const userIsAdmin = data.user.role?.toUpperCase() === 'ADMIN';
      setUser(data.user);
      setIsSupplyChainView(!userIsAdmin);
      setActiveTab(userIsAdmin ? 'overview' : 'dashboard');
    }
  };

  const requireRole = (component, allowed) => {
    return allowed ? component : <SupplyChainDashboard user={user} filterCriticalOnly />;
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <SupplyChainDashboard user={user} filterCriticalOnly />;
      case 'inventory':
        return <InventoryMonitor user={user} />;
      case 'sales':
        return <SalesLog user={user} />;
      case 'forecasts':
        return <MLDemandAnalytics user={user} />;
      case 'orders':
        return <PurchaseOrders user={user} />;
      case 'simulation':
        return requireRole(<LogisticsSimulation user={user} />, isAdmin || isLogisticsAdmin);
      case 'safety-stock':
        return requireRole(<SafetyStockManager user={user} />, isAdmin || isLogisticsAdmin);
      case 'overview':
      case 'control-center':
        return requireRole(
          <AdminDashboard 
            user={user} 
            onLogout={handleLogout} 
            onSwitchToUserView={handleSwitchView} 
          />, 
          isAdmin
        );
      case 'users':
        return requireRole(<UserManagement user={user} />, isAdmin);
      case 'database':
        return requireRole(<SystemDiagnostics user={user} />, isAdmin);
      default:
        return <SupplyChainDashboard user={user} filterCriticalOnly />;
    }
  };

  if (!user) {
    return <Login onLogin={handleLoginSuccess} />;
  }

  return (
    <div className="app-layout">
      <Sidebar 
        user={user}
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          setIsMobileMenuOpen(false);
        }}
        onLogout={handleLogout}
        onSwitchView={handleSwitchView}
        isSupplyChainView={isSupplyChainView}
        isOpen={isMobileMenuOpen}
        setIsOpen={setIsMobileMenuOpen}
      />

      <main className="app-main-content">
        {renderContent()}
      </main>
    </div>
  );
}