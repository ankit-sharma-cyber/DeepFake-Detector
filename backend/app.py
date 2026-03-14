"""
DeepCheck Backend - Main Flask Application
Deep Fake Detection using Groq + Hugging Face Models
"""

import os
import uuid
import json
import time
import logging
import threading
from flask import Flask, request, jsonify, Response, stream_with_context
from flask_cors import CORS
from dotenv import load_dotenv
from werkzeug.utils import secure_filename

# ── Load environment variables ──────────────────────────────────────────────
_env_path = os.path.join(os.path.dirname(__file__), ".env")
load_dotenv(_env_path)

# ── Logging ──────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger(__name__)

# ── Flask App ─────────────────────────────────────────────────────────────────
app = Flask(__name__)
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "deepcheck-secret-2024")
app.config["MAX_CONTENT_LENGTH"] = int(os.getenv("MAX_CONTENT_LENGTH", 104857600))
app.config["UPLOAD_FOLDER"] = os.getenv("UPLOAD_FOLDER", "uploads")

# ── CORS ──────────────────────────────────────────────────────────────────────
CORS(app, resources={r"/api/*": {"origins": [
    os.getenv("FRONTEND_URL", "http://localhost:5173"),
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "*"
]}})

# ── Ensure folders exist ──────────────────────────────────────────────────────
os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)
os.makedirs(os.getenv("MODEL_CACHE_DIR", "models_cache"), exist_ok=True)
os.makedirs(os.getenv("DATA_DIR", "data"), exist_ok=True)

# ── Import services ───────────────────────────────────────────────────────────
from services.image_detector import ImageDeepfakeDetector
from services.video_detector import VideoDeepfakeDetector
from services.audio_detector import AudioDeepfakeDetector
from services.gemini_analyzer import GeminiAnalyzer
from services.scan_store import ScanStore
from utils.file_utils import allowed_file, get_file_type, cleanup_file

# ── Initialise detectors ──────────────────────────────────────────────────────
_image_detector = None
_video_detector = None
_audio_detector = None
_gemini_analyzer = None
_scan_store = ScanStore(data_dir=os.getenv("DATA_DIR", "data"))


def get_image_detector():
    global _image_detector
    if _image_detector is None:
        _image_detector = ImageDeepfakeDetector()
    return _image_detector


def get_video_detector():
    global _video_detector
    if _video_detector is None:
        _video_detector = VideoDeepfakeDetector()
    return _video_detector


def get_audio_detector():
    global _audio_detector
    if _audio_detector is None:
        _audio_detector = AudioDeepfakeDetector()
    return _audio_detector


def get_gemini_analyzer():
    global _gemini_analyzer
    if _gemini_analyzer is None:
        _gemini_analyzer = GeminiAnalyzer()
    return _gemini_analyzer


def get_scan_store() -> ScanStore:
    return _scan_store


# ══════════════════════════════════════════════════════════════════════════════
#  ROUTES
# ══════════════════════════════════════════════════════════════════════════════

@app.route("/api/health", methods=["GET"])
def health_check():
    return jsonify({
        "status": "ok",
        "version": "3.0.0",
        "models": {
            "image": "hf-ensemble-dima806+prithivMLmods",
            "video": "hf-ensemble-dima806+prithivMLmods-video",
            "audio": "librosa-mfcc-spectral",
        },
        "gemini": bool(os.getenv("GEMINI_API_KEY")),
        "huggingface": bool(os.getenv("HUGGINGFACE_API_TOKEN")),
    })


