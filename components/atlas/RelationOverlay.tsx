import { atlasSize, type AtlasNode } from '@/lib/atlas-layout';
import type { Entry, EntryRelation, RelationType } from '@/lib/types';

type RelationOverlayProps = {
  nodes: AtlasNode[];
  relations: EntryRelation[];
  selectedEntry: Entry | null;
};

const relationDash: Record<RelationType, string | undefined> = {
  influences: undefined,
  responds_to: '5 6',
  shares_theme: '2 6',
  same_author: '10 4 2 4',
  same_place: '1 5',
  typological_reference: '7 4',
  material_reference: '3 3',
  context: '2 8'
};

export function RelationOverlay({ nodes, relations, selectedEntry }: RelationOverlayProps) {
  const nodeById = new Map(nodes.map((node) => [node.entry.id, node]));

  return (
    <g aria-label="Relationen" pointerEvents="none">
      {relations.map((relation) => {
        const source = nodeById.get(relation.source_entry_id);
        const target = nodeById.get(relation.target_entry_id);
        if (!source || !target) return null;

        const isSelectedRelation = selectedEntry
          ? relation.source_entry_id === selectedEntry.id || relation.target_entry_id === selectedEntry.id
          : false;

        return (
          <path
            key={relation.id}
            d={relationPath(source, target)}
            fill="none"
            stroke={isSelectedRelation ? '#f7f7f4' : '#8a8a8a'}
            strokeWidth={isSelectedRelation ? 1.75 : 0.95}
            strokeDasharray={relationDash[relation.relation_type]}
            opacity={isSelectedRelation ? 0.86 : selectedEntry ? 0.2 : 0.34}
          />
        );
      })}
    </g>
  );
}

function relationPath(source: AtlasNode, target: AtlasNode) {
  const midX = (source.x + target.x) / 2;
  const midY = (source.y + target.y) / 2;
  const controlX = roundPath(midX + (atlasSize.cx - midX) * 0.32);
  const controlY = roundPath(midY + (atlasSize.cy - midY) * 0.32);

  return `M ${source.x} ${source.y} Q ${controlX} ${controlY} ${target.x} ${target.y}`;
}

function roundPath(value: number) {
  return Math.round(value * 100) / 100;
}
