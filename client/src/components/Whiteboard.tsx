import { useState, useRef, useEffect } from "react";
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

interface WhiteboardProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Whiteboard({ isOpen, onClose }: WhiteboardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
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
  const [history, setHistory] = useState<ImageData[]>([]);
  const [backgroundColor, setBackgroundColor] = useState("white");
  const [activeStylusPointerId, setActiveStylusPointerId] = useState<number | null>(null);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size
    canvas.width = size.width - 8;
    canvas.height = size.height - 60;

    // Set background
    ctx.fillStyle = backgroundColor === "white" ? "#ffffff" : "transparent";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, [size, backgroundColor]);

  // Save canvas state to history
  const saveToHistory = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    setHistory([...history, ctx.getImageData(0, 0, canvas.width, canvas.height)]);
  };

  // Handle pointer down (mouse, touch, stylus)
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (panelState !== "open") return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    // Palm rejection: if stylus is active and this is touch, ignore it
    if (activeStylusPointerId !== null && e.pointerType === "touch") {
      return;
    }

    // Track stylus pointer ID for palm rejection
    if (e.pointerType === "pen") {
      setActiveStylusPointerId(e.pointerId);
    }

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (x >= 0 && x <= canvas.width && y >= 0 && y <= canvas.height) {
      setIsDrawing(true);
      saveToHistory();

      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.beginPath();
        ctx.moveTo(x, y);
      }
    }
  };

  // Handle pointer move (mouse, touch, stylus)
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing || panelState !== "open") return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    // Palm rejection: if stylus is active and this is touch, ignore it
    if (activeStylusPointerId !== null && e.pointerType === "touch" && e.pointerId !== activeStylusPointerId) {
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Get pressure sensitivity (0-1 for stylus, 0.5 for mouse/touch)
    const pressure = e.pressure || 0.5;
    // Use pressure to vary line width slightly for natural feel (0.5x to 1.5x)
    const pressureAdjustedWidth = lineWidth * (0.5 + pressure);

    if (mode === "pen") {
      ctx.strokeStyle = color;
      ctx.lineWidth = pressureAdjustedWidth;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineTo(x, y);
      ctx.stroke();
    } else if (mode === "eraser") {
      ctx.clearRect(x - pressureAdjustedWidth / 2, y - pressureAdjustedWidth / 2, pressureAdjustedWidth, pressureAdjustedWidth);
    }
  };

  // Handle pointer up (mouse, touch, stylus)
  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    // Clear stylus tracking when stylus pointer ends
    if (e.pointerType === "pen" && e.pointerId === activeStylusPointerId) {
      setActiveStylusPointerId(null);
    }
    setIsDrawing(false);
  };

  // Undo last stroke
  const handleUndo = () => {
    if (history.length === 0) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const newHistory = [...history];
    const previousState = newHistory.pop();

    if (previousState) {
      ctx.putImageData(previousState, 0, 0);
      setHistory(newHistory);
    }
  };

  // Clear canvas
  const handleClear = () => {
    if (!window.confirm("Clear all drawings? This cannot be undone.")) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = backgroundColor === "white" ? "#ffffff" : "transparent";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHistory([]);
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
        className="fixed bottom-6 right-6 w-12 h-12 bg-green-600 hover:bg-green-700 text-white rounded-full shadow-lg flex items-center justify-center z-40"
        title="Open whiteboard"
      >
        <Palette className="w-6 h-6" />
      </button>
    );
  }

  return (
    <Card
      className="fixed shadow-2xl border border-slate-300 flex flex-col bg-white z-50"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${size.width}px`,
        height: `${size.height}px`,
      }}
    >
      {/* Header */}
      <div
        onMouseDown={handleHeaderMouseDown}
        className="bg-gradient-to-r from-green-50 to-green-100 border-b border-green-200 px-4 py-3 flex items-center justify-between cursor-move select-none"
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
      <div className="bg-white border-b border-slate-200 px-3 py-2 flex flex-wrap gap-2 items-center">
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
            disabled={history.length === 0}
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

      {/* Canvas */}
      <div className="flex-1 bg-slate-50 overflow-hidden">
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          className="w-full h-full cursor-crosshair bg-white"
          style={{ touchAction: "none" }}
          onContextMenu={(e) => e.preventDefault()}
        />
      </div>

      {/* Resize handle */}
      <div
        onMouseDown={handleResizeMouseDown}
        className="absolute bottom-0 right-0 w-4 h-4 bg-green-600 cursor-se-resize rounded-tl"
        title="Drag to resize"
      />
    </Card>
  );
}
