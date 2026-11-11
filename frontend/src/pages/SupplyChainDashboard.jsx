import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  Package, 
  TrendingDown, 
  ShoppingCart, 
  Loader2,
  AlertCircle,
  CheckCircle2,
  X
} from 'lucide-react';
import '../styles/SupplyChainDashboard.css';

export default function SupplyChainDashboard({ user, filterCriticalOnly = false }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [feedback, setFeedback] = useState(null); // Toast/Banner feedback
  
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [orderQty, setOrderQty] = useState(100);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/products');

      if (!res.ok) throw new Error(`Server status: ${res.status}`);

      const data = await res.json();
      const rawList = Array.isArray(data) ? data : (data.products || []);

      const formatted = rawList.map((item) => {
        const stock = item.current_stock ?? item.stock ?? 0;
        const safetyStock = item.safety_stock ?? 0;
        return {
          id: item.id || item.sku,
          sku: item.sku,
          category: item.category || 'General',
          stock,
          safetyStock,
          supplierId: item.supplier_id,
          isCritical: stock <= safetyStock
        };
      });

      setProducts(formatted);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const openReplenishModal = (product) => {
    setSelectedProduct(product);
    // Suggest quantity to hit double safety stock (minimum 50)
    const suggested = Math.max((product.safetyStock * 2) - product.stock, 50);
    setOrderQty(suggested);
    setOrderModalOpen(true);
  };

  const handleConfirmOrder = async (e) => {
    e.preventDefault();
    setFeedback(null);

    try {
      const res = await fetch('/api/purchase-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sku: selectedProduct.sku,
          order_quantity: Number(orderQty),
          status: 'PENDING',
          requestedBy: user?.username || 'system'
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to process purchase order');
      }

      setFeedback({ 
        type: 'success', 
        message: `Purchase order created for ${selectedProduct.sku} (${orderQty} units)` 
      });
      setOrderModalOpen(false);
      fetchProducts();
    } catch (err) {
      setFeedback({ type: 'error', message: err.message });
    }
  };

  // Derived metrics (no useMemo needed for lightweight array ops)
  const displayedProducts = filterCriticalOnly 
    ? products.filter((p) => p.isCritical) 
    : products;

  const criticalCount = products.filter((p) => p.isCritical).length;
  const userRole = user?.role?.toUpperCase();
  const canReplenish = userRole === 'ADMIN' || userRole === 'LOGISTICS_ADMIN';

  return (
    <div className="sc-container">
      <header className="sc-header">
        <h1 className="sc-title">
          <Package className="sc-title-icon" /> Inventory & Supply Chain Monitor
        </h1>
        <p className="sc-subtitle">
          Logged in as <span className="sc-user-highlight">{user?.username || 'Guest'}</span>
        </p>
      </header>

      {/* Global Banners */}
      {error && (
        <div className="sc-alert-error">
          <AlertCircle size={18} />
          <span>Failed to sync inventory: {error}</span>
        </div>
      )}

      {feedback && (
        <div className={`sc-alert-${feedback.type}`}>
          {feedback.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* KPI Overview */}
      <div className="sc-kpi-grid">
        <div className="sc-kpi-card">
          <div className="sc-kpi-header">
            <span className="sc-kpi-title">Critical Items</span>
            <AlertTriangle style={{ color: '#f59e0b' }} size={20} />
          </div>
          <p className="sc-kpi-value sc-kpi-value-amber">{criticalCount}</p>
          <span className="sc-kpi-caption">At or below safety threshold</span>
        </div>

        <div className="sc-kpi-card">
          <div className="sc-kpi-header">
            <span className="sc-kpi-title">Stockout Risks</span>
            <TrendingDown style={{ color: '#f87171' }} size={20} />
          </div>
          <p className="sc-kpi-value sc-kpi-value-red">{criticalCount}</p>
          <span className="sc-kpi-caption">Requires immediate reorder</span>
        </div>

        <div className="sc-kpi-card">
          <div className="sc-kpi-header">
            <span className="sc-kpi-title">Total SKUs</span>
            <ShoppingCart style={{ color: '#60a5fa' }} size={20} />
          </div>
          <p className="sc-kpi-value sc-kpi-value-blue">{products.length}</p>
          <span className="sc-kpi-caption">Active database records</span>
        </div>
      </div>

      {/* Table Section */}
      <div className="sc-table-card">
        <div className="sc-table-header">
          <h2 className="sc-table-title">
            {filterCriticalOnly ? 'Critical Inventory' : 'Stock Overview'}
          </h2>
          {filterCriticalOnly && (
            <span className="sc-filter-tag">Filtered: Critical Only</span>
          )}
        </div>
        
        {loading ? (
          <div className="sc-state-loading">
            <Loader2 className="sc-spin" style={{ color: '#3b82f6' }} size={20} /> 
            <span>Loading inventory...</span>
          </div>
        ) : (
          <div className="sc-table-responsive">
            <table className="sc-table">
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Category</th>
                  <th>Current Stock</th>
                  <th>Safety Stock</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayedProducts.length > 0 ? (
                  displayedProducts.map((item) => (
                    <tr key={item.id}>
                      <td className="sc-cell-sku">{item.sku}</td>
                      <td className="sc-cell-category">{item.category}</td>
                      <td className="sc-cell-stock">{item.stock} units</td>
                      <td className="sc-cell-safety">{item.safetyStock} units</td>
                      <td>
                        <span className={`sc-badge ${item.isCritical ? 'sc-badge-critical' : 'sc-badge-healthy'}`}>
                          {item.isCritical ? 'CRITICAL' : 'HEALTHY'}
                        </span>
                      </td>
                      <td className="text-right">
                        {canReplenish && (
                          <button 
                            onClick={() => openReplenishModal(item)}
                            className="sc-btn-replenish"
                          >
                            Replenish
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="sc-state-empty">
                      No matching products found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Order Modal */}
      {orderModalOpen && selectedProduct && (
        <div className="sc-modal-overlay">
          <div className="sc-modal-card sc-modal-md">
            <div className="sc-modal-header">
              <h3 className="sc-modal-title">Create Purchase Order</h3>
              <button onClick={() => setOrderModalOpen(false)} className="sc-modal-close">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleConfirmOrder} className="sc-form">
              <div>
                <label className="sc-field-label">Target SKU</label>
                <input 
                  type="text" 
                  disabled 
                  value={selectedProduct.sku} 
                  className="sc-form-input sc-form-input-disabled"
                />
              </div>

              <div>
                <label className="sc-field-label">Order Quantity</label>
                <input 
                  type="number" 
                  min="1"
                  value={orderQty} 
                  onChange={(e) => setOrderQty(e.target.value)}
                  className="sc-form-input sc-form-input-active"
                  required
                />
              </div>

              <div className="sc-form-actions">
                <button 
                  type="button" 
                  onClick={() => setOrderModalOpen(false)}
                  className="sc-btn-cancel"
                >
                  Cancel
                </button>
                <button type="submit" className="sc-btn-submit">
                  Confirm Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}