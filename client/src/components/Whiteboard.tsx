import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Maximize2,
  Minimize2,
  X,
  Undo2,
  Trash2,
  Palette,
  Minus,
} from "lucide-react";

type DrawingMode = "pen" | "eraser";
type PanelState = "open" | "minimized" | "closed";

interface Stroke {
  points: { x: number; y: number; pressure: number }[];
  color: string;
  lineWidth: number;
  mode: DrawingMode;
}

interface WhiteboardProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Whiteboard({ isOpen, onClose }: WhiteboardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<DrawingMode>("pen");
  const [color, setColor] = useState("#000000");
  const [lineWidth, setLineWidth] = useState(2);
  const [panelState, setPanelState] = useState<PanelState>("open");
  const [position, setPosition] = useState({ x: 20, y: 80 });
  const [size, setSize] = useState({ width: 400, height: 500 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isResizing, setIsResizing] = useState(false);
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0 });
  const [backgroundColor, setBackgroundColor] = useState("white");
  const [activeStylusPointerId, setActiveStylusPointerId] = useState<number | null>(null);

  // Store strokes as data, not ImageData — allows proper redraw on resize
  const strokesRef = useRef<Stroke[]>([]);
  const currentStrokeRef = useRef<Stroke | null>(null);
  const isDrawingRef = useRef(false);
  const [strokeCount, setStrokeCount] = useState(0); // triggers re-render for undo button state

  // Redraw all strokes on the canvas
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    if (backgroundColor === "white") {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    // Redraw all completed strokes
    for (const stroke of strokesRef.current) {
      drawStroke(ctx, stroke);
    }

    // Draw current in-progress stroke
    if (currentStrokeRef.current) {
      drawStroke(ctx, currentStrokeRef.current);
    }
  }, [backgroundColor]);

  // Draw a single stroke on the canvas
  const drawStroke = (ctx: CanvasRenderingContext2D, stroke: Stroke) => {
    if (stroke.points.length < 2) return;

    if (stroke.mode === "eraser") {
      const savedComposite = ctx.globalCompositeOperation;
      ctx.globalCompositeOperation = "destination-out";
      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.lineWidth = stroke.lineWidth * 3;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.stroke();
      ctx.globalCompositeOperation = savedComposite;
    } else {
      // Draw pen stroke with pressure-varying width using segments
      ctx.strokeStyle = stroke.color;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.globalCompositeOperation = "source-over";

      for (let i = 1; i < stroke.points.length; i++) {
        const prev = stroke.points[i - 1];
        const curr = stroke.points[i];
        const pressure = curr.pressure || 0.5;
        const width = stroke.lineWidth * (0.5 + pressure);

        ctx.beginPath();
        ctx.moveTo(prev.x, prev.y);
        ctx.lineTo(curr.x, curr.y);
        ctx.lineWidth = width;
        ctx.stroke();
      }
    }
  };

  // Resize canvas to match container — preserves strokes via redraw
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    // Set the canvas internal resolution to match the display size * DPR
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    // Scale the context so drawing coordinates match CSS pixels
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.scale(dpr, dpr);
    }

    redrawCanvas();
  }, [redrawCanvas]);

  // Initialize and resize canvas when panel size changes
  useEffect(() => {
    if (panelState !== "open") return;
    // Small delay to let DOM layout settle
    const timer = setTimeout(resizeCanvas, 50);
    return () => clearTimeout(timer);
  }, [size, panelState, resizeCanvas]);

  // Also resize on window resize
  useEffect(() => {
    window.addEventListener("resize", resizeCanvas);
    return () => window.removeEventListener("resize", resizeCanvas);
  }, [resizeCanvas]);

  // Get canvas-relative coordinates
  const getCanvasPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  // Handle pointer down (mouse, touch, stylus)
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (panelState !== "open") return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    // Prevent default browser behaviour (scrolling, zooming, text selection)
    e.preventDefault();
    e.stopPropagation();

    // Palm rejection: if stylus is active and this is touch, ignore it
    if (activeStylusPointerId !== null && e.pointerType === "touch") {
      return;
    }

    // Track stylus pointer ID for palm rejection
    if (e.pointerType === "pen") {
      setActiveStylusPointerId(e.pointerId);
    }

    // Capture the pointer so we get events even if pointer leaves canvas
    canvas.setPointerCapture(e.pointerId);

    const point = getCanvasPoint(e);
    const pressure = e.pressure || 0.5;

    isDrawingRef.current = true;
    currentStrokeRef.current = {
      points: [{ x: point.x, y: point.y, pressure }],
      color,
      lineWidth,
      mode,
    };
  };

  // Handle pointer move (mouse, touch, stylus)
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || panelState !== "open") return;

    // Prevent default browser behaviour
    e.preventDefault();
    e.stopPropagation();

    // Palm rejection: if stylus is active and this is touch, ignore it
    if (activeStylusPointerId !== null && e.pointerType === "touch" && e.pointerId !== activeStylusPointerId) {
      return;
    }

    const point = getCanvasPoint(e);
    const pressure = e.pressure || 0.5;

    if (currentStrokeRef.current) {
      currentStrokeRef.current.points.push({ x: point.x, y: point.y, pressure });

      // Draw only the latest segment for performance (incremental rendering)
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const points = currentStrokeRef.current.points;
      const len = points.length;
      if (len < 2) return;

      const prev = points[len - 2];
      const curr = points[len - 1];

      if (currentStrokeRef.current.mode === "eraser") {
        const savedComposite = ctx.globalCompositeOperation;
        ctx.globalCompositeOperation = "destination-out";
        ctx.beginPath();
        ctx.moveTo(prev.x, prev.y);
        ctx.lineTo(curr.x, curr.y);
        ctx.lineWidth = currentStrokeRef.current.lineWidth * 3;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.stroke();
        ctx.globalCompositeOperation = savedComposite;
      } else {
        const width = currentStrokeRef.current.lineWidth * (0.5 + pressure);
        ctx.globalCompositeOperation = "source-over";
        ctx.strokeStyle = currentStrokeRef.current.color;
        ctx.lineWidth = width;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.beginPath();
        ctx.moveTo(prev.x, prev.y);
        ctx.lineTo(curr.x, curr.y);
        ctx.stroke();
      }
    }
  };

  // Handle pointer up (mouse, touch, stylus)
  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    // Prevent default browser behaviour
    e.preventDefault();

    // Release pointer capture
    const canvas = canvasRef.current;
    if (canvas) {
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch {
        // Ignore if capture was already released
      }
    }

    // Clear stylus tracking when stylus pointer ends
    if (e.pointerType === "pen" && e.pointerId === activeStylusPointerId) {
      setActiveStylusPointerId(null);
    }

    if (isDrawingRef.current && currentStrokeRef.current) {
      // Only save strokes with at least 2 points
      if (currentStrokeRef.current.points.length >= 2) {
        strokesRef.current.push(currentStrokeRef.current);
        setStrokeCount(strokesRef.current.length);
      }
      currentStrokeRef.current = null;
    }

    isDrawingRef.current = false;
  };

  // Undo last stroke
  const handleUndo = () => {
    if (strokesRef.current.length === 0) return;
    strokesRef.current.pop();
    setStrokeCount(strokesRef.current.length);
    redrawCanvas();
  };

  // Clear canvas
  const handleClear = () => {
    if (!window.confirm("Clear all drawings? This cannot be undone.")) return;
    strokesRef.current = [];
    currentStrokeRef.current = null;
    setStrokeCount(0);
    redrawCanvas();
  };

  // Handle panel drag
  const handleHeaderMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("button")) return;
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      setPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y,
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  // Handle panel resize
  const handleResizeMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsResizing(true);
    setResizeStart({ x: e.clientX, y: e.clientY });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const deltaX = e.clientX - resizeStart.x;
      const deltaY = e.clientY - resizeStart.y;

      setSize({
        width: Math.max(300, size.width + deltaX),
        height: Math.max(200, size.height + deltaY),
      });
      setResizeStart({ x: e.clientX, y: e.clientY });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing, resizeStart, size]);

  if (!isOpen || panelState === "closed") return null;

  if (panelState === "minimized") {
    return (
      <button
        onClick={() => setPanelState("open")}
        className="fixed bottom-6 right-6 w-12 h-12 bg-green-600 hover:bg-green-700 text-white rounded-full shadow-lg flex items-center justify-center z-[9999]"
        title="Open whiteboard"
      >
        <Palette className="w-6 h-6" />
      </button>
    );
  }

  return (
    <Card
      className="fixed shadow-2xl border border-slate-300 flex flex-col bg-white"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${size.width}px`,
        height: `${size.height}px`,
        zIndex: 9999,
      }}
    >
      {/* Header */}
      <div
        onMouseDown={handleHeaderMouseDown}
        className="bg-gradient-to-r from-green-50 to-green-100 border-b border-green-200 px-4 py-3 flex items-center justify-between cursor-move select-none shrink-0"
      >
        <div className="flex items-center gap-2">
          <Palette className="w-5 h-5 text-green-600" />
          <h3 className="font-semibold text-slate-900">Whiteboard</h3>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              setPanelState(panelState === "open" ? "minimized" : "open")
            }
            className="h-8 w-8 p-0"
          >
            {panelState === "open" ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setPanelState("closed");
              onClose();
            }}
            className="h-8 w-8 p-0"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white border-b border-slate-200 px-3 py-2 flex flex-wrap gap-2 items-center shrink-0">
        {/* Mode */}
        <div className="flex gap-1 border-r border-slate-200 pr-2">
          <Button
            variant={mode === "pen" ? "default" : "outline"}
            size="sm"
            onClick={() => setMode("pen")}
            className={mode === "pen" ? "bg-green-600 hover:bg-green-700" : ""}
          >
            Pen
          </Button>
          <Button
            variant={mode === "eraser" ? "default" : "outline"}
            size="sm"
            onClick={() => setMode("eraser")}
            className={
              mode === "eraser" ? "bg-green-600 hover:bg-green-700" : ""
            }
          >
            Eraser
          </Button>
        </div>

        {/* Color picker */}
        <div className="flex gap-1 border-r border-slate-200 pr-2">
          {["#000000", "#FF0000", "#0000FF", "#00AA00", "#FFFF00", "#FFFFFF"].map(
            (c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`w-6 h-6 rounded border-2 ${
                  color === c ? "border-slate-900" : "border-slate-300"
                }`}
                style={{ backgroundColor: c }}
                title={c}
              />
            )
          )}
        </div>

        {/* Line width */}
        <div className="flex gap-1 border-r border-slate-200 pr-2 items-center">
          <Minus className="w-4 h-4 text-slate-500" />
          <select
            value={lineWidth}
            onChange={(e) => setLineWidth(Number(e.target.value))}
            className="text-xs px-2 py-1 border border-slate-300 rounded"
          >
            <option value={1}>Thin</option>
            <option value={2}>Medium</option>
            <option value={4}>Thick</option>
          </select>
        </div>

        {/* Background */}
        <div className="flex gap-1 border-r border-slate-200 pr-2">
          <Button
            variant={backgroundColor === "white" ? "default" : "outline"}
            size="sm"
            onClick={() => setBackgroundColor("white")}
            className={
              backgroundColor === "white"
                ? "bg-green-600 hover:bg-green-700"
                : ""
            }
          >
            White
          </Button>
          <Button
            variant={backgroundColor === "transparent" ? "default" : "outline"}
            size="sm"
            onClick={() => setBackgroundColor("transparent")}
            className={
              backgroundColor === "transparent"
                ? "bg-green-600 hover:bg-green-700"
                : ""
            }
          >
            Clear
          </Button>
        </div>

        {/* Actions */}
        <div className="flex gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={handleUndo}
            disabled={strokeCount === 0}
            className="h-8 w-8 p-0"
          >
            <Undo2 className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleClear}
            className="h-8 w-8 p-0"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Canvas container — no overflow hidden, canvas fills this area */}
      <div ref={containerRef} className="flex-1 relative bg-white">
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onContextMenu={(e) => e.preventDefault()}
          className="absolute inset-0 w-full h-full cursor-crosshair"
          style={{
            touchAction: "none",
            WebkitTouchCallout: "none",
            WebkitUserSelect: "none",
            userSelect: "none",
          }}
        />
      </div>

      {/* Resize handle */}
      <div
        onMouseDown={handleResizeMouseDown}
        className="absolute bottom-0 right-0 w-4 h-4 bg-green-600 cursor-se-resize rounded-tl"
        style={{ zIndex: 10000 }}
        title="Drag to resize"
      />
    </Card>
  );
}
