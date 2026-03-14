# Oracle's Decree — App Info

## Overview
**Oracle's Decree** is a multi-modal deepfake and synthetic media detection platform. It uses a dual HuggingFace model ensemble for image/video detection, Librosa for audio analysis, and the Google Gemini API exclusively for generating a brief forensic summary after the verdict is determined.

---

## Features

### Core Detection
| Feature | Description |
|---|---|
| 🎬 **Video Deepfake Detection** | FFmpeg frame extraction (1 fps/2s, max 20 frames) processed through a dual HF model ensemble with center-weight scoring |
| 🎤 **Voice Clone Identification** | Librosa-based MFCC variance and spectral flatness analysis — no API calls required |
| 🖼️ **AI Image Analysis** | Dual HuggingFace Inference API ensemble: `dima806/deepfake_vs_real_image_detection` + `prithivMLmods/Deep-Fake-Detector-Model` with per-model fallback |

### Analysis & Workflow
- **Gemini AI Forensic Summary** — 3-sentence plain-prose summary generated *after* verdict is determined. Not involved in detection logic.
- **SSE Progress Streaming** — live progress bar updates during analysis via Server-Sent Events
- **Retry with Exponential Backoff** — automatic retries on Gemini API quota errors
- **Dashboard** — scan history showing id, timestamp, verdict, confidence, and model used
- **Settings** — confidence threshold, ambiguity margin, model flip, force verdicts
- **Google OAuth** — sign in with Google

---

## Tech Stack

### Frontend
| Technology | Version | Role |
|---|---|---|
| React | 18 | UI framework |
| TypeScript | 5 | Type-safe language |
| Vite | 5 | Build tool and dev server |
| Vanilla CSS | — | Styling (no Tailwind) |
| Lucide React | 0.368 | Icon library |
| @react-oauth/google | 0.13 | Google OAuth integration |

### Backend
| Technology | Version | Role |
|---|---|---|
| Python | 3.10+ | Runtime |
| Flask | 3.0.3 | HTTP API server |
| Flask-CORS | 4.0.1 | Cross-origin resource sharing |
| Google Generative AI (Gemini) | 0.5.4 | Report-only forensic summary (`gemini-2.0-flash-lite-001`) |
| HuggingFace Inference API | — | Remote deepfake classification (image + video) |
| FFmpeg | system | Video frame extraction subprocess |
| Pillow | 10.4.0 | Image preprocessing |
| Librosa | 0.10.2 | Audio MFCC + spectral flatness analysis |
| SoundFile | 0.12.1 | Audio file I/O |
| NumPy | 2.2.6 | Numerical processing |
| python-dotenv | 1.0.1 | Environment variable management |
| Gunicorn | 22.0.0 | Production WSGI server |

### AI / Models
| Model / API | Used For |
|---|---|
| `dima806/deepfake_vs_real_image_detection` | Image deepfake classification (Model A) |
| `prithivMLmods/Deep-Fake-Detector-Model` | Image deepfake classification (Model B) |
| Both models above, per-frame | Video frame analysis (with center-weighting) |
| Librosa MFCC + Spectral Flatness | Audio synthetic voice detection (local, no API) |
| `gemini-2.0-flash-lite-001` | Post-verdict 3-sentence forensic summary only |

---

## Architecture

```
oracles-decree/
├── src/                   # React + TypeScript frontend (Vite)
│   ├── components/
│   │   ├── landing/       # Homepage, Features, Hero, Pricing, Reviews
│   │   └── views/         # AnalysisView, DashboardView, SettingsView
│   └── services/          # API client (fetch, SSE)
│
└── backend/               # Flask Python backend
    ├── app.py             # Main Flask app, routes, SSE
    ├── services/
    │   ├── image_detector.py    # HF dual-model ensemble (dima806 + prithivMLmods)
    │   ├── video_detector.py    # FFmpeg extraction + per-frame ensemble scoring
    │   ├── audio_detector.py    # Librosa MFCC + spectral flatness (no API)
    │   ├── gemini_analyzer.py   # Post-verdict 3-sentence summary only
    │   └── scan_store.py        # Scan history and persistence
    └── utils/
        └── gemini_utils.py      # Retry logic for Gemini API
```

---

## Environment Variables (`.env`)
```
GEMINI_API_KEY=           # Google AI Studio API key (summary only)
HUGGINGFACE_API_TOKEN=    # HuggingFace token for inference API (detection)
FLASK_ENV=development
SECRET_KEY=               # Flask session secret
UPLOAD_FOLDER=uploads
FRONTEND_URL=http://localhost:5173
CONFIDENCE_THRESHOLD=0.85
AMBIGUITY_MARGIN=0
```

> FFmpeg must be installed and available on `PATH` for video detection.
