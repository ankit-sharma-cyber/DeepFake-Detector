import React, { useEffect, useState } from 'react';
import { Activity, ShieldAlert, Cpu, Database, AlertTriangle, ArrowRight, RefreshCw } from 'lucide-react';
import './DashboardView.css';

const API_BASE = import.meta.env.VITE_API_URL || '';

interface StatsData {
  total_scans: number;
  deepfakes_found: number;
  processing_queue: number;
  model_accuracy: number;
  recent_scans: RecentScan[];
}

interface RecentScan {
  scan_id: string;
  filename: string;
  file_type: string;
  status: string;
  confidence: number;
  verdict: string;
  time_ago: string;
}

const DashboardView: React.FC = () => {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchStats = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/stats`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setStats(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load stats');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStats(); }, []);

  const fmtPct = (v: number) => `${(v * 100).toFixed(1)}%`;
  const verdictStatus = (s: string) => {
    if (s === 'CRITICAL' || s === 'WARNING') return 'critical';
    if (s === 'SAFE') return 'safe';
    return 'warning';
  };

  return (
    <div className="view-container">

      <div className="elegant-hero">
        <div className="hero-content">
          <div className="hero-badge">Enterprise Engine v2.0</div>
          <h1 className="hero-title">Uncover the <span className="hero-highlight">Truth</span> in Digital Media</h1>
          <p className="hero-subtitle">
            Advanced cryptographic and heuristic analysis for deepfake detection, voice cloning identification, and synthetic media verification.
          </p>
          <div className="hero-actions">
            <button className="hero-btn primary">
              Initialize Scan <ArrowRight size={18} />
            </button>
            <button className="hero-btn secondary" onClick={fetchStats} disabled={loading}>
              {loading ? 'Refreshing…' : <><RefreshCw size={16} /> Refresh</>}
            </button>
          </div>
        </div>
        <div className="hero-graphic">
          <div className="graphic-circle outer"></div>
          <div className="graphic-circle inner"></div>
          <ShieldAlert size={80} className="hero-shield-icon" />
        </div>
      </div>

      {error && (
        <div style={{ padding: '1rem', background: 'rgba(220,53,69,0.1)', border: '1px solid var(--neon-red)', borderRadius: 12, color: 'var(--neon-red)', fontSize: '0.875rem' }}>
          ⚠ Could not reach backend: {error}. Make sure the Flask server is running on port 5000.
        </div>
      )}

      <div className="dashboard-grid">
        <div className="glass-panel metric-card glass-panel-accent">
          <div className="metric-header">
            <Activity className="metric-icon" />
            <h3>Total Scans</h3>
          </div>
          <div className="metric-value">{loading ? '…' : (stats?.total_scans ?? 0).toLocaleString()}</div>
          <div className="metric-trend neutral">All time</div>
        </div>

        <div className="glass-panel metric-card">
          <div className="metric-header">
            <ShieldAlert className="metric-icon alert-icon" />
            <h3>Deepfakes Found</h3>
          </div>
          <div className="metric-value alert-text">{loading ? '…' : (stats?.deepfakes_found ?? 0).toLocaleString()}</div>
          <div className="metric-trend negative">
            {stats && stats.total_scans > 0
              ? `${((stats.deepfakes_found / stats.total_scans) * 100).toFixed(1)}% detection rate`
              : 'No data yet'}
          </div>
        </div>

        <div className="glass-panel metric-card">
          <div className="metric-header">
            <Cpu className="metric-icon" />
            <h3>Processing Queue</h3>
          </div>
          <div className="metric-value">{loading ? '…' : (stats?.processing_queue ?? 0)}</div>
          <div className="metric-trend neutral">{stats?.processing_queue === 0 ? 'Idle' : 'Active'}</div>
        </div>

        <div className="glass-panel metric-card">
          <div className="metric-header">
            <Database className="metric-icon" />
            <h3>Model Accuracy</h3>
          </div>
          <div className="metric-value">{loading ? '…' : fmtPct(stats?.model_accuracy ?? 0.994)}</div>
          <div className="metric-trend positive">Stable</div>
        </div>
      </div>

      <div className="glass-panel recent-activity">
        <h3 className="section-title">Recent Detections</h3>
        {loading && <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Loading…</p>}
        {!loading && (!stats?.recent_scans || stats.recent_scans.length === 0) && (
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            No scans yet. Upload a file from the Analysis tab to get started.
          </p>
        )}
        {!loading && (stats?.recent_scans ?? []).length > 0 && (
          <div className="activity-list">
            {stats!.recent_scans.map(scan => (
              <div key={scan.scan_id} className="activity-row">
                <div className="activity-cell scan-id">{scan.scan_id}</div>
                <div className="activity-cell scan-target" title={scan.filename}>
                  {scan.filename.length > 30 ? scan.filename.slice(0, 28) + '…' : scan.filename}
                </div>
                <div className="activity-cell scan-status">
                  <span className={`status-badge status-${verdictStatus(scan.status)}`}>
                    {scan.status === 'CRITICAL' && <AlertTriangle size={12} />}
                    {scan.status}
                  </span>
                </div>
                <div className="activity-cell scan-confidence">
                  {scan.confidence ? fmtPct(scan.confidence) : '—'}
                </div>
                <div className="activity-cell scan-time">{scan.time_ago}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardView;
