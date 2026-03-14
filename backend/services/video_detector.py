import os
import io
import logging
import tempfile
import subprocess
import requests
from PIL import Image
from dotenv import load_dotenv
import subprocess
result = subprocess.run(["ffmpeg", "-version"], capture_output=True, text=True)
print(f"[DEBUG] ffmpeg check: returncode={result.returncode}, error={result.stderr[:100]}")

_backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_env_file = os.path.join(_backend_dir, '.env')
load_dotenv(dotenv_path=_env_file, override=True)

logger = logging.getLogger(__name__)

_HF_BASE = "https://router.huggingface.co/hf-inference/models"
_MODEL_A_ID = "dima806/deepfake_vs_real_image_detection"
_MODEL_B_ID = "prithivMLmods/Deep-Fake-Detector-Model"


def _query_hf_model(model_id: str, image_bytes: bytes, hf_token: str, timeout: int = 30) -> float | None:
    """Query a HuggingFace image-classification model. Returns fake-confidence (0–1) or None."""
    url = f"{_HF_BASE}/{model_id}"
    headers = {
        "Authorization": f"Bearer {hf_token}",
        "Content-Type": "application/octet-stream",
    }
    # try:
    #     resp = requests.post(url, headers=headers, data=image_bytes, timeout=timeout)
    #     resp.raise_for_status()
    #     results = resp.json()
    try:
        resp = requests.post(url, headers=headers, data=image_bytes, timeout=timeout)
        print(f"[HF API] model={model_id} status={resp.status_code} response={resp.text[:150]}", flush=True)
        resp.raise_for_status()
        results = resp.json()

        if not isinstance(results, list):
            return None

        scores = {r["label"].lower(): r["score"] for r in results if "label" in r and "score" in r}

        fake_score = (
            scores.get("fake")
            or scores.get("deepfake")
            or scores.get("ai-generated")
            or scores.get("artificial")
            or scores.get("1")
            or None
        )

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

        return float(fake_score) if fake_score is not None else None

    except requests.exceptions.Timeout:
        logger.warning(f"[{model_id}] Request timed out after {timeout}s")
        return None
    except Exception as e:
        logger.warning(f"[{model_id}] Query failed: {e}")
        return None


def _analyze_frame_ensemble(image_bytes: bytes, hf_token: str) -> dict:
    """Run both HF models on a frame. Returns fake score and per-model scores."""
    score_a = _query_hf_model(_MODEL_A_ID, image_bytes, hf_token, timeout=40)
    score_b = _query_hf_model(_MODEL_B_ID, image_bytes, hf_token, timeout=40)

    available = [s for s in [score_a, score_b] if s is not None]
    if not available:
        return {"fake_score": 0.5, "model_a": None, "model_b": None, "failed": True}

    avg = sum(available) / len(available)
    return {
        "fake_score": round(avg, 4),
        "model_a": round(score_a, 4) if score_a is not None else None,
        "model_b": round(score_b, 4) if score_b is not None else None,
        "failed": False,
    }


