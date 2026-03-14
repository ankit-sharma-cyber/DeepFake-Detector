"""
File utility helpers for DeepCheck backend.
"""

import os
import logging

logger = logging.getLogger(__name__)

# ── Allowed extensions ────────────────────────────────────────────────────────
VIDEO_EXTENSIONS = {"mp4", "avi", "mov", "mkv", "webm", "flv"}
AUDIO_EXTENSIONS = {"wav", "mp3", "flac", "ogg", "m4a", "aac"}
IMAGE_EXTENSIONS = {"jpg", "jpeg", "png", "webp", "bmp", "gif", "tiff"}

ALL_ALLOWED = VIDEO_EXTENSIONS | AUDIO_EXTENSIONS | IMAGE_EXTENSIONS


def allowed_file(filename: str) -> bool:
    """Return True if the file extension is in the allowed set."""
    if "." not in filename:
        return False
    ext = filename.rsplit(".", 1)[1].lower()
    return ext in ALL_ALLOWED


def get_file_type(filename: str) -> str:
    """
    Return 'video', 'audio', or 'image' based on file extension.
    Raises ValueError for unknown types.
    """
    if "." not in filename:
        raise ValueError(f"Cannot determine file type for: {filename}")
    ext = filename.rsplit(".", 1)[1].lower()
    if ext in VIDEO_EXTENSIONS:
        return "video"
    if ext in AUDIO_EXTENSIONS:
        return "audio"
    if ext in IMAGE_EXTENSIONS:
        return "image"
    raise ValueError(f"Unsupported file extension: {ext}")


def cleanup_file(filepath: str) -> None:
    """Safely delete a temporary file."""
    try:
        if filepath and os.path.exists(filepath):
            os.remove(filepath)
            logger.debug(f"Cleaned up temp file: {filepath}")
    except Exception as e:
        logger.warning(f"Could not delete temp file {filepath}: {e}")


def human_readable_size(num_bytes: int | float) -> str:
    """Convert bytes to a human-readable string."""
    for unit in ["B", "KB", "MB", "GB"]:
        if num_bytes < 1024:
            return f"{num_bytes:.1f} {unit}"
        num_bytes /= 1024
    return f"{num_bytes:.1f} TB"
