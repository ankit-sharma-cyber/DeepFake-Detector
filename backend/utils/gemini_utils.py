import time
import random
import logging
import functools
from typing import Callable, Any
from google.api_core import exceptions
import threading

logger = logging.getLogger(__name__)

# Global rate limiting state
_last_call_lock = threading.Lock()
_last_call_time = 0.0
MIN_GAP_SECONDS = 0.5  # Reduced from 2.0 to speed up


def retry_gemini_call(max_attempts: int = 2, initial_delay: float = 1.0, max_delay: float = 10.0):
    """
    Decorator with exponential backoff for Gemini API calls.
    Fails fast on quota errors instead of retrying.
    """
    def decorator(func: Callable[..., Any]):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            global _last_call_time

            # Enforce minimum gap between calls
            with _last_call_lock:
                now = time.time()
                elapsed = now - _last_call_time
                if elapsed < MIN_GAP_SECONDS:
                    time.sleep(MIN_GAP_SECONDS - elapsed)
                _last_call_time = time.time()

            delay = initial_delay
            last_exception = None

            for attempt in range(max_attempts):
                try:
                    return func(*args, **kwargs)

                except exceptions.ResourceExhausted as e:
                    last_exception = e
                    error_str = str(e)

                    # ✅ Fail fast on daily quota — no point retrying
                    if "GenerateRequestsPerDay" in error_str or "limit: 0" in error_str:
                        logger.error("Gemini daily quota exhausted — failing fast, switching to fallback")
                        friendly_msg = "Gemini API quota exceeded. Switching to fallback detector."
                        raise RuntimeError(friendly_msg) from e

                    # Retry on per-minute quota
                    if attempt == max_attempts - 1:
                        logger.error(f"Gemini quota exceeded after {max_attempts} attempts: {e}")
                        break

                    sleep_time = delay + (random.random() * delay * 0.5)
                    logger.warning(f"Gemini 429. Attempt {attempt+1}/{max_attempts}. Retrying in {sleep_time:.2f}s...")
                    time.sleep(min(sleep_time, max_delay))
                    delay *= 2

                except exceptions.InvalidArgument as e:
                    logger.error(f"Gemini Invalid Argument: {e}")
                    raise

                except Exception as e:
                    logger.error(f"Gemini unexpected error: {e}")
                    raise

            friendly_msg = "Gemini API quota exceeded. Please check your plan and billing details."
            if last_exception:
                raise RuntimeError(friendly_msg) from last_exception
            raise RuntimeError(friendly_msg)

        return wrapper
    return decorator


def run_gemini_call(func: Callable[..., Any], *args, **kwargs) -> Any:
    """Convenience function to run a Gemini call with retry logic."""
    decorated_func = retry_gemini_call()(func)
    return decorated_func(*args, **kwargs)