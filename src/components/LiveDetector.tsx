import { useRef, useEffect, useState, useCallback } from "react";

interface LiveResult {
  verdict: string;
  confidence: number;
  is_fake: boolean;
  face_detected: boolean;
  details: {
    reasons: string[];
    facial_artifacts: string;
  };
}

export default function LiveDetector() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<LiveResult | null>(null);
  const [error, setError] = useState("");
  const [frameCount, setFrameCount] = useState(0);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: "user" },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setIsRunning(true);
        setError("");
      }
    } catch (err) {
      setError("Camera access denied. Please allow camera access.");
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((t) => t.stop());
      videoRef.current.srcObject = null;
    }
    if (intervalRef.current) clearInterval(intervalRef.current);
    setIsRunning(false);
    setResult(null);
  };

  const captureAndDetect = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const ctx = canvas.getContext("2d");

    if (!ctx || video.readyState !== 4) return;

    canvas.width = 320;
    canvas.height = 240;
    ctx.drawImage(video, 0, 0, 320, 240);

    const base64 = canvas.toDataURL("image/jpeg", 0.7).split(",")[1];

    try {
      const response = await fetch("http://localhost:5000/api/scan/live", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64 }),
      });

      if (response.ok) {
        const data = await response.json();
        setResult(data);
        setFrameCount((prev) => prev + 1);
      }
    } catch (err) {
      console.error("Detection error:", err);
    }
  }, []);

  useEffect(() => {
    if (isRunning) {
      // Analyze every 3 seconds
      intervalRef.current = setInterval(captureAndDetect, 3000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, captureAndDetect]);

  const isFake = result?.is_fake;
  const confidence = result ? (result.confidence * 100).toFixed(1) : null;

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <h2 className="text-2xl font-bold">🎥 Live Deepfake Detection</h2>

      {/* Video Feed */}
      <div className="relative">
        <video
          ref={videoRef}
          className="rounded-lg border-4"
          style={{
            borderColor: !result ? "#gray" : isFake ? "#ef4444" : "#22c55e",
            width: 480,
            height: 360,
            transform: "scaleX(-1)", // Mirror effect
          }}
          muted
          playsInline
        />
        <canvas ref={canvasRef} className="hidden" />

        {/* Live Badge */}
        {isRunning && (
          <div className="absolute top-2 left-2 bg-red-500 text-white px-2 py-1 rounded text-sm font-bold animate-pulse">
            ● LIVE
          </div>
        )}

        {/* Result Overlay */}
        {result && (
          <div
            className="absolute bottom-0 left-0 right-0 p-3 text-white text-center font-bold text-lg"
            style={{
              background: isFake
                ? "rgba(239, 68, 68, 0.85)"
                : "rgba(34, 197, 94, 0.85)",
            }}
          >
            {isFake ? "🔴 DEEPFAKE DETECTED" : "🟢 AUTHENTIC"} — {confidence}%
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex gap-4">
        {!isRunning ? (
          <button
            onClick={startCamera}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700"
          >
            📷 Start Camera
          </button>
        ) : (
          <button
            onClick={stopCamera}
            className="px-6 py-3 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700"
          >
            ⏹ Stop Camera
          </button>
        )}
      </div>

      {/* Stats */}
      {result && (
        <div className="grid grid-cols-3 gap-4 w-full max-w-md">
          <div className="bg-gray-100 rounded-lg p-3 text-center">
            <div className="text-sm text-gray-500">Verdict</div>
            <div
              className={`font-bold ${isFake ? "text-red-500" : "text-green-500"}`}
            >
              {result.verdict}
            </div>
          </div>
          <div className="bg-gray-100 rounded-lg p-3 text-center">
            <div className="text-sm text-gray-500">Confidence</div>
            <div className="font-bold">{confidence}%</div>
          </div>
          <div className="bg-gray-100 rounded-lg p-3 text-center">
            <div className="text-sm text-gray-500">Frames</div>
            <div className="font-bold">{frameCount}</div>
          </div>
        </div>
      )}

      {/* Reasons */}
      {result?.details?.reasons && result.details.reasons.length > 0 && (
        <div className="w-full max-w-md bg-gray-50 rounded-lg p-3">
          <div className="text-sm font-bold mb-2">Analysis:</div>
          {result.details.reasons.map((r, i) => (
            <div key={i} className="text-sm text-gray-600">
              • {r}
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="text-red-500 bg-red-50 p-3 rounded-lg">{error}</div>
      )}
    </div>
  );
}
