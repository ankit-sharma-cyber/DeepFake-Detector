import React, { useState, useRef, useCallback } from "react";
import {
  UploadCloud,
  FileVideo,
  FileAudio,
  Image as ImageIcon,
  ShieldAlert,
  ShieldCheck,
  ShieldQuestion,
  FileText,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import "./AnalysisView.css";

const API_BASE = import.meta.env.VITE_API_URL || "";

type ScanState = "IDLE" | "SCANNING" | "RESULTS" | "ERROR";

interface ProgressEvent {
  step: string;
  progress: number;
  message: string;
  scan_id?: string;
}

interface ScanDetails {
  fake_score?: number;
  real_score?: number;
  facial_artifacts?: string;
  manipulation_type?: string;
  raw_labels?: string[];
  frames_analyzed?: number;
  fake_frames?: number;
  mfcc_variance?: number;
  spectral_flatness?: number;
  [key: string]: unknown;
}

interface ScanResult {
  scan_id: string;
  filename: string;
  file_type: string;
  elapsed_seconds: number;
  verdict: "FAKE" | "REAL" | "UNKNOWN";
  confidence: number;
  is_fake: boolean;
  details: ScanDetails;
  // Image-specific
  model_a_score?: number | null;
  model_b_score?: number | null;
  // Video-specific
  frames_analyzed?: number;
  per_frame_scores?: number[];
  // Audio-specific
  mfcc_variance?: number | null;
  spectral_flatness?: number | null;
  // Gemini
  gemini_summary?: string | null;
  gemini_is_fallback?: boolean;
  model_used: string;
}

const AnalysisView: React.FC = () => {
  const [scanState, setScanState] = useState<ScanState>("IDLE");
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState("");
  const [logLines, setLogLines] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [frameChartOpen, setFrameChartOpen] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const appendLog = useCallback((msg: string) => {
    setLogLines((prev) => [...prev.slice(-20), msg]);
  }, []);

  const startScan = useCallback(
    async (file: File) => {
      setSelectedFile(file);
      setScanState("SCANNING");
      setProgress(0);
      setLogLines([]);
      setProgressMessage("Connecting to detection engine...");
      setResult(null);
      setErrorMsg("");
      setFrameChartOpen(false);

      setTimeout(() => {
        setProgress(5);
        setProgressMessage("Uploading file to server...");
      }, 100);

      const formData = new FormData();
      formData.append("file", file);
      let gotResult = false;

      const handleBlock = (part: string) => {
        const lines = part.trim().split("\n");
        let eventType = "message";
        let dataStr = "";
        for (const line of lines) {
          if (line.startsWith("event: ")) eventType = line.slice(7).trim();
          else if (line.startsWith("data: ")) dataStr = line.slice(6).trim();
        }
        if (!dataStr) return;
        try {
          const parsed = JSON.parse(dataStr) as Record<string, unknown>;
          if (eventType === "progress") {
            const ev = parsed as unknown as ProgressEvent;
            setProgress(ev.progress);
            setProgressMessage(ev.message);
            appendLog(`> [${ev.step.toUpperCase()}] ${ev.message}`);
          } else if (eventType === "result") {
            gotResult = true;
            setResult(parsed as unknown as ScanResult);
            setScanState("RESULTS");
          } else if (eventType === "error") {
            gotResult = true;
            setErrorMsg((parsed.error as string) || "Unknown error from server.");
            setScanState("ERROR");
          }
        } catch {
          // ignore malformed chunk
        }
      };

      try {
        const response = await fetch(`${API_BASE}/api/scan/stream`, {
          method: "POST",
          body: formData,
        });

        if (!response.ok || !response.body) {
          const errorText = await response.text();
          throw new Error(`Server error ${response.status}: ${errorText}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (value) buffer += decoder.decode(value, { stream: !done });

          let boundary = buffer.indexOf("\n\n");
          while (boundary !== -1) {
            const part = buffer.slice(0, boundary);
            buffer = buffer.slice(boundary + 2);
            if (part.trim()) handleBlock(part);
            boundary = buffer.indexOf("\n\n");
          }

          if (done) {
            if (buffer.trim()) handleBlock(buffer);
            break;
          }
        }

        if (!gotResult) {
          setScanState("ERROR");
          setErrorMsg("Scan ended without a result. Please try again.");
        }
      } catch (err: unknown) {
        setErrorMsg(err instanceof Error ? err.message : String(err));
        setScanState("ERROR");
      }
    },
    [appendLog],
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) startScan(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) startScan(file);
  };

  const handleReset = () => {
    setScanState("IDLE");
    setProgress(0);
    setSelectedFile(null);
    setResult(null);
    setErrorMsg("");
    setLogLines([]);
    setFrameChartOpen(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const getFileIcon = (size = 64) => {
    const cls = "media-icon pulse";
    if (!selectedFile) return <FileVideo size={size} className={cls} />;
    if (selectedFile.type.startsWith("audio/"))
      return <FileAudio size={size} className={cls} />;
    if (selectedFile.type.startsWith("image/"))
      return <ImageIcon size={size} className={cls} />;
    return <FileVideo size={size} className={cls} />;
  };

  const verdictColors: Record<string, string> = {
    FAKE: "verdict-fake",
    REAL: "verdict-real",
    UNKNOWN: "verdict-unknown",
  };

  const fmtPct = (v: number | null | undefined): string => {
    if (typeof v === "number") return `${(v * 100).toFixed(1)}%`;
    return "N/A";
  };

  /* ── Confidence Meter (SVG arc) ────────────────────────────────────────── */
  const ConfidenceMeter = ({ pct, verdict }: { pct: number; verdict: string }) => {
    const r = 52;
    const circ = 2 * Math.PI * r;
    const stroke = circ * (1 - pct / 100);
    const color =
      verdict === "FAKE"
        ? "var(--neon-red)"
        : verdict === "REAL"
          ? "var(--neon-green)"
          : "var(--neon-amber)";
    return (
      <div className="confidence-meter">
        <svg width="140" height="140" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r={r} fill="none" stroke="var(--border-card)" strokeWidth="8" />
          <circle
            cx="60" cy="60" r={r} fill="none"
            stroke={color} strokeWidth="8"
            strokeDasharray={circ} strokeDashoffset={stroke}
            strokeLinecap="round"
            transform="rotate(-90 60 60)"
            style={{ filter: `drop-shadow(0 0 6px ${color})`, transition: "stroke-dashoffset 1s ease" }}
          />
          <text x="60" y="55" textAnchor="middle" fill="var(--text-primary)" fontSize="18" fontWeight="700" fontFamily="var(--font-mono)">
            {pct.toFixed(1)}%
          </text>
          <text x="60" y="72" textAnchor="middle" fill={color} fontSize="9" fontWeight="600" letterSpacing="1">
            CONFIDENCE
          </text>
        </svg>
      </div>
    );
  };

  /* ── Model Score Badges (image) ────────────────────────────────────────── */
  const ModelScoreBadges = ({ a, b }: { a: number | null | undefined; b: number | null | undefined }) => (
    <div className="model-score-badges">
      <span className="model-badge" title="dima806/deepfake_vs_real_image_detection">
        <span className="badge-label">Model A</span>
        <span className="badge-value">{fmtPct(a)}</span>
      </span>
      <span className="model-badge" title="prithivMLmods/Deep-Fake-Detector-Model">
        <span className="badge-label">Model B</span>
        <span className="badge-value">{fmtPct(b)}</span>
      </span>
    </div>
  );

  /* ── Frame Bar Chart (video) ───────────────────────────────────────────── */
  const FrameBarChart = ({ scores }: { scores: number[] }) => {
    if (!scores || scores.length === 0) return null;
    return (
      <div className="frame-chart">
        {scores.map((s, i) => {
          const pct = Math.round(s * 100);
          const isFake = s >= 0.5;
          return (
            <div key={i} className="frame-bar-col" title={`Frame ${i + 1}: ${pct}% fake`}>
              <div
                className="frame-bar-fill"
                style={{
                  height: `${Math.max(4, pct)}%`,
                  background: isFake ? "var(--neon-red)" : "var(--neon-green)",
                  boxShadow: isFake ? "0 0 6px var(--neon-red)" : "0 0 6px var(--neon-green)",
                }}
              />
              <span className="frame-bar-label">{i + 1}</span>
            </div>
          );
        })}
      </div>
    );
  };

  /* ── Audio Stat Pills ──────────────────────────────────────────────────── */
  const AudioStatPills = ({
    mfccVariance,
    spectralFlatness,
  }: {
    mfccVariance: number | null | undefined;
    spectralFlatness: number | null | undefined;
  }) => (
    <div className="audio-stat-pills">
      <div className="stat-pill">
        <span className="pill-label">MFCC Variance</span>
        <span
          className={`pill-value ${typeof mfccVariance === "number" && mfccVariance < 0.15 ? "pill-danger" : "pill-ok"}`}
        >
          {typeof mfccVariance === "number" ? mfccVariance.toFixed(5) : "N/A"}
        </span>
      </div>
      <div className="stat-pill">
        <span className="pill-label">Spectral Flatness</span>
        <span
          className={`pill-value ${typeof spectralFlatness === "number" && spectralFlatness > 0.4 ? "pill-danger" : "pill-ok"}`}
        >
          {typeof spectralFlatness === "number" ? spectralFlatness.toFixed(5) : "N/A"}
        </span>
      </div>
    </div>
  );

  /* ── Gemini Summary ────────────────────────────────────────────────────── */
  const GeminiSummaryBlock = ({
    summary,
    isFallback,
  }: {
    summary: string;
    isFallback: boolean;
  }) => (
    <div className={`gemini-summary-block${isFallback ? " gemini-fallback" : ""}`}>
      <div className="gemini-summary-header">
        <span className="gemini-icon">🤖</span>
        <span className="gemini-summary-title">AI Forensic Summary</span>
        {isFallback && <span className="gemini-fallback-tag">fallback</span>}
      </div>
      <p className={`gemini-summary-text${isFallback ? " muted" : ""}`}>{summary}</p>
    </div>
  );

  /* ── Detail rows ───────────────────────────────────────────────────────── */
  const renderDetailRows = () => {
    if (!result) return null;
    const d = result.details;
    const rows: { label: string; value: string; cls?: string }[] = [];

    if (result.file_type === "image") {
      rows.push({
        label: "Facial Artifacts",
        value: String(d.facial_artifacts ?? "N/A"),
        cls:
          d.facial_artifacts === "High"
            ? "critical"
            : d.facial_artifacts === "Medium"
              ? "warning"
              : "safe",
      });
      rows.push({ label: "Manipulation Type", value: String(d.manipulation_type ?? "N/A") });
      rows.push({ label: "Fake Score", value: fmtPct(d.fake_score) });
      rows.push({ label: "Real Score", value: fmtPct(d.real_score) });
    } else if (result.file_type === "video") {
      rows.push({ label: "Frames Analyzed", value: String(result.frames_analyzed ?? d.frames_analyzed ?? "N/A") });
      rows.push({
        label: "Fake Frames",
        value: `${d.fake_frames ?? 0} / ${result.frames_analyzed ?? d.frames_analyzed ?? 0}`,
        cls: (d.fake_frames ?? 0) > 0 ? "critical" : "safe",
      });
      rows.push({ label: "Weighted Fake Score", value: fmtPct(d.fake_score) });
      rows.push({
        label: "Facial Artifacts",
        value: String(d.facial_artifacts ?? "N/A"),
        cls:
          d.facial_artifacts === "High"
            ? "critical"
            : d.facial_artifacts === "Medium"
              ? "warning"
              : "safe",
      });
    } else if (result.file_type === "audio") {
      rows.push({ label: "Manipulation Type", value: String(d.manipulation_type ?? "N/A") });
      rows.push({ label: "Fake Score", value: fmtPct(d.fake_score) });
    }

    rows.push({ label: "Model Used", value: result.model_used });
    rows.push({ label: "Analysis Time", value: `${result.elapsed_seconds}s` });

    return rows.map(({ label, value, cls }) => (
      <div key={label} className="detail-row">
        <span className="detail-label">{label}</span>
        <span className={`detail-value ${cls ?? ""}`}>{value}</span>
      </div>
    ));
  };

  return (
    <div className="view-container analysis-view">
      {/* ── IDLE ──────────────────────────────────────────────────────────── */}
      {scanState === "IDLE" && (
        <div
          className={`glass-panel upload-zone${isDragOver ? " drag-over" : ""}`}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
        >
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: "none" }}
            onChange={handleFileChange}
            accept="video/*,audio/*,image/*"
          />
          <div className="upload-icon-wrapper">
            <UploadCloud size={48} className="upload-icon pulse-gentle" />
          </div>
          <h3>Initialize Deep Scan</h3>
          <p>Drag &amp; drop video, audio, or image files here, or click to browse.</p>
          <div className="upload-formats">Supported: MP4, AVI, MOV, WAV, MP3, JPG, PNG, WEBP</div>
        </div>
      )}

      {/* ── SCANNING ──────────────────────────────────────────────────────── */}
      {scanState === "SCANNING" && (
        <div className="glass-panel scan-container active-scan">
          <div className="scan-media placeholder-media scanline-effect">
            {getFileIcon(64)}
            <div className="scanning-overlay">
              <span className="scanning-text pulse">
                ANALYZING {selectedFile ? selectedFile.name.toUpperCase() : "MEDIA"}...
              </span>
            </div>
            <div className="cyber-scanner-line"></div>
          </div>
          <div className="progress-section">
            <div className="progress-header">
              <span>DEEP LEARNING MODEL ANALYSIS</span>
              <span className="progress-value">{Math.min(Math.round(progress), 100)}%</span>
            </div>
            <div className="progress-bar-bg">
              <div className="progress-bar-fill" style={{ width: `${Math.min(progress, 100)}%` }} />
            </div>
            <div className="scan-logs terminal-style">
              <span className="terminal-prefix">system@oracle:~$</span> init_scan_sequence
              {logLines.map((line, i) => (
                <p key={i} className="log-visible">{line}</p>
              ))}
              {progressMessage && (
                <p className="log-visible log-current">▌ {progressMessage}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── RESULTS ───────────────────────────────────────────────────────── */}
      {scanState === "RESULTS" && result && (
        <div className="results-grid">
          {/* Media preview */}
          <div className="glass-panel media-preview">
            <div className="preview-placeholder">
              {getFileIcon(48)}
              {result.is_fake && (
                <div className="bounding-box face-box pulse-red">
                  <span className="box-label">ANOMALY</span>
                </div>
              )}
            </div>
            <div className="file-info-bar">
              <FileText size={16} />
              <span>{result.filename}</span>
              <span style={{ marginLeft: "auto", opacity: 0.5 }}>
                {selectedFile ? (selectedFile.size / 1024 / 1024).toFixed(2) + " MB" : ""}
              </span>
            </div>
          </div>

          {/* Result card */}
          <div
            className={`glass-panel scan-results ${
              result.is_fake ? "high-alert" : result.verdict === "REAL" ? "safe-result" : "unknown-result"
            }`}
          >
            {/* Verdict header */}
            <div className="result-header">
              {result.verdict === "FAKE" && <ShieldAlert size={32} className="alert-icon pulse-red-icon" />}
              {result.verdict === "REAL" && <ShieldCheck size={32} className="safe-icon" />}
              {result.verdict === "UNKNOWN" && <ShieldQuestion size={32} className="unknown-icon" />}
              <div>
                <h2 className={`verdict-text ${verdictColors[result.verdict] ?? ""}`}>
                  {result.verdict === "FAKE"
                    ? "SYNTHETIC MEDIA DETECTED"
                    : result.verdict === "REAL"
                      ? "AUTHENTIC MEDIA"
                      : "INCONCLUSIVE"}
                </h2>
                <span className="scan-id">ID: {result.scan_id}</span>
              </div>
            </div>

            {/* Confidence meter */}
            <ConfidenceMeter pct={result.confidence * 100} verdict={result.verdict} />

            {/* Model score badges — image only */}
            {result.file_type === "image" && (
              <ModelScoreBadges a={result.model_a_score} b={result.model_b_score} />
            )}

            {/* Audio stat pills — audio only */}
            {result.file_type === "audio" && (
              <AudioStatPills
                mfccVariance={result.mfcc_variance}
                spectralFlatness={result.spectral_flatness}
              />
            )}

            {/* Detail rows */}
            <div className="analysis-details">{renderDetailRows()}</div>

            {/* Frame Analysis collapsible — video only */}
            {result.file_type === "video" &&
              Array.isArray(result.per_frame_scores) &&
              result.per_frame_scores.length > 0 && (
                <div className="frame-analysis-section">
                  <button
                    className="gemini-toggle"
                    onClick={() => setFrameChartOpen((o) => !o)}
                  >
                    <span>📊 Frame Analysis</span>
                    <span style={{ fontSize: "0.8rem", opacity: 0.7, marginLeft: "auto" }}>
                      {result.per_frame_scores.length} frames
                    </span>
                    {frameChartOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                  {frameChartOpen && (
                    <div className="gemini-body">
                      <p style={{ fontSize: "0.78rem", opacity: 0.6, marginBottom: "0.75rem" }}>
                        Bar height = fake confidence per frame. Red = classified fake, Green = classified real.
                      </p>
                      <FrameBarChart scores={result.per_frame_scores} />
                    </div>
                  )}
                </div>
              )}

            {/* Gemini forensic summary */}
            {result.gemini_summary && (
              <GeminiSummaryBlock
                summary={result.gemini_summary}
                isFallback={result.gemini_is_fallback ?? false}
              />
            )}

            <button className="reset-btn glass-panel-accent" onClick={handleReset}>
              <RefreshCw size={16} style={{ marginRight: "0.5rem" }} />
              Scan Another File
            </button>
          </div>
        </div>
      )}

      {/* ── ERROR ─────────────────────────────────────────────────────────── */}
      {scanState === "ERROR" && (
        <div className="glass-panel error-panel">
          <AlertTriangle size={40} className="error-icon" />
          <h3>Scan Failed</h3>
          <p className="error-msg">{errorMsg}</p>
          <button
            className="reset-btn glass-panel-accent"
            onClick={handleReset}
            style={{ marginTop: "1.5rem" }}
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
};

export default AnalysisView;
