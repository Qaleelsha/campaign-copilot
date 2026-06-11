import React, { useEffect, useState } from 'react';
import { getCampaigns, getCampaign } from '../api';
import { Megaphone, ChevronRight, BarChart2, Send, CheckCircle, MousePointer, XCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import './CampaignsPage.css';

function StatusBadge({ status }) {
  const map = {
    completed: 'badge-green',
    running:   'badge-yellow',
    draft:     'badge-grey',
    failed:    'badge-red',
  };
  return <span className={`badge ${map[status] || 'badge-grey'}`}>{status}</span>;
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns]   = useState([]);
  const [selected, setSelected]     = useState(null);
  const [detail, setDetail]         = useState(null);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    getCampaigns()
      .then(r => setCampaigns(r.data.campaigns))
      .finally(() => setLoading(false));
  }, []);

  // poll selected campaign every 3 seconds for live updates
  useEffect(() => {
    if (!selected) return;
    const load = () => getCampaign(selected).then(r => setDetail(r.data));
    load();
    const interval = setInterval(load, 3000);
    return () => clearInterval(interval);
  }, [selected]);

  const chartData = detail ? [
    { name: 'Sent',      value: detail.campaign.total_sent,      color: '#6c63ff' },
    { name: 'Delivered', value: detail.campaign.total_delivered, color: '#22c55e' },
    { name: 'Opened',    value: detail.campaign.total_opened,    color: '#f59e0b' },
    { name: 'Clicked',   value: detail.campaign.total_clicked,   color: '#3b82f6' },
    { name: 'Failed',    value: detail.campaign.total_failed,    color: '#ef4444' },
  ] : [];

  return (
    <div>
      <div className="page-header">
        <h1>Campaigns</h1>
        <p>All campaigns and their live performance</p>
      </div>

      <div className="campaigns-layout">
        <div className="campaigns-list card">
          {loading && <div className="list-loading">Loading...</div>}
          {!loading && campaigns.length === 0 && (
            <div className="list-empty">
              <Megaphone size={24} color="var(--text-muted)" />
              <p>No campaigns yet. Launch one from Campaign Copilot.</p>
            </div>
          )}
          {campaigns.map(c => (
            <div
              key={c.id}
              className={`campaign-row ${selected === c.id ? 'active' : ''}`}
              onClick={() => setSelected(c.id)}
            >
              <div className="campaign-row-main">
                <div className="campaign-row-name">{c.name}</div>
                <div className="campaign-row-meta">
                  <span>{c.segment_name}</span>
                  <span>·</span>
                  <span className="badge badge-purple">{c.channel}</span>
                  <StatusBadge status={c.status} />
                </div>
              </div>
              <div className="campaign-row-stats">
                <span>{c.total_sent} sent</span>
                <ChevronRight size={14} color="var(--text-muted)" />
              </div>
            </div>
          ))}
        </div>

        <div className="campaign-detail">
          {!selected && (
            <div className="detail-empty card">
              <BarChart2 size={28} color="var(--text-muted)" />
              <p>Select a campaign to see live performance</p>
            </div>
          )}

          {selected && detail && (
            <div className="detail-inner">
              <div className="detail-header card">
                <div>
                  <h2>{detail.campaign.name}</h2>
                  <div className="detail-meta">
                    <span>{detail.campaign.segment_name}</span>
                    <span>·</span>
                    <span className="badge badge-purple">{detail.campaign.channel}</span>
                    <StatusBadge status={detail.campaign.status} />
                  </div>
                </div>
              </div>

              <div className="detail-stats">
                {[
                  { icon: Send,         label: 'Sent',      val: detail.campaign.total_sent,      cls: 'purple' },
                  { icon: CheckCircle,  label: 'Delivered', val: detail.campaign.total_delivered, cls: 'green'  },
                  { icon: MousePointer, label: 'Opened',    val: detail.campaign.total_opened,    cls: 'yellow' },
                  { icon: XCircle,      label: 'Failed',    val: detail.campaign.total_failed,    cls: 'red'    },
                ].map(({ icon: Icon, label, val, cls }) => (
                  <div key={label} className="detail-stat card">
                    <div className={`stat-icon ${cls}`}><Icon size={15} /></div>
                    <div className="stat-value">{val}</div>
                    <div className="stat-label">{label}</div>
                  </div>
                ))}
              </div>

              <div className="detail-chart card">
                <div className="chart-title">Delivery Funnel</div>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={chartData} barSize={36}>
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                    <YAxis hide />
                    <Tooltip
                      contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid var(--border)' }}
                      cursor={{ fill: 'var(--surface-3)' }}
                    />
                    <Bar dataKey="value" radius={[6,6,0,0]}>
                      {chartData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="detail-message card">
                <div className="chart-title">Message Template</div>
                <p className="message-preview">"{detail.campaign.message_template}"</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}