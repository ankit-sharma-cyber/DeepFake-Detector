import os
import io
import logging
import requests
from PIL import Image
from dotenv import load_dotenv

_backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_env_file = os.path.join(_backend_dir, '.env')
load_dotenv(dotenv_path=_env_file, override=True)

logger = logging.getLogger(__name__)

# HuggingFace Inference API endpoints
_HF_BASE = "https://router.huggingface.co/hf-inference/models"
_MODEL_A_ID = "dima806/deepfake_vs_real_image_detection"
_MODEL_B_ID = "prithivMLmods/Deep-Fake-Detector-Model"


def _query_hf_model(model_id: str, image_bytes: bytes, hf_token: str, timeout: int = 30) -> float | None:
    """
    Query a HuggingFace image-classification model.
    Returns the fake-confidence score (0.0–1.0) or None on failure.
    """
    url = f"{_HF_BASE}/{model_id}"
    headers = {
        "Authorization": f"Bearer {hf_token}",
        "Content-Type": "application/octet-stream",
    }
    try:
        resp = requests.post(url, headers=headers, data=image_bytes, timeout=timeout)
        resp.raise_for_status()
        results = resp.json()

        if not isinstance(results, list):
            logger.warning(f"[{model_id}] Unexpected response format: {results}")
            return None

        scores = {r["label"].lower(): r["score"] for r in results if "label" in r and "score" in r}
        logger.info(f"[{model_id}] Raw scores: {scores}")

        # Normalise label names across both models
        fake_score = (
            scores.get("fake")
            or scores.get("deepfake")
            or scores.get("ai-generated")
            or scores.get("artificial")
            or scores.get("1")      # prithivMLmods uses numeric labels sometimes
            or None
        )

        # If fake label not found, try inverting real label
        if fake_score is None:
            real_score = (
                scores.get("real")
                or scores.get("authentic")
                or scores.get("genuine")
                or scores.get("0")
                or None
            )
            if real_score is not None:
                fake_score = 1.0 - real_score

        if fake_score is None:
            logger.warning(f"[{model_id}] Could not extract fake score from: {scores}")

        return float(fake_score) if fake_score is not None else None

    except requests.exceptions.Timeout:
        logger.warning(f"[{model_id}] Request timed out after {timeout}s")
        return None
    except Exception as e:
        logger.warning(f"[{model_id}] Query failed: {e}")
        return None


class ImageDeepfakeDetector:

    def __init__(self):
        self.hf_token = os.getenv("HUGGINGFACE_API_TOKEN", "")
        if not self.hf_token:
            logger.error("❌ HUGGINGFACE_API_TOKEN not found in .env")
        else:
            logger.info(f"✅ HF token loaded: {self.hf_token[:12]}...")

    def detect(self, filepath: str) -> dict:
        logger.info(f"[image_detector] Detecting: {filepath}")

        # Prepare image bytes (resize if huge)
        try:
            with open(filepath, "rb") as f:
                raw = f.read()

            img = Image.open(io.BytesIO(raw)).convert("RGB")
            if max(img.size) > 1024:
                img.thumbnail((1024, 1024))
                buf = io.BytesIO()
                img.save(buf, format="JPEG", quality=90)
                image_bytes = buf.getvalue()
            else:
                image_bytes = raw
        except Exception as e:
            logger.error(f"Failed to read/resize image: {e}")
            return self._error_response(str(e))

        # Query Model A and Model B concurrently (sequentially is fine; they're fast)
        score_a = _query_hf_model(_MODEL_A_ID, image_bytes, self.hf_token, timeout=45)
        score_b = _query_hf_model(_MODEL_B_ID, image_bytes, self.hf_token, timeout=45)

        logger.info(f"Model A ({_MODEL_A_ID}) fake score: {score_a}")
        logger.info(f"Model B ({_MODEL_B_ID}) fake score: {score_b}")

        # Averaging with graceful fallback
        if score_a is None and score_b is None:
            logger.error("Both models failed — returning error response")
            return self._error_response("Both HuggingFace models failed or timed out")

        available = [s for s in [score_a, score_b] if s is not None]
        avg_fake = sum(available) / len(available)

        is_fake = avg_fake >= 0.5
        confidence = avg_fake if is_fake else (1.0 - avg_fake)

        return {
            "verdict": "FAKE" if is_fake else "REAL",
            "confidence": round(confidence, 4),
            "is_fake": is_fake,
            "model_a_score": round(score_a, 4) if score_a is not None else None,
            "model_b_score": round(score_b, 4) if score_b is not None else None,
            "details": {
                "fake_score": round(avg_fake, 4),
                "real_score": round(1.0 - avg_fake, 4),
                "facial_artifacts": _artifact_level(avg_fake),
                "manipulation_type": "AI-Generated/Deepfake" if is_fake else "None detected",
                "frames_analyzed": 1,
                "raw_labels": [
                    f"Model A (dima806): {score_a:.4f}" if score_a is not None else "Model A: unavailable",
                    f"Model B (prithivMLmods): {score_b:.4f}" if score_b is not None else "Model B: unavailable",
                ],
            },
            "model_used": "hf-ensemble-dima806+prithivMLmods",
        }

    def _error_response(self, reason: str = "Detection failed") -> dict:
        return {
            "verdict": "UNKNOWN",
            "confidence": 0.0,
            "is_fake": False,
            "model_a_score": None,
            "model_b_score": None,
            "details": {
                "fake_score": 0.0,
                "real_score": 0.0,
                "facial_artifacts": "None",
                "manipulation_type": reason,
                "frames_analyzed": 0,
                "raw_labels": [reason],
            },
            "model_used": "none",
        }


def _artifact_level(score: float) -> str:
    if score >= 0.85:
        return "High"
    if score >= 0.55:
        return "Medium"
    if score >= 0.30:
        return "Low"
    return "None"