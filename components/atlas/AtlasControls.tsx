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
    <div className="group absolute bottom-4 left-1/2 z-20 flex origin-bottom -translate-x-1/2 scale-75 items-center border border-[#f7f7f4]/70 bg-[#050505]/82 text-xs text-[#f7f7f4] opacity-55 shadow-[2px_2px_0_#f7f7f4] backdrop-blur-md transition-all duration-300 ease-out hover:scale-100 hover:opacity-100 hover:shadow-[4px_4px_0_#f7f7f4]">
      <button title="Zoom out" onClick={onZoomOut} className="h-8 w-8 border-r border-[#f7f7f4]/70 transition-transform duration-200 hover:scale-125 hover:bg-[#f7f7f4] hover:text-[#050505]">
        -
      </button>
      <span className="min-w-14 border-r border-[#f7f7f4]/70 px-2 text-center text-[10px] uppercase tracking-[0.14em] text-neutral-300">
        {Math.round(scale * 100)}%
      </span>
      <span className="hidden h-8 min-w-24 items-center justify-center border-r border-[#f7f7f4]/70 px-2 text-[10px] uppercase tracking-[0.14em] text-neutral-300 sm:flex">
        {zoomModeLabel}
      </span>
      <button title="Zoom in" onClick={onZoomIn} className="h-8 w-8 border-r border-[#f7f7f4]/70 transition-transform duration-200 hover:scale-125 hover:bg-[#f7f7f4] hover:text-[#050505]">
        +
      </button>
      <button title="Reset view" onClick={onReset} className="h-8 border-r border-[#f7f7f4]/70 px-2 text-[10px] uppercase tracking-[0.14em] transition-transform duration-200 hover:scale-110 hover:bg-[#f7f7f4] hover:text-[#050505]">
        Reset
      </button>
      <button
        title="Toggle relation overlay"
        onClick={onToggleRelations}
        className={`h-8 px-2 text-[10px] uppercase tracking-[0.14em] transition-transform duration-200 hover:scale-110 hover:bg-[#f7f7f4] hover:text-[#050505] ${showRelations ? 'bg-[#f7f7f4] text-[#050505]' : ''}`}
      >
        Relations {relationCount}
      </button>
    </div>
  );
}
