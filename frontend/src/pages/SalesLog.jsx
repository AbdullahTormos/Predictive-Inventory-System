import React, { useState, useEffect, useMemo } from 'react';
import { 
  TrendingDown, 
  Package, 
  Hash, 
  Plus, 
  RefreshCw, 
  Search, 
  Loader2, 
  AlertCircle, 
  X,
  FileSpreadsheet,
  Layers
} from 'lucide-react';
import '../styles/SalesLog.css';

export default function SalesLog() {
  const [sales, setSales] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Modal & Form States
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    sku: '',
    quantity_sold: 1
  });

  // Fetch Sales & Products
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [salesRes, productsRes] = await Promise.all([
        fetch('/api/sales'),
        fetch('/api/products')
      ]);

      if (!salesRes.ok) throw new Error(`Sales Fetch Error: ${salesRes.statusText}`);
      const salesData = await salesRes.json();
      setSales(Array.isArray(salesData) ? salesData : []);

      if (productsRes.ok) {
        const prodData = await productsRes.json();
        const pList = Array.isArray(prodData) ? prodData : [];
        setProducts(pList);
        
        if (pList.length > 0 && !formData.sku) {
          setFormData(prev => ({ 
            ...prev, 
            sku: pList[0].sku
          }));
        }
      }
    } catch (err) {
      console.error("Error loading sales log data:", err);
      setError("Unable to connect to sales services.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Handle SKU Selection change
  const handleSkuChange = (sku) => {
    setFormData(prev => ({
      ...prev,
      sku
    }));
  };

  // Submit New Sale
  const handleLogSale = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sku: formData.sku,
          quantity_sold: Number(formData.quantity_sold)
        })
      });

      if (res.ok) {
        setShowModal(false);
        const defaultProd = products[0];
        setFormData({
          sku: defaultProd?.sku || '',
          quantity_sold: 1
        });
        await fetchData(); // Refresh sales and updated product stock
      } else {
        const errData = await res.json();
        alert(`Failed to log sale: ${errData.error || 'Server error'}`);
      }
    } catch (err) {
      console.error('Error logging sale:', err);
      alert('Network error while logging sales transaction.');
    } finally {
      setSubmitting(false);
    }
  };

  // KPI Calculations
  const stats = useMemo(() => {
    let totalUnitsSold = 0;
    const uniqueSkus = new Set();

    sales.forEach(sale => {
      const qty = Number(sale.quantity_sold || 0);
      totalUnitsSold += qty;
      if (sale.sku) uniqueSkus.add(sale.sku);
    });

    return { 
      totalUnitsSold, 
      uniqueSkusCount: uniqueSkus.size,
      totalTransactions: sales.length 
    };
  }, [sales]);

  // Search Filter
  const filteredSales = useMemo(() => {
    return sales.filter(sale => {
      const idMatch = sale.sale_id?.toString().includes(searchTerm) || sale.id?.toString().includes(searchTerm);
      const skuMatch = sale.sku?.toLowerCase().includes(searchTerm.toLowerCase());
      const categoryMatch = sale.category?.toLowerCase().includes(searchTerm.toLowerCase());
      return idMatch || skuMatch || categoryMatch;
    });
  }, [sales, searchTerm]);

  return (
    <div className="sl-container">
      {/* Header */}
      <header className="sl-header">
        <div>
          <h1 className="sl-title">
            <TrendingDown className="sl-title-icon" /> Sales Outflow Log
          </h1>
          <p className="sl-subtitle">Record outgoing customer orders and track real-time inventory deductions</p>
        </div>
        
        <div className="sl-header-actions">
          <button 
            onClick={fetchData} 
            disabled={loading}
            className="sl-btn-icon"
          >
            <RefreshCw size={16} className={loading ? 'sl-spin' : ''} />
          </button>

          <button 
            onClick={() => setShowModal(true)}
            className="sl-btn-primary"
          >
            <Plus size={18} /> Record New Sale
          </button>
        </div>
      </header>

      {/* KPI Cards */}
      <div className="sl-kpi-grid">
        <div className="sl-kpi-card">
          <div className="sl-kpi-icon-wrapper sl-kpi-icon-rose">
            <Package size={24} />
          </div>
          <div>
            <span className="sl-kpi-label">Total Units Outflow</span>
            <div className="sl-kpi-value">{stats.totalUnitsSold.toLocaleString()}</div>
          </div>
        </div>

        <div className="sl-kpi-card">
          <div className="sl-kpi-icon-wrapper sl-kpi-icon-emerald">
            <Layers size={24} />
          </div>
          <div>
            <span className="sl-kpi-label">Active SKUs Sold</span>
            <div className="sl-kpi-value">{stats.uniqueSkusCount}</div>
          </div>
        </div>

        <div className="sl-kpi-card">
          <div className="sl-kpi-icon-wrapper sl-kpi-icon-blue">
            <Hash size={24} />
          </div>
          <div>
            <span className="sl-kpi-label">Logged Transactions</span>
            <div className="sl-kpi-value">{stats.totalTransactions}</div>
          </div>
        </div>
      </div>

      {/* Search Input */}
      <div className="sl-search-wrapper">
        <Search className="sl-search-icon" size={18} />
        <input 
          type="text" 
          placeholder="Filter sales by Sale ID, SKU, or Category..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="sl-search-input"
        />
      </div>

      {/* Error Alert */}
      {error && (
        <div className="sl-alert-error">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {/* Table Section */}
      <div className="sl-table-card">
        {loading ? (
          <div className="sl-state-box">
            <Loader2 className="sl-spin" style={{ color: '#fb7185' }} size={24} /> 
            <span>Fetching sales ledger...</span>
          </div>
        ) : filteredSales.length === 0 ? (
          <div className="sl-state-empty">
            <FileSpreadsheet size={36} style={{ color: '#475569', marginBottom: '0.25rem' }} />
            <span>No sales logged yet. Click "Record New Sale" to start logging inventory deductions.</span>
          </div>
        ) : (
          <div className="sl-table-responsive">
            <table className="sl-table">
              <thead>
                <tr>
                  <th className="font-mono">Sale ID</th>
                  <th className="font-mono">Product SKU</th>
                  <th>Category</th>
                  <th>Qty Sold</th>
                  <th style={{ textAlign: 'right' }}>Date Logged</th>
                </tr>
              </thead>
              <tbody>
                {filteredSales.map((sale, index) => {
                  const rawId = sale.sale_id ?? sale.id;
                  const saleIdDisplay = rawId ? `#SL-${rawId}` : `#SL-${index + 1000}`;

                  // Formatted date using UTC to prevent offset issues
                  const formattedDate = sale.sale_date 
                    ? new Date(sale.sale_date).toLocaleString('en-US', { 
                        month: 'short', 
                        day: 'numeric', 
                        year: 'numeric', 
                        hour: 'numeric', 
                        minute: '2-digit',
                        hour12: true,
                        timeZone: 'UTC' 
                      }) 
                    : 'Recent';

                  const qty = Number(sale.quantity_sold || 0);

                  return (
                    <tr key={rawId || index}>
                      <td className="sl-cell-id">{saleIdDisplay}</td>
                      <td className="sl-cell-sku">{sale.sku || 'N/A'}</td>
                      <td className="sl-cell-category">
                        <span className="sl-category-tag">
                          {sale.category || 'General'}
                        </span>
                      </td>
                      <td className="sl-cell-qty">-{qty} units</td>
                      <td className="sl-cell-date">{formattedDate}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* RECORD SALE MODAL */}
      {showModal && (
        <div className="sl-modal-overlay">
          <div className="sl-modal-card">
            <div className="sl-modal-header">
              <h3 className="sl-modal-title">
                <TrendingDown size={20} style={{ color: '#fb7185' }} /> Log Outflow Sale
              </h3>
              <button 
                onClick={() => setShowModal(false)} 
                className="sl-modal-close"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleLogSale} className="sl-form">
              {/* Product SKU Selection */}
              <div>
                <label className="sl-field-label">Target Product (SKU)</label>
                <select
                  value={formData.sku}
                  onChange={(e) => handleSkuChange(e.target.value)}
                  className="sl-form-select"
                  required
                >
                  {products.map((p) => (
                    <option key={p.id || p.sku} value={p.sku}>
                      {p.sku} — Available: {p.current_stock ?? 0} units
                    </option>
                  ))}
                </select>
              </div>

              {/* Quantity Sold */}
              <div>
                <label className="sl-field-label">Quantity Sold</label>
                <input
                  type="number"
                  min="1"
                  value={formData.quantity_sold}
                  onChange={(e) => setFormData({ ...formData, quantity_sold: e.target.value })}
                  className="sl-form-input"
                  required
                />
              </div>

              {/* Form Buttons */}
              <div className="sl-form-actions">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="sl-btn-cancel"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="sl-btn-submit"
                >
                  {submitting ? <Loader2 className="sl-spin" size={16} /> : 'Submit Sale'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}