@app.route("/api/scan", methods=["POST"])
def scan_file():
    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400

    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "No file selected"}), 400

    if not allowed_file(file.filename):
        return jsonify({"error": "File type not supported"}), 400

    filename = secure_filename(file.filename)
    unique_name = f"{uuid.uuid4().hex}_{filename}"
    filepath = os.path.join(app.config["UPLOAD_FOLDER"], unique_name)
    file.save(filepath)

    scan_id = f"SCN-{uuid.uuid4().hex[:6].upper()}"
    file_type = get_file_type(filename)

    logger.info(f"[{scan_id}] Scanning {file_type}: {filename}")
    get_scan_store().start_scan(scan_id, filename, file_type)

    try:
        result = _run_detection(filepath, file_type, scan_id, filename)
        get_scan_store().finish_scan(result)
        return jsonify(result)
    except Exception as e:
        logger.error(f"[{scan_id}] Detection failed: {e}", exc_info=True)
        get_scan_store().fail_scan(scan_id, str(e))
        return jsonify({"error": str(e), "scan_id": scan_id}), 500
    finally:
        cleanup_file(filepath)


@app.route("/api/scan/stream", methods=["POST"])
def scan_file_stream():
    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400

    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "No file selected"}), 400

    if not allowed_file(file.filename):
        return jsonify({"error": "File type not supported"}), 400

    filename = secure_filename(file.filename)
    unique_name = f"{uuid.uuid4().hex}_{filename}"
    filepath = os.path.join(app.config["UPLOAD_FOLDER"], unique_name)
    file.save(filepath)

    scan_id = "SCN-" + uuid.uuid4().hex[:6].upper()
    file_type = get_file_type(filename)
    get_scan_store().start_scan(scan_id, filename, file_type)

    def generate():
        try:
            yield _sse("progress", {"step": "init", "progress": 5, "message": "Initializing detection pipeline...", "scan_id": scan_id})
            yield _sse("progress", {"step": "load", "progress": 15, "message": f"Loading AI models for {file_type} analysis..."})
            yield _sse("progress", {"step": "extract", "progress": 30, "message": "Extracting media features..."})
            yield _sse("progress", {"step": "analyze", "progress": 50, "message": "Running deepfake detection — please wait..."})

            # Run detection in background thread so progress keeps streaming
            result_container = {"result": None, "error": None}

            def run_detection():
                try:
                    result_container["result"] = _run_detection(filepath, file_type, scan_id, filename)
                except Exception as e:
                    result_container["error"] = str(e)

            thread = threading.Thread(target=run_detection)
            thread.start()

            # Stream heartbeat progress while detection runs
            progress = 50
            while thread.is_alive():
                time.sleep(1.5)
                if progress < 80:
                    progress += 5
                yield _sse("progress", {
                    "step": "analyzing",
                    "progress": progress,
                    "message": "AI model analyzing media content..."
                })

            thread.join()

            if result_container["error"]:
                raise RuntimeError(result_container["error"])

            result = result_container["result"]
            get_scan_store().finish_scan(result)

            yield _sse("progress", {"step": "postprocess", "progress": 90, "message": "Processing detection scores..."})
            yield _sse("progress", {"step": "done", "progress": 100, "message": "Analysis complete!"})
            yield _sse("result", result)

        except Exception as e:
            logger.error(f"[{scan_id}] Stream error: {e}", exc_info=True)
            get_scan_store().fail_scan(scan_id, str(e))
            yield _sse("error", {"error": str(e), "scan_id": scan_id})
        finally:
            cleanup_file(filepath)

    return Response(
        stream_with_context(generate()),
        mimetype="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Access-Control-Allow-Origin": "*",
            "Connection": "keep-alive",
        }
    )



@app.route("/api/scan/url", methods=["POST"])
def scan_url():
    data = request.get_json()
    if not data or "url" not in data:
        return jsonify({"error": "No URL provided"}), 400

    url = data["url"]
    scan_id = "SCN-" + uuid.uuid4().hex[:6].upper()

    try:
        import requests as req
        import tempfile

        response = req.get(url, timeout=30, stream=True)
        response.raise_for_status()

        content_type = response.headers.get("content-type", "")
        ext = _ext_from_content_type(content_type) or ".bin"

        with tempfile.NamedTemporaryFile(delete=False, suffix=ext, dir=app.config["UPLOAD_FOLDER"]) as tmp:
            for chunk in response.iter_content(chunk_size=8192):
                tmp.write(chunk)
            filepath = tmp.name

        filename = url.split("/")[-1] or f"media{ext}"
        file_type = get_file_type(filename)

        get_scan_store().start_scan(scan_id, filename, file_type)
        result = _run_detection(filepath, file_type, scan_id, filename)
        get_scan_store().finish_scan(result)
        return jsonify(result)

    except Exception as e:
        logger.error(f"[{scan_id}] URL scan failed: {e}", exc_info=True)
        get_scan_store().fail_scan(scan_id, str(e))
        return jsonify({"error": str(e)}), 500


