"""
Gemini Forensic Summary Generator
Gemini is used ONLY to generate a 3-sentence human-readable forensic summary
AFTER the verdict has already been determined by the detection pipeline.
It does NOT participate in detection logic, scoring, or verdict decisions.
"""

import os
import logging
from dotenv import load_dotenv

_backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_env_file = os.path.join(_backend_dir, '.env')
load_dotenv(dotenv_path=_env_file, override=True)

logger = logging.getLogger(__name__)

_FALLBACK_TEMPLATE = (
    "Forensic analysis complete. "
    "Verdict: {verdict} with {confidence:.0f}% confidence. "
    "Manual review recommended."
)


class GeminiAnalyzer:
    """Generate a brief forensic summary using Gemini after verdict is determined."""

    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY", "")
        self.model_name = "gemini-2.0-flash-lite-001"
        self.client = None

        if self.api_key:
            self._init_client()
        else:
            logger.warning("GEMINI_API_KEY not set — Gemini summaries will use fallback text.")

    def _init_client(self):
        try:
            import google.generativeai as genai
            genai.configure(api_key=self.api_key)
            self.client = genai.GenerativeModel(self.model_name)
            logger.info(f"✅ Gemini client ready: {self.model_name}")
        except Exception as e:
            logger.error(f"Failed to init Gemini client: {e}")
            self.client = None

    def analyze(self, filepath: str, file_type: str, detector_result: dict) -> dict:
        """
        Generate a 3-sentence forensic summary based on the already-determined verdict.
        Returns { "summary": str, "is_fallback": bool }.
        Gemini call is fully wrapped in try/except — never crashes the pipeline.
        """
        verdict = detector_result.get("verdict", "UNKNOWN")
        confidence = round(detector_result.get("confidence", 0.0) * 100, 1)
        is_fake = detector_result.get("is_fake", False)
        details = detector_result.get("details", {})

        fallback_text = _FALLBACK_TEMPLATE.format(verdict=verdict, confidence=confidence)

        if not self.client:
            return {"summary": fallback_text, "is_fallback": True}

        try:
            summary = self._call_gemini(file_type, verdict, confidence, is_fake, details)
            if not summary:
                return {"summary": fallback_text, "is_fallback": True}
            return {"summary": summary, "is_fallback": False}
        except Exception as e:
            logger.warning(f"Gemini summary generation failed: {e}")
            return {"summary": fallback_text, "is_fallback": True}

    def _call_gemini(
        self,
        file_type: str,
        verdict: str,
        confidence: float,
        is_fake: bool,
        details: dict,
    ) -> str:
        """Build a prompt and call Gemini. Returns a 3-sentence summary string."""

        extra = ""
        if file_type == "image":
            extra = (
                f"Fake score: {details.get('fake_score', 'N/A')}. "
                f"Model A score: {details.get('raw_labels', [''])[0]}. "
                f"Model B score: {details.get('raw_labels', ['', ''])[1] if len(details.get('raw_labels', [])) > 1 else 'N/A'}."
            )
        elif file_type == "video":
            extra = (
                f"Frames analyzed: {details.get('frames_analyzed', 'N/A')}. "
                f"Weighted fake score: {details.get('fake_score', 'N/A')}."
            )
        elif file_type == "audio":
            extra = (
                f"MFCC variance: {details.get('mfcc_variance', 'N/A')}. "
                f"Spectral flatness: {details.get('spectral_flatness', 'N/A')}."
            )

        prompt = (
            f"You are a digital forensics expert writing a brief report.\n"
            f"A {file_type} file was analyzed for deepfake manipulation.\n"
            f"Verdict: {verdict}. Confidence: {confidence}%. {extra}\n"
            f"Write exactly 3 sentences summarizing the forensic findings. "
            f"Do not use bullet points, lists, or markdown. Plain prose only."
        )

        from utils.gemini_utils import run_gemini_call  # type: ignore
        response = run_gemini_call(self.client.generate_content, prompt)  # type: ignore
        text = response.text.strip() if response and hasattr(response, "text") else ""
        return text
