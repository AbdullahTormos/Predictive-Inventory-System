import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Trash2, 
  UserPlus, 
  Loader2, 
  CheckSquare, 
  Square, 
  Search, 
  AlertCircle,
  Pencil,
  X,
  Save,
  KeyRound
} from 'lucide-react';
import '../styles/UserManagement.css';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Selection State for Bulk Actions
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Create User Form State
  const [form, setForm] = useState({ 
    username: '', 
    email: '', 
    password: '', 
    role: 'LOGISTICS_ADMIN' 
  });

  // Edit User Form State
  const [editingUser, setEditingUser] = useState(null);

  // --- Fetch Users ---
  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('http://localhost:5000/api/admin/users');
      if (!res.ok) throw new Error('Failed to fetch users');
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : (data.users || []));
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // --- Handlers ---
  const handleCreate = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      if (!res.ok) throw new Error('Failed to create account');
      setForm({ username: '', email: '', password: '', role: 'LOGISTICS_ADMIN' });
      await fetchUsers();
    } catch (err) {
      alert(`Failed to create user: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartEdit = (userToEdit) => {
    setEditingUser({
      id: userToEdit.id,
      username: userToEdit.username || '',
      email: userToEdit.email || '',
      password: '',
      role: userToEdit.role || 'LOGISTICS_ADMIN'
    });
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingUser) return;
    setActionLoading(true);

    const payload = {
      username: editingUser.username,
      email: editingUser.email,
      role: editingUser.role,
    };
    if (editingUser.password.trim() !== '') {
      payload.password = editingUser.password;
    }

    try {
      const res = await fetch(`http://localhost:5000/api/admin/users/${editingUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Failed to update account details');

      setUsers(prev => prev.map(u => u.id === editingUser.id ? { ...u, ...payload } : u));
      setEditingUser(null);
    } catch (err) {
      alert(`Failed to update user: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteSingle = async (id) => {
    if (!window.confirm('Are you sure you want to delete this account?')) return;
    try {
      const res = await fetch(`http://localhost:5000/api/admin/users/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setUsers(prev => prev.filter(u => u.id !== id));
        setSelectedUserIds(prev => prev.filter(selectedId => selectedId !== id));
      }
    } catch (err) {
      alert(`Failed to delete user: ${err.message}`);
    }
  };

  // --- Bulk & Selection Handlers ---
  const filteredUsers = users.filter(u => 
    u.username?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.role?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelectAll = () => {
    if (selectedUserIds.length === filteredUsers.length) {
      setSelectedUserIds([]);
    } else {
      setSelectedUserIds(filteredUsers.map(u => u.id));
    }
  };

  const handleToggleSelect = (id) => {
    setSelectedUserIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = async () => {
    if (!selectedUserIds.length) return;
    if (!window.confirm(`Delete ${selectedUserIds.length} selected accounts?`)) return;

    setActionLoading(true);
    try {
      await Promise.all(
        selectedUserIds.map(id => fetch(`http://localhost:5000/api/admin/users/${id}`, { method: 'DELETE' }))
      );
      setUsers(prev => prev.filter(u => !selectedUserIds.includes(u.id)));
      setSelectedUserIds([]);
    } catch (err) {
      alert(`Bulk action error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="um-container">
      {/* Header */}
      <header className="um-header">
        <div>
          <h1 className="um-title">
            <Users className="um-title-icon" /> User Management
          </h1>
          <p className="um-subtitle">Manage accounts, change user credentials/roles, and run bulk actions</p>
        </div>
      </header>

      {/* Error Banner */}
      {error && (
        <div className="um-error-banner">
          <AlertCircle size={18} />
          <span><strong>Error:</strong> {error}</span>
        </div>
      )}

      {/* Create User Form */}
      <form onSubmit={handleCreate} className="um-card-form">
        <input 
          type="text" placeholder="Username" required
          value={form.username} onChange={e => setForm({...form, username: e.target.value})}
          className="um-input um-input-username"
        />
        <input 
          type="email" placeholder="Email" required
          value={form.email} onChange={e => setForm({...form, email: e.target.value})}
          className="um-input um-input-email"
        />
        <input 
          type="password" placeholder="Password" required
          value={form.password} onChange={e => setForm({...form, password: e.target.value})}
          className="um-input um-input-password"
        />
        
        <select 
          value={form.role} onChange={e => setForm({...form, role: e.target.value})}
          className="um-select"
        >
          <option value="LOGISTICS_ADMIN">Logistics Admin</option>
          <option value="ADMIN">Admin</option>
        </select>

        <button type="submit" disabled={actionLoading} className="um-btn-primary">
          {actionLoading ? <Loader2 className="spin" size={16} /> : <UserPlus size={16} />} 
          Add Account
        </button>
      </form>

      {/* Control Bar */}
      <div className="um-control-bar">
        <div className="um-search-wrapper">
          <Search size={16} className="um-search-icon" />
          <input 
            type="text" 
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="um-search-input"
          />
        </div>

        {selectedUserIds.length > 0 && (
          <div className="um-bulk-actions">
            <span className="um-selected-count">
              {selectedUserIds.length} Selected
            </span>
            <button onClick={handleBulkDelete} disabled={actionLoading} className="um-btn-danger-subtle">
              <Trash2 size={13} /> Delete Selected
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="um-table-container">
        {loading ? (
          <div className="um-loading-state">
            <Loader2 className="spin um-spinner" /> Loading users...
          </div>
        ) : (
          <div className="um-table-scroll">
            <table className="um-table">
              <thead>
                <tr className="um-table-header">
                  <th className="um-th um-th-checkbox">
                    <button onClick={handleSelectAll} className="um-icon-btn">
                      {selectedUserIds.length > 0 && selectedUserIds.length === filteredUsers.length ? (
                        <CheckSquare size={18} className="um-checkbox-active" />
                      ) : (
                        <Square size={18} />
                      )}
                    </button>
                  </th>
                  <th className="um-th">ID</th>
                  <th className="um-th">Username</th>
                  <th className="um-th">Email</th>
                  <th className="um-th">Role</th>
                  <th className="um-th um-th-actions">Actions</th>
                </tr>
              </thead>
              <tbody className="um-table-body">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="um-empty-state">
                      No matching users found.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map(u => {
                    const isSelected = selectedUserIds.includes(u.id);
                    return (
                      <tr key={u.id} className={isSelected ? 'um-tr-selected' : ''}>
                        <td className="um-td">
                          <button onClick={() => handleToggleSelect(u.id)} className="um-icon-btn">
                            {isSelected ? <CheckSquare size={18} className="um-checkbox-active" /> : <Square size={18} />}
                          </button>
                        </td>
                        <td className="um-td um-td-id">#{u.id}</td>
                        <td className="um-td um-td-username">{u.username}</td>
                        <td className="um-td um-td-email">{u.email}</td>
                        <td className="um-td um-td-role">{u.role}</td>
                        <td className="um-td">
                          <div className="um-td-actions">
                            <button 
                              onClick={() => handleStartEdit(u)} 
                              title="Edit User Details"
                              className="um-action-btn um-action-edit"
                            >
                              <Pencil size={16} />
                            </button>
                            <button 
                              onClick={() => handleDeleteSingle(u.id)} 
                              title="Delete User"
                              className="um-action-btn um-action-delete"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingUser && (
        <div className="um-modal-overlay">
          <div className="um-modal-card">
            <button onClick={() => setEditingUser(null)} className="um-modal-close">
              <X size={20} />
            </button>

            <h2 className="um-modal-title">
              <Pencil size={18} className="um-title-icon" /> Edit User #{editingUser.id}
            </h2>

            <form onSubmit={handleSaveEdit} className="um-modal-form">
              <div className="um-form-group">
                <label className="um-label">Username</label>
                <input 
                  type="text" 
                  required
                  value={editingUser.username}
                  onChange={(e) => setEditingUser({ ...editingUser, username: e.target.value })}
                  className="um-modal-input"
                />
              </div>

              <div className="um-form-group">
                <label className="um-label">Email Address</label>
                <input 
                  type="email" 
                  required
                  value={editingUser.email}
                  onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                  className="um-modal-input"
                />
              </div>

              <div className="um-form-group">
                <label className="um-label um-label-split">
                  <span>New Password</span>
                  <span className="um-label-sub">(Leave blank to keep unchanged)</span>
                </label>
                <div className="um-password-wrapper">
                  <input 
                    type="password" 
                    placeholder="••••••••"
                    value={editingUser.password}
                    onChange={(e) => setEditingUser({ ...editingUser, password: e.target.value })}
                    className="um-modal-input um-password-input"
                  />
                  <KeyRound size={15} className="um-password-icon" />
                </div>
              </div>

              <div className="um-form-group">
                <label className="um-label">Role</label>
                <select 
                  value={editingUser.role}
                  onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                  className="um-select"
                >
                  <option value="LOGISTICS_ADMIN">Logistics Admin</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>

              <div className="um-modal-actions">
                <button 
                  type="button" 
                  onClick={() => setEditingUser(null)}
                  className="um-btn-cancel"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={actionLoading}
                  className="um-btn-save"
                >
                  {actionLoading ? <Loader2 className="spin" size={14} /> : <Save size={14} />} Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}