@app.route("/api/models", methods=["GET"])
def list_models():
    return jsonify({
        "models": [
            {"id": "image_detector", "name": "HF Ensemble (dima806 + prithivMLmods)", "source": "dima806/deepfake_vs_real_image_detection + prithivMLmods/Deep-Fake-Detector-Model", "type": "image", "framework": "huggingface-api", "description": "Dual HuggingFace model ensemble for image deepfake detection."},
            {"id": "video_detector", "name": "HF Ensemble — Frame Analysis (FFmpeg)", "source": "dima806/deepfake_vs_real_image_detection + prithivMLmods/Deep-Fake-Detector-Model", "type": "video", "framework": "huggingface-api+ffmpeg", "description": "FFmpeg frame extraction with center-weighted dual-model ensemble scoring."},
            {"id": "audio_detector", "name": "Librosa MFCC + Spectral Flatness", "source": "librosa", "type": "audio", "framework": "librosa", "description": "Local signal-based detection using MFCC variance and spectral flatness."},
        ]
    })


@app.route("/api/stats", methods=["GET"])
def get_stats():
    return jsonify(get_scan_store().stats())


@app.route("/api/scans/recent", methods=["GET"])
def get_recent_scans():
    try:
        limit = int(request.args.get("limit", "10"))
    except Exception:
        limit = 10
    return jsonify({"scans": get_scan_store().recent_scans(limit)})


@app.route("/api/settings", methods=["GET", "PUT"])
def settings():
    store = get_scan_store()
    if request.method == "GET":
        return jsonify(store.get_settings())
    updates = request.get_json(silent=True) or {}
    return jsonify(store.update_settings(updates))


# ══════════════════════════════════════════════════════════════════════════════
#  INTERNAL HELPERS
# ══════════════════════════════════════════════════════════════════════════════

def _run_detection(filepath: str, file_type: str, scan_id: str, original_name: str) -> dict:
    start = time.time()

    if file_type == "image":
        detector_result = get_image_detector().detect(filepath)
    elif file_type == "video":
        detector_result = get_video_detector().detect(filepath)
    elif file_type == "audio":
        detector_result = get_audio_detector().detect(filepath)
    else:
        raise ValueError(f"Unsupported file type: {file_type}")

    detector_result = _apply_settings(detector_result)

    # Gemini generates a forensic summary ONLY — not involved in detection/verdict
    gemini_summary = None
    gemini_is_fallback = False
    try:
        gemini_out = get_gemini_analyzer().analyze(filepath, file_type, detector_result)
        if gemini_out:
            gemini_summary = gemini_out.get("summary")
            gemini_is_fallback = bool(gemini_out.get("is_fallback", False))
    except Exception as e:
        logger.warning(f"[{scan_id}] Gemini summary skipped: {e}")

    elapsed = round(time.time() - start, 2)

    response = {
        "scan_id": scan_id,
        "filename": original_name,
        "file_type": file_type,
        "elapsed_seconds": elapsed,
        "verdict": detector_result.get("verdict", "UNKNOWN"),
        "confidence": detector_result.get("confidence", 0.0),
        "is_fake": detector_result.get("is_fake", False),
        "details": detector_result.get("details", {}),
        "gemini_summary": gemini_summary,
        "gemini_is_fallback": gemini_is_fallback,
        "model_used": detector_result.get("model_used", ""),
    }

    # Include model-specific scores at top level for easy frontend access
    if file_type == "image":
        response["model_a_score"] = detector_result.get("model_a_score")
        response["model_b_score"] = detector_result.get("model_b_score")
    elif file_type == "video":
        response["frames_analyzed"] = detector_result.get("frames_analyzed", 0)
        response["per_frame_scores"] = detector_result.get("per_frame_scores", [])
    elif file_type == "audio":
        response["mfcc_variance"] = detector_result.get("mfcc_variance")
        response["spectral_flatness"] = detector_result.get("spectral_flatness")

    return response


