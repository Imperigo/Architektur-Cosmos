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

const relationColor: Record<RelationType, string> = {
  influences: '#ffd16d',
  responds_to: '#ff4d1f',
  shares_theme: '#00e7ff',
  same_author: '#b7ffef',
  same_place: '#65ff9a',
  typological_reference: '#9b6dff',
  material_reference: '#ff007a',
  context: '#f7f7f4'
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
        const relationStroke = isSelectedRelation ? '#fff8d6' : relationColor[relation.relation_type];
        const relationOpacity = isSelectedRelation ? 0.96 : selectedEntry ? 0.22 : 0.52;
        const path = relationPath(source, target);

        return (
          <g key={relation.id} className="relation-strand-group">
            <path
              className="relation-strand-glow"
              d={path}
              fill="none"
              stroke={relationStroke}
              strokeWidth={isSelectedRelation ? 4.8 : 2.6}
              strokeDasharray={relationDash[relation.relation_type]}
              opacity={relationOpacity * 0.26}
              filter="url(#wormhole-energy-glow)"
            />
            <path
              className="relation-strand"
              d={path}
              fill="none"
              stroke={relationStroke}
              strokeWidth={isSelectedRelation ? 2.2 : 1.18}
              strokeDasharray={relationDash[relation.relation_type]}
              opacity={relationOpacity}
            />
          </g>
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
