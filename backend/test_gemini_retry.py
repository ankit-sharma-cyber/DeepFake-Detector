import unittest
import sys
import os
from unittest.mock import MagicMock, patch

# Add backend to path so we can import utils
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from google.api_core import exceptions
from utils.gemini_utils import retry_gemini_call, run_gemini_call

class TestGeminiRetry(unittest.TestCase):

    def test_retry_success_after_failure(self):
        """Test that it retries and eventually succeeds."""
        mock_func = MagicMock()
        # Fail twice with 429, then succeed
        mock_func.side_effect = [
            exceptions.ResourceExhausted("Quota exceeded"),
            exceptions.ResourceExhausted("Quota exceeded"),
            "Success"
        ]

        # Use small delays for testing
        @retry_gemini_call(max_attempts=4, initial_delay=0.1)
        def decorated():
            return mock_func()

        result = decorated()
        self.assertEqual(result, "Success")
        self.assertEqual(mock_func.call_count, 3)

    def test_retry_exhaustion(self):
        """Test that it raises RuntimeError after exhausting retries."""
        mock_func = MagicMock()
        mock_func.side_effect = exceptions.ResourceExhausted("Quota exceeded")

        @retry_gemini_call(max_attempts=3, initial_delay=0.1)
        def decorated():
            return mock_func()

        with self.assertRaises(RuntimeError) as cm:
            decorated()
        
        self.assertIn("Gemini API quota exceeded", str(cm.exception))
        self.assertEqual(mock_func.call_count, 3)

    def test_no_retry_on_other_exception(self):
        """Test that it doesn't retry on non-429 exceptions."""
        mock_func = MagicMock()
        mock_func.side_effect = ValueError("Something else")

        @retry_gemini_call(max_attempts=3, initial_delay=0.1)
        def decorated():
            return mock_func()

        with self.assertRaises(ValueError):
            decorated()
        
        self.assertEqual(mock_func.call_count, 1)

if __name__ == "__main__":
    unittest.main()