class VideoDeepfakeDetector:

    def __init__(self):
        self.hf_token = os.getenv("HUGGINGFACE_API_TOKEN", "")
        if not self.hf_token:
            logger.error("❌ HUGGINGFACE_API_TOKEN not found in .env")
        else:
            logger.info(f"✅ HF token loaded: {self.hf_token[:12]}...")

    # def detect(self, filepath: str) -> dict:
    #     logger.info(f"[video_detector] Detecting: {filepath}")
    def detect(self, filepath: str) -> dict:
        print(f"[VIDEO DETECT CALLED] filepath={filepath}", flush=True)
        print(f"[VIDEO DETECT] file exists={os.path.exists(filepath)}", flush=True)
        print(f"[VIDEO DETECT] HF token present={bool(self.hf_token)}", flush=True)
        logger.info(f"[video_detector] Detecting: {filepath}")

        try:
            frame_paths = self._extract_frames_ffmpeg(filepath)
        except Exception as e:
            logger.error(f"Frame extraction failed: {e}")
            return self._error_response(str(e))

        if not frame_paths:
            return self._error_response("No frames extracted from video")

        logger.info(f"Extracted {len(frame_paths)} frames")

        frame_results = []
        total = len(frame_paths)

        for i, fpath in enumerate(frame_paths):
            try:
                with open(fpath, "rb") as f:
                    image_bytes = f.read()

                frame_result = _analyze_frame_ensemble(image_bytes, self.hf_token)

                # Center-weight: frames at 40–60% of video index get 1.3x weight
                position_ratio = i / max(total - 1, 1)
                weight = 1.3 if 0.40 <= position_ratio <= 0.60 else 1.0

                frame_results.append({
                    "frame_index": i,
                    "position_ratio": round(position_ratio, 3),
                    "fake_score": frame_result["fake_score"],
                    "model_a": frame_result["model_a"],
                    "model_b": frame_result["model_b"],
                    "weight": weight,
                    "failed": frame_result["failed"],
                })
                logger.info(f"Frame {i} ({position_ratio:.0%}): fake={frame_result['fake_score']:.4f} weight={weight}")

            except Exception as e:
                logger.warning(f"Frame {i} analysis failed: {e}")
            finally:
                # Clean up temporary frame file
                try:
                    os.unlink(fpath)
                except Exception:
                    pass

        if not frame_results or all(r["failed"] for r in frame_results):
            return self._error_response("All frame analyses failed")

        return self._combine_results(frame_results)

    def _extract_frames_ffmpeg(self, filepath: str) -> list[str]:
        """
        Use FFmpeg to extract frames:
        - Rate: 1 frame per 2 seconds (fps=0.5)
        - Max 20 frames
        - Also explicitly extract frame at time 0 (first) and near end (last)
        Returns a list of temporary JPEG file paths.
        """
        tmp_dir = tempfile.mkdtemp(prefix="od_frames_")
        frame_pattern = os.path.join(tmp_dir, "frame_%03d.jpg")

        FFMPEG = r"C:\Users\ankit_frj21mc\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-8.0.1-full_build\bin\ffmpeg.exe"

        cmd = [
            FFMPEG, "-y",
            "-i", filepath,
            "-vf", "fps=0.5",
            "-vframes", "20",
            "-q:v", "2",
            frame_pattern,
        ]

        logger.info(f"FFmpeg command: {' '.join(cmd)}")

        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=120,
        )

        if result.returncode != 0 and not os.listdir(tmp_dir):
            raise RuntimeError(f"FFmpeg failed: {result.stderr[-500:]}")

        # Collect extracted frames sorted by name
        frames = sorted([
            os.path.join(tmp_dir, f)
            for f in os.listdir(tmp_dir)
            if f.endswith(".jpg")
        ])

        if not frames:
            raise RuntimeError("FFmpeg produced 0 frames")

        # Explicitly add first and last frame if not already captured
        # (FFmpeg fps filter may skip them on very short clips)
        first_frame = os.path.join(tmp_dir, "first.jpg")
        last_frame = os.path.join(tmp_dir, "last.jpg")

        # subprocess.run(
        #     ["ffmpeg", "-y", "-i", filepath, "-vframes", "1", "-q:v", "2", first_frame],
        #     capture_output=True, timeout=30
        # )
        # subprocess.run(
        #     ["ffmpeg", "-y", "-sseof", "-1", "-i", filepath, "-vframes", "1", "-q:v", "2", last_frame],
        #     capture_output=True, timeout=30
        # )
        subprocess.run(
            [FFMPEG, "-y", "-i", filepath, "-vframes", "1", "-q:v", "2", first_frame],
            capture_output=True, timeout=30
        )
        subprocess.run(
            [FFMPEG, "-y", "-sseof", "-1", "-i", filepath, "-vframes", "1", "-q:v", "2", last_frame],
            capture_output=True, timeout=30
        )

        for extra in [first_frame, last_frame]:
            if os.path.exists(extra) and extra not in frames:
                frames.insert(0 if extra == first_frame else len(frames), extra)

        return frames

    def _combine_results(self, results: list[dict]) -> dict:
        valid = [r for r in results if not r["failed"]]

        weighted_sum = sum(r["fake_score"] * r["weight"] for r in valid)
        weight_total = sum(r["weight"] for r in valid)
        avg_fake = weighted_sum / weight_total if weight_total > 0 else 0.5

        is_fake = avg_fake >= 0.5
        confidence = avg_fake if is_fake else (1.0 - avg_fake)

        per_frame_scores = [r["fake_score"] for r in results]

        return {
            "verdict": "FAKE" if is_fake else "REAL",
            "confidence": round(confidence, 4),
            "is_fake": is_fake,
            "frames_analyzed": len(results),
            "per_frame_scores": per_frame_scores,
            "details": {
                "fake_score": round(avg_fake, 4),
                "real_score": round(1.0 - avg_fake, 4),
                "facial_artifacts": _artifact_level(avg_fake),
                "manipulation_type": "Face swap/deepfake video" if is_fake else "None detected",
                "frames_analyzed": len(results),
                "fake_frames": sum(1 for r in valid if r["fake_score"] >= 0.5),
                "real_frames": sum(1 for r in valid if r["fake_score"] < 0.5),
                "per_frame_scores": per_frame_scores,
                "raw_labels": [f"Frame {r['frame_index']}: {r['fake_score']:.4f}" for r in results],
            },
            "model_used": "hf-ensemble-dima806+prithivMLmods-video",
        }

    def _error_response(self, message: str = "Detection failed") -> dict:
        return {
            "verdict": "UNKNOWN",
            "confidence": 0.0,
            "is_fake": False,
            "frames_analyzed": 0,
            "per_frame_scores": [],
            "details": {
                "fake_score": 0.0,
                "real_score": 0.0,
                "facial_artifacts": "None",
                "manipulation_type": message,
                "frames_analyzed": 0,
                "fake_frames": 0,
                "real_frames": 0,
                "per_frame_scores": [],
                "raw_labels": [message],
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