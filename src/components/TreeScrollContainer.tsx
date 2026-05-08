"use client";

import {
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from "react";

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2.5;
const ZOOM_STEP = 0.15;
const DRAG_THRESHOLD = 5; // px before a hold counts as a pan vs a click

type Props = {
  children: ReactNode;
  baseWidth: number;
  baseHeight: number;
};

/**
 * Scrollable, zoomable, click-and-drag-pannable wrapper for the family-tree
 * SVG. Layout stays on the server; we only need a client component because
 * zoom and pan are inherently stateful interactions.
 */
export function TreeScrollContainer({
  children,
  baseWidth,
  baseHeight,
}: Props) {
  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const dragState = useRef({
    armed: false,
    panning: false,
    startX: 0,
    startY: 0,
    scrollLeft: 0,
    scrollTop: 0,
  });

  const zoomIn = () =>
    setZoom((z) => Math.min(MAX_ZOOM, +(z + ZOOM_STEP).toFixed(2)));
  const zoomOut = () =>
    setZoom((z) => Math.max(MIN_ZOOM, +(z - ZOOM_STEP).toFixed(2)));
  const resetZoom = () => setZoom(1);

  const handleMouseDown = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return; // left button only
    const el = scrollRef.current;
    if (!el) return;
    dragState.current = {
      armed: true,
      panning: false,
      startX: e.clientX,
      startY: e.clientY,
      scrollLeft: el.scrollLeft,
      scrollTop: el.scrollTop,
    };
  };

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      const ds = dragState.current;
      const el = scrollRef.current;
      if (!ds.armed || !el) return;
      const dx = e.clientX - ds.startX;
      const dy = e.clientY - ds.startY;
      if (!ds.panning && Math.hypot(dx, dy) > DRAG_THRESHOLD) {
        ds.panning = true;
        setIsPanning(true);
      }
      if (ds.panning) {
        el.scrollLeft = ds.scrollLeft - dx;
        el.scrollTop = ds.scrollTop - dy;
      }
    };

    const onMouseUp = () => {
      const wasPanning = dragState.current.panning;
      dragState.current.armed = false;
      dragState.current.panning = false;
      if (!wasPanning) return;
      setIsPanning(false);
      // The click that follows mouseup would otherwise navigate to whichever
      // node we happened to release over. Swallow it once.
      const blockClick = (event: MouseEvent) => {
        event.stopPropagation();
        event.preventDefault();
        window.removeEventListener("click", blockClick, true);
      };
      window.addEventListener("click", blockClick, true);
      window.setTimeout(() => {
        window.removeEventListener("click", blockClick, true);
      }, 200);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  return (
    <div className="relative">
      <div className="absolute top-3 right-3 z-10 flex flex-col gap-1">
        <button
          type="button"
          onClick={zoomIn}
          aria-label="Zoom in"
          disabled={zoom >= MAX_ZOOM}
          className="cursor-pointer disabled:cursor-not-allowed w-9 h-9 rounded-md bg-fh-green border border-fh-gold/60 text-white text-xl leading-none font-bold flex items-center justify-center hover:bg-fh-green/80 disabled:opacity-40 transition shadow"
        >
          +
        </button>
        <button
          type="button"
          onClick={resetZoom}
          aria-label="Reset zoom"
          disabled={zoom === 1}
          className="cursor-pointer disabled:cursor-not-allowed w-9 h-7 rounded-md bg-fh-green/70 border border-fh-gold/40 text-fh-gold text-[10px] font-semibold flex items-center justify-center hover:bg-fh-green disabled:opacity-40 transition"
        >
          {Math.round(zoom * 100)}%
        </button>
        <button
          type="button"
          onClick={zoomOut}
          aria-label="Zoom out"
          disabled={zoom <= MIN_ZOOM}
          className="cursor-pointer disabled:cursor-not-allowed w-9 h-9 rounded-md bg-fh-green border border-fh-gold/60 text-white text-xl leading-none font-bold flex items-center justify-center hover:bg-fh-green/80 disabled:opacity-40 transition shadow"
        >
          −
        </button>
      </div>

      <div
        ref={scrollRef}
        onMouseDown={handleMouseDown}
        className={`tree-scroll border border-fh-gray/20 rounded-lg overflow-auto max-h-[80vh] ${
          isPanning ? "cursor-grabbing" : "cursor-grab"
        }`}
        style={{ userSelect: isPanning ? "none" : undefined }}
      >
        <div
          style={{
            width: baseWidth * zoom,
            height: baseHeight * zoom,
          }}
        >
          <div
            style={{
              width: baseWidth,
              height: baseHeight,
              transform: `scale(${zoom})`,
              transformOrigin: "top left",
            }}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
