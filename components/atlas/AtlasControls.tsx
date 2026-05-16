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
    <div className="absolute bottom-5 left-1/2 z-20 flex -translate-x-1/2 items-center border border-[#f7f7f4] bg-[#050505]/95 text-sm text-[#f7f7f4] shadow-[4px_4px_0_#f7f7f4]">
      <button title="Zoom out" onClick={onZoomOut} className="h-10 w-10 border-r border-[#f7f7f4] hover:bg-[#f7f7f4] hover:text-[#050505]">
        -
      </button>
      <span className="min-w-16 border-r border-[#f7f7f4] px-3 text-center text-xs uppercase tracking-[0.16em] text-neutral-300">
        {Math.round(scale * 100)}%
      </span>
      <span className="hidden h-10 min-w-28 items-center justify-center border-r border-[#f7f7f4] px-3 text-xs uppercase tracking-[0.16em] text-neutral-300 sm:flex">
        {zoomModeLabel}
      </span>
      <button title="Zoom in" onClick={onZoomIn} className="h-10 w-10 border-r border-[#f7f7f4] hover:bg-[#f7f7f4] hover:text-[#050505]">
        +
      </button>
      <button title="Reset view" onClick={onReset} className="h-10 border-r border-[#f7f7f4] px-3 text-xs uppercase tracking-[0.16em] hover:bg-[#f7f7f4] hover:text-[#050505]">
        Reset
      </button>
      <button
        title="Toggle relation overlay"
        onClick={onToggleRelations}
        className={`h-10 px-3 text-xs uppercase tracking-[0.16em] hover:bg-[#f7f7f4] hover:text-[#050505] ${showRelations ? 'bg-[#f7f7f4] text-[#050505]' : ''}`}
      >
        Relations {relationCount}
      </button>
    </div>
  );
}
