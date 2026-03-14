import React, { useState, useEffect } from 'react';
import { Shield, Bell, Database, Save, RefreshCw } from 'lucide-react';
import './SettingsView.css';

const API_BASE = import.meta.env.VITE_API_URL || '';

interface Settings {
  auto_scan: boolean;
  aggressive_mode: boolean;
  notifications: boolean;
  digest_reports: boolean;
  data_retention_days: number;
  confidence_threshold: number;
}

const SettingsView: React.FC = () => {
  const [settings, setSettings] = useState<Settings>({
    auto_scan: true,
    aggressive_mode: false,
    notifications: true,
    digest_reports: true,
    data_retention_days: 30,
    confidence_threshold: 0.85,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/settings`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setSettings(data);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Failed to load settings');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const res = await fetch(`${API_BASE}/api/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setSettings(data);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const toggle = (key: keyof Settings) =>
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));

  const thresholdPct = Math.round(settings.confidence_threshold * 100);

  return (
    <div className="view-container settings-view">

      {error && (
        <div style={{ padding: '0.85rem 1rem', background: 'rgba(220,53,69,0.1)', border: '1px solid var(--neon-red)', borderRadius: 12, color: 'var(--neon-red)', fontSize: '0.875rem' }}>
          ⚠ {error}
        </div>
      )}

      {loading ? (
        <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '3rem' }}>
          <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite' }} />
          <p style={{ marginTop: '1rem' }}>Loading settings…</p>
        </div>
      ) : (
        <>
          <div className="settings-grid">
            <div className="glass-panel settings-section">
              <div className="section-header">
                <Shield className="section-icon" />
                <h3>Detection Engine</h3>
              </div>

              <div className="setting-item">
                <div className="setting-info">
                  <h4>Auto-Scan on Upload</h4>
                  <p>Automatically begin deep scanning when media is dropped.</p>
                </div>
                <label className="switch">
                  <input type="checkbox" checked={settings.auto_scan} onChange={() => toggle('auto_scan')} />
                  <span className="slider"></span>
                </label>
              </div>

              <div className="setting-item">
                <div className="setting-info">
                  <h4>Aggressive Heuristics</h4>
                  <p>Increases sensitivity. May result in more false positives.</p>
                </div>
                <label className="switch">
                  <input type="checkbox" checked={settings.aggressive_mode} onChange={() => toggle('aggressive_mode')} />
                  <span className="slider"></span>
                </label>
              </div>

              <div className="setting-item">
                <div className="setting-info">
                  <h4>Confidence Threshold</h4>
                  <p>Minimum score required to flag media as synthetic.</p>
                </div>
                <div className="range-slider-container">
                  <input
                    type="range" min="50" max="99"
                    value={thresholdPct}
                    className="range-slider"
                    onChange={e => setSettings(prev => ({ ...prev, confidence_threshold: parseInt(e.target.value) / 100 }))}
                  />
                  <span className="range-value">{thresholdPct}%</span>
                </div>
              </div>
            </div>

            <div className="glass-panel settings-section">
              <div className="section-header">
                <Bell className="section-icon" />
                <h3>Alerts &amp; Notifications</h3>
              </div>

              <div className="setting-item">
                <div className="setting-info">
                  <h4>System Notifications</h4>
                  <p>Receive alerts for critical detections in the background.</p>
                </div>
                <label className="switch">
                  <input type="checkbox" checked={settings.notifications} onChange={() => toggle('notifications')} />
                  <span className="slider"></span>
                </label>
              </div>

              <div className="setting-item">
                <div className="setting-info">
                  <h4>Digest Reports</h4>
                  <p>Generate daily summary of all analyzed media.</p>
                </div>
                <label className="switch">
                  <input type="checkbox" checked={settings.digest_reports} onChange={() => toggle('digest_reports')} />
                  <span className="slider"></span>
                </label>
              </div>
            </div>

            <div className="glass-panel settings-section">
              <div className="section-header">
                <Database className="section-icon" />
                <h3>Data Management</h3>
              </div>

              <div className="setting-item">
                <div className="setting-info">
                  <h4>Data Retention</h4>
                  <p>How long scan logs are stored.</p>
                </div>
                <select
                  className="neon-select"
                  value={settings.data_retention_days}
                  onChange={e => setSettings(prev => ({ ...prev, data_retention_days: parseInt(e.target.value) }))}
                >
                  <option value={7}>7 Days</option>
                  <option value={30}>30 Days</option>
                  <option value={90}>90 Days</option>
                  <option value={-1}>Indefinitely</option>
                </select>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              className="reset-btn glass-panel-accent"
              style={{ minWidth: '180px', gap: '0.5rem' }}
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? (
                <><RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} /> Saving…</>
              ) : saved ? (
                '✓ Saved!'
              ) : (
                <><Save size={16} /> Save Settings</>
              )}
            </button>
          </div>
        </>
      )}

    </div>
  );
};

export default SettingsView;