def _apply_settings(detector_result: dict) -> dict:
    settings = get_scan_store().get_settings()
    threshold = float(settings.get("confidence_threshold", 0.7))

    try:
        margin = float(os.getenv("AMBIGUITY_MARGIN", "0"))
    except ValueError:
        margin = 0.0

    if settings.get("aggressive_mode"):
        threshold = max(0.1, threshold * 0.85)

    details = detector_result.get("details", {})
    fake_score = details.get("fake_score") or details.get("mean_fake_score")

    if detector_result.get("verdict") == "UNKNOWN":
        logger.info("Verdict is UNKNOWN; skipping settings override.")
        return detector_result

    if fake_score is None:
        logger.warning("No fake_score found; skipping settings override.")
        return detector_result

    forced = os.getenv("FORCE_VERDICT", "").strip().upper()
    if forced in {"REAL", "FAKE", "UNKNOWN"}:
        detector_result["verdict"] = forced
        detector_result["is_fake"] = forced == "FAKE"
        detector_result["confidence"] = 1.0 if forced in {"REAL", "FAKE"} else 0.5
        details["decision_rule"] = f"FORCE_VERDICT={forced}"
        detector_result["details"] = details
        return detector_result

    if os.getenv("FLIP_MODEL_OUTPUTS", "false").lower() == "true":
        fake_score = 1.0 - float(fake_score)
        details["fake_score_flipped"] = True

    if margin <= 0:
        verdict = "FAKE" if fake_score >= threshold else "REAL"
        confidence = fake_score if verdict == "FAKE" else (1.0 - fake_score)
        is_fake = verdict == "FAKE"
    elif fake_score >= threshold + margin:
        verdict, confidence, is_fake = "FAKE", fake_score, True
    elif fake_score <= (1.0 - threshold) - margin:
        verdict, confidence, is_fake = "REAL", 1.0 - fake_score, False
    else:
        verdict, confidence, is_fake = "UNKNOWN", max(fake_score, 1.0 - fake_score), False

    detector_result["is_fake"] = is_fake
    detector_result["verdict"] = verdict
    detector_result["confidence"] = round(confidence, 4)

    logger.info(f"Decision: fake_score={fake_score:.4f}, threshold={threshold:.3f}, verdict={verdict}, confidence={confidence:.4f}")

    details["confidence_threshold"] = round(threshold, 3)
    details["ambiguity_margin"] = round(margin, 3)
    details["decision_rule"] = "fake_score >= threshold -> FAKE else REAL"
    detector_result["details"] = details
    return detector_result


def _sse(event: str, data: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"


def _ext_from_content_type(ct: str) -> str:
    mapping = {
        "video/mp4": ".mp4", "video/avi": ".avi",
        "audio/wav": ".wav", "audio/mpeg": ".mp3",
        "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp",
    }
    for k, v in mapping.items():
        if k in ct:
            return v
    return ".bin"


# ══════════════════════════════════════════════════════════════════════════════
#  ENTRY POINT
# ══════════════════════════════════════════════════════════════════════════════

# if __name__ == "__main__":
#     port = int(os.getenv("PORT", 5000))
#     debug = os.getenv("FLASK_DEBUG", "false").lower() == "true"
#     logger.info(f"Starting DeepCheck backend on port {port} (debug={debug})")
#     app.run(host="0.0.0.0", port=port, debug=debug, use_reloader=False)
if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    debug = os.getenv("FLASK_DEBUG", "false").lower() == "true"
    logger.info(f"Starting DeepCheck backend on port {port} (debug={debug})")
    app.run(
        host="0.0.0.0",
        port=port,
        debug=debug,
        use_reloader=False,
        threaded=True  # ✅ THIS IS THE FIX — enables threading for SSE
    )