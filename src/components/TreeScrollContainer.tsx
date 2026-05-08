"use client";

import { useState, type ReactNode } from "react";

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2.5;
const ZOOM_STEP = 0.15;

type Props = {
  children: ReactNode;
  baseWidth: number;
  baseHeight: number;
};

/**
 * Scrollable, zoomable wrapper for the family-tree SVG. Keeps zoom state on
 * the client; the parent server component computes the layout and renders
 * the SVG into `children`. We simulate zoom by scaling an inner box and
 * giving an outer box the scaled dimensions so native scrollbars track
 * correctly as the user zooms in.
 */
export function TreeScrollContainer({
  children,
  baseWidth,
  baseHeight,
}: Props) {
  const [zoom, setZoom] = useState(1);

  const zoomIn = () =>
    setZoom((z) => Math.min(MAX_ZOOM, +(z + ZOOM_STEP).toFixed(2)));
  const zoomOut = () =>
    setZoom((z) => Math.max(MIN_ZOOM, +(z - ZOOM_STEP).toFixed(2)));
  const resetZoom = () => setZoom(1);

  return (
    <div className="relative">
      <div className="absolute top-3 right-3 z-10 flex flex-col gap-1">
        <button
          type="button"
          onClick={zoomIn}
          aria-label="Zoom in"
          disabled={zoom >= MAX_ZOOM}
          className="w-9 h-9 rounded-md bg-fh-green border border-fh-gold/60 text-white text-xl leading-none font-bold flex items-center justify-center hover:bg-fh-green/80 disabled:opacity-40 transition shadow"
        >
          +
        </button>
        <button
          type="button"
          onClick={resetZoom}
          aria-label="Reset zoom"
          disabled={zoom === 1}
          className="w-9 h-7 rounded-md bg-fh-green/70 border border-fh-gold/40 text-fh-gold text-[10px] font-semibold flex items-center justify-center hover:bg-fh-green disabled:opacity-40 transition"
        >
          {Math.round(zoom * 100)}%
        </button>
        <button
          type="button"
          onClick={zoomOut}
          aria-label="Zoom out"
          disabled={zoom <= MIN_ZOOM}
          className="w-9 h-9 rounded-md bg-fh-green border border-fh-gold/60 text-white text-xl leading-none font-bold flex items-center justify-center hover:bg-fh-green/80 disabled:opacity-40 transition shadow"
        >
          −
        </button>
      </div>

      <div className="tree-scroll border border-fh-gray/20 rounded-lg overflow-auto max-h-[80vh]">
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
