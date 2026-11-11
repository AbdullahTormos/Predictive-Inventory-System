import React, { useState, useEffect, useMemo } from 'react';
import { 
  Package, 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCw, 
  Loader2, 
  Search, 
  ShoppingCart, 
  Layers, 
  Boxes,
  XCircle,
  Filter
} from 'lucide-react';
import '../styles/InventoryMonitor.css';

export default function InventoryMonitor() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [reorderingSku, setReorderingSku] = useState(null);
  const [statusMessage, setStatusMessage] = useState(null);

  const fetchProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/products');
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const data = await res.json();
      setProducts(data);
    } catch (err) {
      setError("Failed to load inventory. Ensure the API service is running.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleReorder = async (sku) => {
    setReorderingSku(sku);
    setStatusMessage(null);
    
    try {
      const res = await fetch('/api/purchase-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sku, order_quantity: 50, status: 'PENDING' })
      });

      if (!res.ok) throw new Error('Order creation failed');
      
      setStatusMessage({ type: 'success', text: `Purchase order submitted for ${sku}.` });
    } catch (err) {
      setStatusMessage({ type: 'error', text: `Could not create PO for ${sku}.` });
    } finally {
      setReorderingSku(null);
    }
  };

  const categories = useMemo(() => {
    const unique = new Set(products.map(p => p.category).filter(Boolean));
    return ['ALL', ...unique];
  }, [products]);

  const stats = useMemo(() => {
    let criticalCount = 0;
    let totalStock = 0;

    products.forEach(p => {
      const stock = p.current_stock || 0;
      const safety = p.safety_stock || 0;
      if (stock <= safety) criticalCount++;
      totalStock += stock;
    });

    return { totalSkus: products.length, criticalCount, totalStock };
  }, [products]);

  const filteredProducts = useMemo(() => {
    const query = searchTerm.toLowerCase();
    return products.filter(p => {
      const matchesSearch = p.sku?.toLowerCase().includes(query) || p.category?.toLowerCase().includes(query);
      const matchesCategory = selectedCategory === 'ALL' || p.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchTerm, selectedCategory]);

  return (
    <div className="inventory-container">
      {/* Header */}
      <header className="inventory-header">
        <div>
          <h1 className="header-title header-title-group">
            <Package className="icon-blue" /> Inventory Monitor
          </h1>
          <p className="header-subtitle">Real-time stock levels and threshold alerts</p>
        </div>
        <button 
          onClick={fetchProducts} 
          disabled={loading}
          className="btn-primary"
        >
          <RefreshCw size={16} className={loading ? 'spin' : ''} /> 
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </header>

      {/* Stats Overview */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon-wrapper blue">
            <Boxes size={20} />
          </div>
          <div>
            <span className="stat-label">Total SKUs</span>
            <div className="stat-value">{stats.totalSkus}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper red">
            <AlertTriangle size={20} />
          </div>
          <div>
            <span className="stat-label">Low Stock Alerts</span>
            <div className={`stat-value ${stats.criticalCount > 0 ? 'text-red' : ''}`}>
              {stats.criticalCount}
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper emerald">
            <Layers size={20} />
          </div>
          <div>
            <span className="stat-label">Total On-Hand</span>
            <div className="stat-value">{stats.totalStock.toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="controls-bar">
        <div className="search-wrapper">
          <Search className="search-icon" size={18} />
          <input 
            type="text" 
            placeholder="Search by SKU or category..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="category-filter">
          <Filter size={16} className="filter-icon" />
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`category-chip ${selectedCategory === cat ? 'active' : ''}`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Alerts / Feedback */}
      {error && (
        <div className="alert-box error">
          <XCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {statusMessage && (
        <div className={`alert-box ${statusMessage.type}`}>
          {statusMessage.type === 'success' ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Main Table */}
      <div className="table-card">
        {loading ? (
          <div className="table-state-container">
            <Loader2 className="spin icon-blue" size={20} /> 
            <span>Loading inventory...</span>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="table-state-container">
            No products found matching criteria.
          </div>
        ) : (
          <div className="table-responsive">
            <table className="inventory-table">
              <thead>
                <tr>
                  <th className="font-mono">SKU</th>
                  <th>Category</th>
                  <th>Current Stock</th>
                  <th>Safety Stock</th>
                  <th>Status</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((p) => {
                  const stock = p.current_stock || 0;
                  const safety = p.safety_stock || 0;
                  const isCritical = stock <= safety;

                  return (
                    <tr key={p.sku}>
                      <td className="font-mono sku-text">{p.sku}</td>
                      <td>
                        <span className="category-badge">
                          {p.category || 'General'}
                        </span>
                      </td>
                      <td className="stock-text">{stock} units</td>
                      <td>{safety} units</td>
                      <td>
                        {isCritical ? (
                          <span className="status-badge critical">
                            <AlertTriangle size={14} /> Low Stock
                          </span>
                        ) : (
                          <span className="status-badge ok">
                            <CheckCircle2 size={14} /> OK
                          </span>
                        )}
                      </td>
                      <td className="align-right">
                        <button
                          onClick={() => handleReorder(p.sku)}
                          disabled={reorderingSku === p.sku}
                          className="btn-restock"
                        >
                          {reorderingSku === p.sku ? (
                            <Loader2 size={13} className="spin" />
                          ) : (
                            <ShoppingCart size={13} />
                          )}
                          Restock
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}