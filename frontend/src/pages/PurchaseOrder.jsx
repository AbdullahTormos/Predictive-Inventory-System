import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShoppingCart, 
  Clock, 
  CheckCircle2, 
  Loader2, 
  FileText, 
  Plus, 
  X, 
  RefreshCw, 
  Search,
  PackageCheck,
  AlertCircle,
  PackagePlus,
  TrendingDown
} from 'lucide-react';
import '../styles/PurchaseOrder.css';

export default function PurchaseOrders() {
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [completionTimestamps, setCompletionTimestamps] = useState(() => {
    try {
      const saved = localStorage.getItem('po_completion_timestamps');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [showPOModal, setShowPOModal] = useState(false);
  const [showSaleModal, setShowSaleModal] = useState(false);
  
  const [submittingPO, setSubmittingPO] = useState(false);
  const [submittingSale, setSubmittingSale] = useState(false);
  const [fulfillingId, setFulfillingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [poFormData, setPoFormData] = useState({
    sku: '',
    order_quantity: 50,
    status: 'PENDING'
  });

  const [saleFormData, setSaleFormData] = useState({
    sku: '',
    quantity_sold: 1
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [ordersRes, productsRes] = await Promise.all([
        fetch('/api/purchase-orders'),
        fetch('/api/products')
      ]);

      if (!ordersRes.ok) throw new Error(`Orders Fetch Error: ${ordersRes.statusText}`);
      const ordersData = await ordersRes.json();
      setOrders(Array.isArray(ordersData) ? ordersData : []);

      if (productsRes.ok) {
        const prodData = await productsRes.json();
        const pList = Array.isArray(prodData) ? prodData : [];
        setProducts(pList);
        
        if (pList.length > 0) {
          if (!poFormData.sku) setPoFormData(prev => ({ ...prev, sku: pList[0].sku }));
          if (!saleFormData.sku) setSaleFormData(prev => ({ ...prev, sku: pList[0].sku }));
        }
      }
    } catch (err) {
      console.error("Error loading inventory data:", err);
      setError("Unable to connect to inventory services.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('po_completion_timestamps', JSON.stringify(completionTimestamps));
    } catch (err) {
      console.error('Failed to save completion timestamps', err);
    }
  }, [completionTimestamps]);

  const handleFulfillOrder = async (poId) => {
    if (!poId) return;
    setFulfillingId(poId);

    const clickTimestamp = new Date().toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });

    try {
      const res = await fetch(`/api/purchase-orders/${poId}/fulfill`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' }
      });

      if (res.ok) {
        setCompletionTimestamps(prev => ({ ...prev, [poId]: clickTimestamp }));
        await fetchData();
      } else {
        const errData = await res.json();
        alert(`Failed to fulfill order: ${errData.error || 'Server error'}`);
      }
    } catch (err) {
      console.error('Error fulfilling order:', err);
      alert('Network error while processing stock reception.');
    } finally {
      setFulfillingId(null);
    }
  };

  const handleCreateOrder = async (e) => {
    e.preventDefault();
    setSubmittingPO(true);

    try {
      const res = await fetch('/api/purchase-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(poFormData)
      });

      if (res.ok) {
        setShowPOModal(false);
        setPoFormData({ sku: products[0]?.sku || '', order_quantity: 50, status: 'PENDING' });
        await fetchData();
      } else {
        const errData = await res.json();
        alert(`Failed to create purchase order: ${errData.error || 'Server error'}`);
      }
    } catch (err) {
      console.error('Error creating order:', err);
      alert('Network error while submitting purchase order.');
    } finally {
      setSubmittingPO(false);
    }
  };

  const handleLogSale = async (e) => {
    e.preventDefault();
    setSubmittingSale(true);

    try {
      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(saleFormData)
      });

      if (res.ok) {
        const data = await res.json();
        alert(`Sale logged successfully! Remaining Stock: ${data.remainingStock}`);
        setShowSaleModal(false);
        setSaleFormData({ sku: products[0]?.sku || '', quantity_sold: 1 });
        await fetchData();
      } else {
        const errData = await res.json();
        alert(`Failed to log sale: ${errData.error || 'Server error'}`);
      }
    } catch (err) {
      console.error('Error logging sale:', err);
      alert('Network error while logging sale.');
    } finally {
      setSubmittingSale(false);
    }
  };

  const stats = useMemo(() => {
    let pendingCount = 0;
    let fulfilledCount = 0;
    let totalQty = 0;

    orders.forEach(po => {
      if (po.status === 'PENDING') pendingCount++;
      else fulfilledCount++;
      totalQty += Number(po.order_quantity || 0);
    });

    return { total: orders.length, pendingCount, fulfilledCount, totalQty };
  }, [orders]);

  const filteredOrders = useMemo(() => {
    return orders.filter(po => {
      const idMatch = po.po_id?.toString().includes(searchTerm);
      const skuMatch = po.sku?.toLowerCase().includes(searchTerm.toLowerCase());
      const categoryMatch = po.category?.toLowerCase().includes(searchTerm.toLowerCase());
      return idMatch || skuMatch || categoryMatch;
    });
  }, [orders, searchTerm]);

  return (
    <div className="po-container">
      {/* Header */}
      <header className="po-header">
        <div>
          <h1 className="po-title">
            <ShoppingCart className="po-title-icon" /> Purchase & Replenishment Orders
          </h1>
          <p className="po-subtitle">Manage supplier restocking orders and log sales transactions</p>
        </div>
        
        <div className="po-header-actions">
          <button 
            onClick={fetchData} 
            disabled={loading}
            className="btn-icon"
          >
            <RefreshCw size={16} className={loading ? 'spin-icon' : ''} />
          </button>

          <button 
            onClick={() => setShowSaleModal(true)}
            className="btn-danger"
          >
            <TrendingDown size={18} /> Log Sale
          </button>

          <button 
            onClick={() => setShowPOModal(true)}
            className="btn-primary"
          >
            <Plus size={18} /> Create Replenish Order
          </button>
        </div>
      </header>

      {/* KPI Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon-wrapper stat-icon-amber">
            <Clock size={24} />
          </div>
          <div>
            <span className="stat-label">Pending Orders</span>
            <div className="stat-value">{stats.pendingCount}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper stat-icon-emerald">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <span className="stat-label">Fulfilled Orders</span>
            <div className="stat-value">{stats.fulfilledCount}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper stat-icon-blue">
            <PackageCheck size={24} />
          </div>
          <div>
            <span className="stat-label">Total Units Ordered</span>
            <div className="stat-value">{stats.totalQty.toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="search-wrapper">
        <Search className="search-icon" size={18} />
        <input 
          type="text" 
          placeholder="Filter by PO ID, SKU, or Category..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
      </div>

      {error && (
        <div className="error-banner">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {/* Table Section */}
      <div className="table-container">
        {loading ? (
          <div className="state-container font-mono text-xs">
            <Loader2 className="spin-icon po-title-icon" size={24} /> 
            <span>Fetching SQL purchase orders...</span>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="empty-container font-mono text-xs">
            <FileText size={36} />
            <span>No purchase orders found.</span>
          </div>
        ) : (
          <div className="table-scroll">
            <table className="po-table">
              <thead>
                <tr className="table-header-row">
                  <th className="th-cell font-mono">PO ID</th>
                  <th className="th-cell font-mono">Target SKU</th>
                  <th className="th-cell">Category</th>
                  <th className="th-cell">Order Quantity</th>
                  <th className="th-cell">Order Date</th>
                  <th className="th-cell">Status</th>
                  <th className="th-cell text-right">Action</th>
                </tr>
              </thead>
              <tbody className="table-body">
                {filteredOrders.map((po, index) => {
                  const poIdDisplay = po.po_id ? `#PO-${po.po_id}` : `#PO-${index + 100}`;
                  const formattedOrderDate = po.order_date 
                    ? new Date(po.order_date).toLocaleString('en-US', { 
                        month: 'short', 
                        day: 'numeric', 
                        year: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true,
                        timeZone: 'UTC'
                      }) 
                    : 'Recent';

                  const isPending = po.status === 'PENDING';
                  const completedTimestamp = completionTimestamps[po.po_id];

                  return (
                    <tr key={po.po_id || index} className="table-row">
                      <td className="td-cell font-mono td-id">{poIdDisplay}</td>
                      <td className="td-cell font-mono td-sku">{po.sku || 'N/A'}</td>
                      <td className="td-cell text-subtle">
                        <span className="category-tag font-mono">
                          {po.category || 'General'}
                        </span>
                      </td>
                      <td className="td-cell font-semibold text-white">{po.order_quantity} units</td>
                      <td className="td-cell text-subtle font-mono text-xs">{formattedOrderDate}</td>
                      <td className="td-cell">
                        {isPending ? (
                          <span className="status-badge status-badge-pending">
                            <Clock size={13} /> PENDING
                          </span>
                        ) : (
                          <span className="status-badge status-badge-fulfilled">
                            <CheckCircle2 size={13} /> {po.status || 'FULFILLED'}
                          </span>
                        )}
                      </td>
                      
                      <td className="td-cell text-right">
                        {isPending ? (
                          <button
                            onClick={() => handleFulfillOrder(po.po_id)}
                            disabled={fulfillingId === po.po_id}
                            className="btn-action-emerald"
                          >
                            {fulfillingId === po.po_id ? (
                              <Loader2 size={13} className="spin-icon" />
                            ) : (
                              <PackagePlus size={13} />
                            )}
                            Receive Stock
                          </button>
                        ) : (
                          <span className="text-xs text-subtle font-mono">
                            Completed at {completedTimestamp || formattedOrderDate}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE PO MODAL */}
      {showPOModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">
                <ShoppingCart size={20} className="po-title-icon" /> New Replenishment Order
              </h3>
              <button onClick={() => setShowPOModal(false)} className="btn-close">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateOrder} className="form-group">
              <div>
                <label className="form-label">Target Product (SKU)</label>
                <select
                  value={poFormData.sku}
                  onChange={(e) => setPoFormData({ ...poFormData, sku: e.target.value })}
                  className="form-select"
                  required
                >
                  {products.map((p) => (
                    <option key={p.id || p.sku} value={p.sku}>
                      {p.sku} {p.category ? `(${p.category})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label">Quantity to Order</label>
                <input
                  type="number"
                  min="1"
                  value={poFormData.order_quantity}
                  onChange={(e) => setPoFormData({ ...poFormData, order_quantity: Number(e.target.value) })}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  onClick={() => setShowPOModal(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingPO}
                  className="btn-primary btn-full"
                >
                  {submittingPO ? <Loader2 className="spin-icon" size={16} /> : 'Submit Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LOG SALE MODAL */}
      {showSaleModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">
                <TrendingDown size={20} style={{ color: '#f43f5e' }} /> Log Outflow Sale
              </h3>
              <button onClick={() => setShowSaleModal(false)} className="btn-close">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleLogSale} className="form-group">
              <div>
                <label className="form-label">Target Product (SKU)</label>
                <select
                  value={saleFormData.sku}
                  onChange={(e) => setSaleFormData({ ...saleFormData, sku: e.target.value })}
                  className="form-select form-select-rose"
                  required
                >
                  {products.map((p) => (
                    <option key={p.id || p.sku} value={p.sku}>
                      {p.sku} (Current Stock: {p.current_stock ?? 0})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label">Units Sold</label>
                <input
                  type="number"
                  min="1"
                  value={saleFormData.quantity_sold}
                  onChange={(e) => setSaleFormData({ ...saleFormData, quantity_sold: Number(e.target.value) })}
                  className="form-input form-input-rose"
                  required
                />
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  onClick={() => setShowSaleModal(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingSale}
                  className="btn-danger btn-full"
                >
                  {submittingSale ? <Loader2 className="spin-icon" size={16} /> : 'Deduct & Log Sale'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}