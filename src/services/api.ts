/**
 * DeepCheck API Service
 * Connects the React frontend to the Flask backend.
 */

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ScanProgress {
  step: string;
  progress: number;
  message: string;
  scan_id?: string;
}

export interface GeminiReport {
  summary: string;
  risk_level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | "UNKNOWN";
  explanation: string;
  manipulation_indicators: string[];
  recommended_actions: string[];
  model: string;
  visual_observations?: string;
  temporal_analysis?: string;
  audio_analysis?: string;
}

export interface ScanDetails {
  // Image / Video
  fake_score?: number;
  real_score?: number;
  facial_artifacts?: string;
  manipulation_type?: string;
  raw_labels?: Array<{ label: string; score: number }>;
  // Video specific
  frames_analyzed?: number;
  fake_frames?: number;
  mean_fake_score?: number;
  max_fake_score?: number;
  per_frame_scores?: number[];
  temporal_inconsistency?: boolean;
  // Audio specific
  voice_cloning?: boolean;
  audio_sync_issue?: boolean;
  synthesis_type?: string;
  spectrogram_anomaly?: string;
}

export interface ScanResult {
  scan_id: string;
  filename: string;
  file_type: "image" | "video" | "audio";
  elapsed_seconds: number;
  verdict: "FAKE" | "REAL" | "UNKNOWN";
  confidence: number;
  is_fake: boolean;
  details: ScanDetails;
  gemini_report: GeminiReport | null;
  model_used: string;
  error?: string;
}

export interface HealthStatus {
  status: string;
  version: string;
  models: Record<string, string>;
  gemini: boolean;
  huggingface: boolean;
}

export interface RecentScan {
  scan_id: string;
  filename: string;
  file_type: "image" | "video" | "audio";
  status: "PROCESSING" | "CRITICAL" | "WARNING" | "SAFE" | "ERROR";
  confidence: number;
  verdict: "FAKE" | "REAL" | "UNKNOWN";
  timestamp: string;
  time_ago?: string;
  error?: string;
}

export interface StatsResponse {
  total_scans: number;
  deepfakes_found: number;
  processing_queue: number;
  model_accuracy: number;
  recent_scans: RecentScan[];
}

export interface Settings {
  auto_scan: boolean;
  aggressive_mode: boolean;
  notifications: boolean;
  digest_reports: boolean;
  data_retention_days: number | string | null;
  confidence_threshold: number;
}

// ── Health check ──────────────────────────────────────────────────────────────

export async function checkHealth(): Promise<HealthStatus> {
  const res = await fetch(`${BASE_URL}/api/health`);
  if (!res.ok) throw new Error(`Health check failed: ${res.status}`);
  return res.json();
}

// ── Simple scan (no streaming) ────────────────────────────────────────────────

export async function scanFile(file: File): Promise<ScanResult> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${BASE_URL}/api/scan`, {
    method: "POST",
    body: formData,
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Scan failed: ${res.status}`);
  return data;
}

// ── Streaming scan (SSE) ──────────────────────────────────────────────────────

export function scanFileStream(
  file: File,
  onProgress: (p: ScanProgress) => void,
  onResult: (r: ScanResult) => void,
  onError: (err: string) => void,
): () => void {
  const formData = new FormData();
  formData.append("file", file);

  const controller = new AbortController();

  fetch(`${BASE_URL}/api/scan/stream`, {
    method: "POST",
    body: formData,
    signal: controller.signal,
  })
    .then(async (res) => {
      if (!res.ok || !res.body) {
        const text = await res.text();
        onError(`Server error ${res.status}: ${text}`);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        let currentEvent = "";
        for (const line of lines) {
          if (line.startsWith("event: ")) {
            currentEvent = line.slice(7).trim();
          } else if (line.startsWith("data: ")) {
            try {
              const payload = JSON.parse(line.slice(6));
              if (currentEvent === "progress")
                onProgress(payload as ScanProgress);
              else if (currentEvent === "result")
                onResult(payload as ScanResult);
              else if (currentEvent === "error")
                onError(payload.error ?? "Unknown error");
            } catch {
              // ignore malformed JSON
            }
          }
        }
      }
    })
    .catch((err) => {
      if (err.name !== "AbortError") {
        onError(err.message ?? "Network error");
      }
    });

  // Return abort function so caller can cancel
  return () => controller.abort();
}

// ── Scan from URL ─────────────────────────────────────────────────────────────

export async function scanUrl(url: string): Promise<ScanResult> {
  const res = await fetch(`${BASE_URL}/api/scan/url`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Scan failed: ${res.status}`);
  return data;
}

// â”€â”€ Dashboard stats â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function getStats(): Promise<StatsResponse> {
  const res = await fetch(`${BASE_URL}/api/stats`);
  if (!res.ok) throw new Error(`Stats failed: ${res.status}`);
  return res.json();
}

export async function getRecentScans(limit = 10): Promise<RecentScan[]> {
  const res = await fetch(`${BASE_URL}/api/scans/recent?limit=${limit}`);
  if (!res.ok) throw new Error(`Recent scans failed: ${res.status}`);
  const data = await res.json();
  return data.scans ?? [];
}

// â”€â”€ Settings â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function getSettings(): Promise<Settings> {
  const res = await fetch(`${BASE_URL}/api/settings`);
  if (!res.ok) throw new Error(`Settings failed: ${res.status}`);
  return res.json();
}

export async function updateSettings(updates: Partial<Settings>): Promise<Settings> {
  const res = await fetch(`${BASE_URL}/api/settings`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error(`Settings update failed: ${res.status}`);
  return res.json();
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export function confidencePercent(confidence: number): string {
  return `${(confidence * 100).toFixed(1)}%`;
}

export function verdictColor(verdict: string): string {
  switch (verdict) {
    case "FAKE":
      return "critical";
    case "REAL":
      return "safe";
    default:
      return "warning";
  }
}
