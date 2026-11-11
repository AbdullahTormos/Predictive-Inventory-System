import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Package, 
  BarChart3, 
  ShoppingCart, 
  TrendingDown, 
  Users, 
  ShieldAlert, 
  LogOut, 
  ArrowRight,
  Database,
  Cpu,
  Menu,
  X,
  Sliders
} from 'lucide-react';
import '../styles/Sidebar.css';

export default function Sidebar({ 
  user = {}, 
  activeTab, 
  setActiveTab, 
  onLogout, 
  onSwitchView, 
  isSupplyChainView 
}) {
  const [isOpen, setIsOpen] = useState(false);

  const userRole = user?.role?.toUpperCase();
  const isAdmin = userRole === 'ADMIN';
  const isLogisticsAdmin = userRole === 'LOGISTICS_ADMIN';

  useEffect(() => {
    if (!isAdmin && !isSupplyChainView && onSwitchView) {
      onSwitchView();
    }
  }, [isAdmin, isSupplyChainView, onSwitchView]);

  const handleTabClick = (tabKey) => {
    setActiveTab(tabKey);
    setIsOpen(false);
  };

  const supplyChainNav = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'inventory', label: 'Inventory Monitor', icon: Package },
    { id: 'sales', label: 'Sales Log', icon: TrendingDown },
    { id: 'forecasts', label: 'ML Demand Analytics', icon: BarChart3 },
    { id: 'orders', label: 'Purchase Orders', icon: ShoppingCart },
    ...((isAdmin || isLogisticsAdmin) ? [{ id: 'simulation', label: 'AI Simulation', icon: Cpu }] : [])
  ];

  const adminNav = [
    { id: 'overview', label: 'Control Center', icon: ShieldAlert },
    { id: 'users', label: 'User Management', icon: Users },
    { id: 'safety-stock', label: 'Stock Settings', icon: Sliders },
    { id: 'database', label: 'System Diagnostics', icon: Database }
  ];

  const isLogisticsMode = isSupplyChainView || !isAdmin;
  const currentNav = isLogisticsMode ? supplyChainNav : adminNav;
  const activeClass = isLogisticsMode ? 'active-blue' : 'active-purple';
  const consoleTitle = isLogisticsMode ? 'Logistics Console' : 'Admin Console';

  return (
    <>
      {/* Mobile Topbar */}
      <header className="sidebar-mobile-header">
        <div className="mobile-header-left">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="mobile-toggle-btn"
            aria-label="Toggle Menu"
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          <div className="mobile-brand">
            <Cpu className="brand-icon" size={20} />
            <span className="brand-title-sm">{consoleTitle}</span>
          </div>
        </div>
      </header>

      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          onClick={() => setIsOpen(false)}
          className="sidebar-backdrop"
        />
      )}

      {/* Main Sidebar */}
      <aside className={`sidebar-container ${!isOpen ? 'closed' : ''}`}>
        <div>
          <div className="sidebar-header">
            <div className="mobile-brand">
              <Cpu className="brand-icon" size={24} />
              <span className="brand-title-lg">{consoleTitle}</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="mobile-close-btn"
            >
              <X size={20} />
            </button>
          </div>

          <nav className="sidebar-nav">
            {currentNav.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id || (item.id === 'overview' && activeTab === 'control-center');

              return (
                <button
                  key={item.id}
                  onClick={() => handleTabClick(item.id)}
                  className={`nav-item ${isActive ? activeClass : ''}`}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer Actions */}
        <div className="sidebar-footer">
          {isAdmin && (
            <button 
              type="button"
              onClick={() => {
                if (onSwitchView) onSwitchView();
                setIsOpen(false);
              }}
              className="action-btn switch-view-btn"
            >
              <ArrowRight size={16} /> 
              {isSupplyChainView ? 'Switch to Admin View' : 'Switch to Platform View'}
            </button>
          )}

          <button 
            type="button"
            onClick={onLogout}
            className="action-btn signout-btn"
          >
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}