type AtlasControlsProps = {
  scale: number;
  zoomModeLabel: string;
  showRelations: boolean;
  relationCount: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  onToggleRelations: () => void;
};

export function AtlasControls({
  scale,
  zoomModeLabel,
  showRelations,
  relationCount,
  onZoomIn,
  onZoomOut,
  onReset,
  onToggleRelations
}: AtlasControlsProps) {
  return (
    <div className="absolute bottom-5 left-1/2 z-20 flex -translate-x-1/2 items-center border border-neutral-900 bg-[#f7f7f4]/95 text-sm shadow-[4px_4px_0_#111]">
      <button title="Zoom out" onClick={onZoomOut} className="h-10 w-10 border-r border-neutral-900 hover:bg-neutral-900 hover:text-[#f7f7f4]">
        -
      </button>
      <span className="min-w-16 border-r border-neutral-900 px-3 text-center text-xs uppercase tracking-[0.16em] text-neutral-600">
        {Math.round(scale * 100)}%
      </span>
      <span className="hidden h-10 min-w-28 items-center justify-center border-r border-neutral-900 px-3 text-xs uppercase tracking-[0.16em] text-neutral-600 sm:flex">
        {zoomModeLabel}
      </span>
      <button title="Zoom in" onClick={onZoomIn} className="h-10 w-10 border-r border-neutral-900 hover:bg-neutral-900 hover:text-[#f7f7f4]">
        +
      </button>
      <button title="Reset view" onClick={onReset} className="h-10 border-r border-neutral-900 px-3 text-xs uppercase tracking-[0.16em] hover:bg-neutral-900 hover:text-[#f7f7f4]">
        Reset
      </button>
      <button
        title="Toggle relation overlay"
        onClick={onToggleRelations}
        className={`h-10 px-3 text-xs uppercase tracking-[0.16em] hover:bg-neutral-900 hover:text-[#f7f7f4] ${showRelations ? 'bg-neutral-950 text-[#f7f7f4]' : ''}`}
      >
        Relations {relationCount}
      </button>
    </div>
  );
}
