import { GitBranch, Minus, Plus, RotateCcw } from 'lucide-react';

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
      <button type="button" title="Atlas verkleinern" aria-label="Atlas verkleinern" onClick={onZoomOut} className="flex h-8 w-8 items-center justify-center border-r border-[#f7f7f4]/70 transition-transform duration-200 hover:scale-125 hover:bg-[#f7f7f4] hover:text-[#050505]">
        <Minus className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
      </button>
      <span className="min-w-14 border-r border-[#f7f7f4]/70 px-2 text-center text-[10px] uppercase tracking-[0.14em] text-neutral-300">
        {Math.round(scale * 100)}%
      </span>
      <span className="hidden h-8 min-w-24 items-center justify-center border-r border-[#f7f7f4]/70 px-2 text-[10px] uppercase tracking-[0.14em] text-neutral-300 sm:flex">
        {zoomModeLabel}
      </span>
      <button type="button" title="Atlas vergrössern" aria-label="Atlas vergrössern" onClick={onZoomIn} className="flex h-8 w-8 items-center justify-center border-r border-[#f7f7f4]/70 transition-transform duration-200 hover:scale-125 hover:bg-[#f7f7f4] hover:text-[#050505]">
        <Plus className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
      </button>
      <button type="button" title="Ansicht zurücksetzen" aria-label="Ansicht zurücksetzen" onClick={onReset} className="flex h-8 items-center gap-1.5 border-r border-[#f7f7f4]/70 px-2 text-[10px] uppercase tracking-[0.14em] transition-transform duration-200 hover:scale-110 hover:bg-[#f7f7f4] hover:text-[#050505]">
        <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
        <span>1:1</span>
      </button>
      <button
        type="button"
        title={showRelations ? 'Relationen ausblenden' : 'Relationen einblenden'}
        aria-label={showRelations ? 'Relationen ausblenden' : 'Relationen einblenden'}
        onClick={onToggleRelations}
        className={`flex h-8 items-center gap-1.5 px-2 text-[10px] uppercase tracking-[0.14em] transition-transform duration-200 hover:scale-110 hover:bg-[#f7f7f4] hover:text-[#050505] ${showRelations ? 'bg-[#f7f7f4] text-[#050505]' : ''}`}
      >
        <GitBranch className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
        <span>Relationen {relationCount}</span>
      </button>
    </div>
  );
}
