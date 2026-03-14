import os
import logging
import numpy as np
from dotenv import load_dotenv

_backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_env_file = os.path.join(_backend_dir, '.env')
load_dotenv(dotenv_path=_env_file, override=True)

logger = logging.getLogger(__name__)

# Detection thresholds
_MFCC_VAR_THRESHOLD = 0.15       # below this → likely synthetic
_SPECTRAL_FLAT_THRESHOLD = 0.4   # above this → likely synthetic


class AudioDeepfakeDetector:

    def __init__(self):
        logger.info("✅ AudioDeepfakeDetector (librosa-only) ready")

    def detect(self, filepath: str) -> dict:
        logger.info(f"[audio_detector] Detecting: {filepath}")
        try:
            return self._librosa_analysis(filepath)
        except Exception as e:
            logger.error(f"Librosa analysis failed: {e}", exc_info=True)
            return self._error_response(str(e))

    def _librosa_analysis(self, filepath: str) -> dict:
        import librosa

        y, sr = librosa.load(filepath, sr=16000, duration=60)

        if len(y) == 0:
            raise ValueError("Empty audio file")

        # ── Feature extraction ────────────────────────────────────────────────

        # 1. MFCCs (n_mfcc=13)
        mfcc = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13)
        # Variance of each coefficient across time, then average = overall temporal variance
        mfcc_variance = float(np.mean(np.var(mfcc, axis=1)))

        # 2. Spectral flatness
        spectral_flatness = librosa.feature.spectral_flatness(y=y)
        spectral_flatness_mean = float(np.mean(spectral_flatness))

        logger.info(
            f"[audio] mfcc_variance={mfcc_variance:.6f}  "
            f"spectral_flatness_mean={spectral_flatness_mean:.6f}"
        )

        # ── Synthetic flag logic ──────────────────────────────────────────────
        low_mfcc_var = mfcc_variance < _MFCC_VAR_THRESHOLD
        high_spectral_flat = spectral_flatness_mean > _SPECTRAL_FLAT_THRESHOLD

        is_fake = low_mfcc_var or high_spectral_flat

        # ── Confidence: combine two normalised signals ────────────────────────
        # Signal 1: MFCC-variance signal (inverted; lower var → higher fake confidence)
        mfcc_signal = max(0.0, 1.0 - (mfcc_variance / _MFCC_VAR_THRESHOLD))
        mfcc_signal = min(mfcc_signal, 1.0)

        # Signal 2: Spectral flatness signal
        flat_signal = min(spectral_flatness_mean / _SPECTRAL_FLAT_THRESHOLD, 1.0)

        # Combined fake confidence (equal weight)
        raw_fake_confidence = (mfcc_signal + flat_signal) / 2.0

        # Apply to real confidence direction if verdict is REAL
        confidence = raw_fake_confidence if is_fake else (1.0 - raw_fake_confidence)
        confidence = round(min(max(confidence, 0.01), 0.99), 4)

        return {
            "verdict": "FAKE" if is_fake else "REAL",
            "confidence": confidence,
            "is_fake": is_fake,
            "mfcc_variance": round(mfcc_variance, 6),
            "spectral_flatness": round(spectral_flatness_mean, 6),
            "details": {
                "fake_score": round(raw_fake_confidence, 4),
                "real_score": round(1.0 - raw_fake_confidence, 4),
                "mfcc_variance": round(mfcc_variance, 6),
                "spectral_flatness": round(spectral_flatness_mean, 6),
                "low_mfcc_variance_flag": low_mfcc_var,
                "high_spectral_flatness_flag": high_spectral_flat,
                "facial_artifacts": "N/A",
                "manipulation_type": "Voice cloning/TTS synthesis" if is_fake else "None detected",
                "frames_analyzed": 1,
                "raw_labels": [
                    f"MFCC variance: {mfcc_variance:.6f} ({'LOW — synthetic signal' if low_mfcc_var else 'OK'})",
                    f"Spectral flatness: {spectral_flatness_mean:.6f} ({'HIGH — synthetic signal' if high_spectral_flat else 'OK'})",
                ],
            },
            "model_used": "librosa-mfcc-spectral",
        }

    def _error_response(self, reason: str = "Detection failed") -> dict:
        return {
            "verdict": "UNKNOWN",
            "confidence": 0.0,
            "is_fake": False,
            "mfcc_variance": None,
            "spectral_flatness": None,
            "details": {
                "fake_score": 0.0,
                "real_score": 0.0,
                "mfcc_variance": None,
                "spectral_flatness": None,
                "low_mfcc_variance_flag": False,
                "high_spectral_flatness_flag": False,
                "facial_artifacts": "N/A",
                "manipulation_type": reason,
                "frames_analyzed": 0,
                "raw_labels": [reason],
            },
            "model_used": "none",
        }