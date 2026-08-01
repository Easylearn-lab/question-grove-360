import { useState, useRef, useCallback } from "react";
import { X, ZoomIn, ImageIcon } from "lucide-react";

interface ZoomableImageProps {
  src: string;
  alt?: string;
  caption?: string;
  imageType?: string; // ECG, X-ray, CT, Clinical Photo, Histology
  maxHeight?: string;
  className?: string;
}

/**
 * ZoomableImage component for clinical images (ECGs, X-rays, CTs, clinical photos).
 * - Click to open fullscreen overlay
 * - Pinch-to-zoom on mobile (touch events)
 * - Scroll to zoom on desktop
 * - Drag to pan when zoomed in
 */
export function ZoomableImage({
  src,
  alt = "Clinical image",
  caption,
  imageType,
  maxHeight = "16rem",
  className = "",
}: ZoomableImageProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const lastTouchDistance = useRef<number | null>(null);
  const lastPosition = useRef({ x: 0, y: 0 });
  const dragStart = useRef({ x: 0, y: 0 });

  const open = () => {
    setIsOpen(true);
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const close = () => {
    setIsOpen(false);
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  // Desktop scroll zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.15 : 0.15;
    setScale((prev) => Math.min(Math.max(prev + delta, 0.5), 5));
  }, []);

  // Touch pinch-to-zoom
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (lastTouchDistance.current !== null) {
        const delta = (distance - lastTouchDistance.current) * 0.005;
        setScale((prev) => Math.min(Math.max(prev + delta, 0.5), 5));
      }
      lastTouchDistance.current = distance;
    } else if (e.touches.length === 1 && isDragging && scale > 1) {
      const dx = e.touches[0].clientX - dragStart.current.x;
      const dy = e.touches[0].clientY - dragStart.current.y;
      setPosition({
        x: lastPosition.current.x + dx,
        y: lastPosition.current.y + dy,
      });
    }
  }, [isDragging, scale]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1 && scale > 1) {
      setIsDragging(true);
      dragStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      lastPosition.current = { ...position };
    }
  }, [scale, position]);

  const handleTouchEnd = useCallback(() => {
    lastTouchDistance.current = null;
    setIsDragging(false);
  }, []);

  // Mouse drag for desktop
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (scale > 1) {
      setIsDragging(true);
      dragStart.current = { x: e.clientX, y: e.clientY };
      lastPosition.current = { ...position };
    }
  }, [scale, position]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging && scale > 1) {
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      setPosition({
        x: lastPosition.current.x + dx,
        y: lastPosition.current.y + dy,
      });
    }
  }, [isDragging, scale]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Double-click to reset zoom
  const handleDoubleClick = useCallback(() => {
    if (scale !== 1) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
    } else {
      setScale(2);
    }
  }, [scale]);

  const typeLabel = imageType ? `${imageType}` : "Image";

  return (
    <>
      {/* Thumbnail */}
      <div className={`relative group ${className}`}>
        <div
          className="relative rounded-lg overflow-hidden border border-slate-200 cursor-pointer transition-all hover:border-green-300 hover:shadow-sm"
          style={{ maxHeight }}
          onClick={open}
        >
          <img
            src={src}
            alt={alt}
            className="w-full h-full object-contain"
            style={{ maxHeight }}
            loading="lazy"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors flex items-center justify-center">
            <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 text-white px-3 py-1.5 rounded-full text-xs flex items-center gap-1.5">
              <ZoomIn className="w-3.5 h-3.5" /> Click to enlarge
            </div>
          </div>
        </div>
        {(caption || imageType) && (
          <div className="flex items-center gap-1.5 mt-1.5">
            <ImageIcon className="w-3 h-3 text-slate-400" />
            {imageType && (
              <span className="text-xs font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                {typeLabel}
              </span>
            )}
            {caption && (
              <span className="text-xs text-slate-500">{caption}</span>
            )}
          </div>
        )}
      </div>

      {/* Fullscreen overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center">
          {/* Controls */}
          <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
            <span className="text-white/60 text-xs bg-white/10 px-2 py-1 rounded">
              {Math.round(scale * 100)}%
            </span>
            <button
              onClick={close}
              className="bg-white/10 hover:bg-white/20 rounded-full p-2 transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* Zoom instructions */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 text-white/50 text-xs">
            {scale === 1 ? "Scroll or pinch to zoom · Double-click to 2x" : "Drag to pan · Double-click to reset"}
          </div>

          {/* Image container */}
          <div
            className="w-full h-full flex items-center justify-center overflow-hidden select-none"
            onWheel={handleWheel}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onDoubleClick={handleDoubleClick}
            style={{ cursor: scale > 1 ? (isDragging ? "grabbing" : "grab") : "zoom-in" }}
          >
            <img
              src={src}
              alt={alt}
              className="max-w-[90vw] max-h-[90vh] object-contain transition-transform duration-100"
              style={{
                transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
              }}
              draggable={false}
            />
          </div>

          {/* Caption in overlay */}
          {caption && (
            <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-10 text-white/80 text-sm bg-black/50 px-3 py-1.5 rounded-lg">
              {caption}
            </div>
          )}
        </div>
      )}
    </>
  );
}
