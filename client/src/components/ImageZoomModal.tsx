import { useState, useEffect } from "react";
import { X, ZoomIn, ZoomOut, Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ImageZoomModalProps {
  isOpen: boolean;
  imageUrl: string;
  imageTitle?: string;
  onClose: () => void;
}

export function ImageZoomModal({
  isOpen,
  imageUrl,
  imageTitle = "Clinical Image",
  onClose,
}: ImageZoomModalProps) {
  const [zoom, setZoom] = useState(100);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (isOpen) {
      setZoom(100);
      setPanOffset({ x: 0, y: 0 });
      setIsFullscreen(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "+") {
        setZoom((prev) => Math.min(prev + 10, 300));
      } else if (e.key === "-") {
        setZoom((prev) => Math.max(prev - 10, 50));
      } else if (e.key === "0") {
        setZoom(100);
        setPanOffset({ x: 0, y: 0 });
      } else if (e.key === "f") {
        setIsFullscreen((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (zoom > 100) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isDragging && zoom > 100) {
      setPanOffset({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 10, 300));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 10, 50));
  };

  const handleResetZoom = () => {
    setZoom(100);
    setPanOffset({ x: 0, y: 0 });
  };

  const handleToggleFullscreen = () => {
    setIsFullscreen((prev) => !prev);
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/80 z-50 transition-opacity"
        onClick={onClose}
      />

      <div
        className={`fixed z-50 transition-all ${
          isFullscreen
            ? "inset-0"
            : "inset-4 md:inset-8 lg:inset-12 rounded-lg overflow-hidden"
        }`}
      >
        <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/60 to-transparent p-4 flex items-center justify-between z-10">
          <div className="text-white">
            <h3 className="font-semibold text-lg">{imageTitle}</h3>
            <p className="text-sm text-gray-300">Zoom: {zoom}%</p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={handleZoomOut}
              className="text-white hover:bg-white/20"
              title="Zoom Out (- key)"
            >
              <ZoomOut className="w-4 h-4" />
            </Button>

            <Button
              size="sm"
              variant="ghost"
              onClick={handleResetZoom}
              className="text-white hover:bg-white/20"
              title="Reset Zoom (0 key)"
            >
              <span className="text-xs font-bold">100%</span>
            </Button>

            <Button
              size="sm"
              variant="ghost"
              onClick={handleZoomIn}
              className="text-white hover:bg-white/20"
              title="Zoom In (+ key)"
            >
              <ZoomIn className="w-4 h-4" />
            </Button>

            <div className="w-px h-6 bg-white/20" />

            <Button
              size="sm"
              variant="ghost"
              onClick={handleToggleFullscreen}
              className="text-white hover:bg-white/20"
              title="Toggle Fullscreen (f key)"
            >
              {isFullscreen ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </Button>

            <Button
              size="sm"
              variant="ghost"
              onClick={onClose}
              className="text-white hover:bg-white/20"
              title="Close (Esc key)"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div
          className="w-full h-full bg-black flex items-center justify-center overflow-hidden cursor-grab active:cursor-grabbing"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <img
            src={imageUrl}
            alt={imageTitle}
            className="select-none pointer-events-none transition-transform duration-150"
            style={{
              transform: `scale(${zoom / 100}) translate(${panOffset.x}px, ${panOffset.y}px)`,
              maxWidth: "100%",
              maxHeight: "100%",
              objectFit: "contain",
            }}
            draggable={false}
          />
        </div>

        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
          <p className="text-xs text-gray-300 text-center">
            <span className="font-semibold">Keyboard shortcuts:</span> +/- to zoom • 0 to reset • f for fullscreen • Esc to close
            {zoom > 100 && <span className="block mt-1">Drag to pan the image</span>}
          </p>
        </div>
      </div>
    </>
  );
}
