"use client";

import { useRef, useState, useEffect, useCallback } from "react";

interface SignatureCanvasProps {
  onSubmit: (signatureData: string, signatureType: "drawn" | "typed") => void;
  isPending: boolean;
}

export function SignatureCanvas({ onSubmit, isPending }: SignatureCanvasProps) {
  const [mode, setMode] = useState<"draw" | "type">("draw");
  const [hasDrawn, setHasDrawn] = useState(false);
  const [typedName, setTypedName] = useState("");
  const [isDrawing, setIsDrawing] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Resize canvas to container width, maintaining 2:1 aspect ratio
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Save current drawing before resize
    const imageData = canvas.toDataURL();
    const containerWidth = container.offsetWidth;
    const newHeight = Math.round(containerWidth / 2);

    canvas.width = containerWidth;
    canvas.height = newHeight;

    // Restore drawing after resize (if there was one)
    if (hasDrawn) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, containerWidth, newHeight);
      };
      img.src = imageData;
    }

    // Reset context properties after resize (resize clears them)
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, [hasDrawn]);

  useEffect(() => {
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    return () => window.removeEventListener("resize", resizeCanvas);
  }, [resizeCanvas]);

  // Switch to draw mode: clear state
  const handleModeSwitch = (newMode: "draw" | "type") => {
    setMode(newMode);
    if (newMode === "draw") {
      // Clear canvas when switching back
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (canvas && ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      setHasDrawn(false);
    }
  };

  // ── Pointer event handlers (works on mouse, touch, stylus) ──────────────────

  const getPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;

    const { x, y } = getPos(e);
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;

    const { x, y } = getPos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasDrawn(true);
  };

  const handlePointerUp = () => {
    setIsDrawing(false);
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const handleSubmit = () => {
    if (mode === "draw") {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const dataUrl = canvas.toDataURL("image/png");
      onSubmit(dataUrl, "drawn");
    } else {
      onSubmit(typedName.trim(), "typed");
    }
  };

  const canSubmit =
    !isPending &&
    (mode === "draw" ? hasDrawn : typedName.trim().length > 0);

  return (
    <div className="space-y-4">
      {/* Mode toggle */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => handleModeSwitch("draw")}
          className={`px-4 py-2 text-sm font-medium rounded-md border transition-colors ${
            mode === "draw"
              ? "bg-violet-600 text-white border-violet-600"
              : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
          }`}
        >
          Draw Signature
        </button>
        <button
          type="button"
          onClick={() => handleModeSwitch("type")}
          className={`px-4 py-2 text-sm font-medium rounded-md border transition-colors ${
            mode === "type"
              ? "bg-violet-600 text-white border-violet-600"
              : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
          }`}
        >
          Type Signature
        </button>
      </div>

      {mode === "draw" ? (
        <div>
          <div ref={containerRef} className="relative w-full">
            <canvas
              ref={canvasRef}
              style={{ touchAction: "none" }}
              className="w-full border-2 border-gray-300 rounded-lg cursor-crosshair bg-white"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
            />
            {!hasDrawn && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className="text-gray-400 text-sm select-none">
                  Sign here
                </span>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="mt-2 text-sm text-gray-500 hover:text-gray-700 underline"
          >
            Clear
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <label
              htmlFor="typed-signature"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Type your full name
            </label>
            <input
              id="typed-signature"
              type="text"
              value={typedName}
              onChange={(e) => setTypedName(e.target.value)}
              placeholder="Your full name"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
          {typedName.trim() && (
            <div className="border-2 border-gray-300 rounded-lg p-4 bg-white min-h-[80px] flex items-center">
              <span
                className="text-3xl text-gray-800"
                style={{
                  fontFamily: "Brush Script MT, cursive",
                  lineHeight: 1.2,
                }}
              >
                {typedName}
              </span>
            </div>
          )}
          {!typedName.trim() && (
            <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 bg-gray-50 min-h-[80px] flex items-center justify-center">
              <span className="text-gray-400 text-sm">
                Signature preview will appear here
              </span>
            </div>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={!canSubmit}
        className="w-full py-3 px-6 bg-violet-600 text-white font-medium rounded-lg transition-colors hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isPending ? (
          <>
            <svg
              className="animate-spin h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 6 2.477 6 12H0z"
              />
            </svg>
            Submitting...
          </>
        ) : (
          "Confirm Signature"
        )}
      </button>
    </div>
  );
}
