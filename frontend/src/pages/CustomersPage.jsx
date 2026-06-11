import React, { useEffect, useState } from 'react';
import { getCustomers } from '../api';
import { Users, TrendingUp, ShoppingBag } from 'lucide-react';
import './CustomersPage.css';

function timeAgo(dateStr) {
  if (!dateStr) return 'Never';
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return `${days}d ago`;
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');

  useEffect(() => {
    getCustomers()
      .then(r => setCustomers(r.data.customers))
      .finally(() => setLoading(false));
  }, []);

  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.city.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase())
  );

  const totalSpend = customers.reduce((s, c) => s + parseFloat(c.total_spend || 0), 0);

  return (
    <div>
      <div className="page-header">
        <h1>Customers</h1>
        <p>All shoppers and their purchase behaviour</p>
      </div>

      <div className="customers-stats">
        <div className="stat-card card">
          <div className="stat-icon purple"><Users size={16} /></div>
          <div>
            <div className="stat-value">{customers.length}</div>
            <div className="stat-label">Total Customers</div>
          </div>
        </div>
        <div className="stat-card card">
          <div className="stat-icon green"><TrendingUp size={16} /></div>
          <div>
            <div className="stat-value">₹{Math.round(totalSpend).toLocaleString()}</div>
            <div className="stat-label">Total Revenue</div>
          </div>
        </div>
        <div className="stat-card card">
          <div className="stat-icon yellow"><ShoppingBag size={16} /></div>
          <div>
            <div className="stat-value">
              ₹{customers.length ? Math.round(totalSpend / customers.length).toLocaleString() : 0}
            </div>
            <div className="stat-label">Avg. Spend</div>
          </div>
        </div>
      </div>

      <div className="customers-table-wrap card">
        <div className="table-toolbar">
          <input
            className="table-search"
            placeholder="Search by name, city or email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <span className="table-count">{filtered.length} customers</span>
        </div>

        {loading ? (
          <div className="table-loading">Loading...</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>City</th>
                <th>Channel</th>
                <th>Tags</th>
                <th>Orders</th>
                <th>Total Spend</th>
                <th>Last Purchase</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id}>
                  <td>
                    <div className="customer-cell">
                      <div className="avatar">
                        {c.name.charAt(0)}
                      </div>
                      <div>
                        <div className="customer-name">{c.name}</div>
                        <div className="customer-email">{c.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>{c.city}</td>
                  <td>
                    <span className="badge badge-purple">{c.channel_preference}</span>
                  </td>
                  <td>
                    <div className="tags-cell">
                      {c.tags && c.tags.map(t => (
                        <span key={t} className="badge badge-grey">{t}</span>
                      ))}
                    </div>
                  </td>
                  <td>{c.total_orders}</td>
                  <td>₹{Math.round(parseFloat(c.total_spend)).toLocaleString()}</td>
                  <td>{timeAgo(c.last_purchase_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}