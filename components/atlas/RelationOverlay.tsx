import { memo } from 'react';
import { atlasSize, type AtlasNode } from '@/lib/atlas-layout';
import type { Entry, EntryRelation, RelationType } from '@/lib/types';

type RelationNode = AtlasNode & {
  opacity?: number;
  depth?: number;
  closeness?: number;
};

type RelationOverlayProps = {
  nodes: RelationNode[];
  relations: EntryRelation[];
  selectedEntry: Entry | null;
  focusEntry?: Entry | null;
  isMoving?: boolean;
};

const relationDash: Record<RelationType, string | undefined> = {
  influences: undefined,
  responds_to: '5 6',
  shares_theme: '2 6',
  same_author: '10 4 2 4',
  same_place: '1 5',
  typological_reference: '7 4',
  structural_reference: '8 3 2 3',
  material_reference: '3 3',
  source_connection: '1 4 6 4',
  context: '2 8'
};

const relationColor: Record<RelationType, string> = {
  influences: '#ffd16d',
  responds_to: '#ff4d1f',
  shares_theme: '#00e7ff',
  same_author: '#b7ffef',
  same_place: '#65ff9a',
  typological_reference: '#9b6dff',
  structural_reference: '#f7f7f4',
  material_reference: '#ff007a',
  source_connection: '#00e7ff',
  context: '#f7f7f4'
};

function RelationOverlayComponent({ nodes, relations, selectedEntry, focusEntry = null, isMoving = false }: RelationOverlayProps) {
  const nodeById = new Map(nodes.map((node) => [node.entry.id, node]));
  const activeEntry = selectedEntry ?? focusEntry;
  const visibleRelations = isMoving && !selectedEntry
    ? relations.filter((_, index) => index % 4 === 0)
    : relations;
  const explicitRelationKeys = new Set(visibleRelations.map((relation) => relationKey(relation.source_entry_id, relation.target_entry_id)));
  const themeRelations = !isMoving && focusEntry ? themeNetworkRelations(focusEntry, nodes, explicitRelationKeys) : [];

  return (
    <g aria-label="Relationen" pointerEvents="none">
      {visibleRelations.map((relation) => {
        const source = nodeById.get(relation.source_entry_id);
        const target = nodeById.get(relation.target_entry_id);
        if (!source || !target) return null;

        const isSelectedRelation = activeEntry
          ? relation.source_entry_id === activeEntry.id || relation.target_entry_id === activeEntry.id
          : false;
        const visibility = relationVisibility(source, target);
        if (!isSelectedRelation && visibility < 0.18) return null;

        const relationStroke = isSelectedRelation ? '#fff8d6' : relationColor[relation.relation_type];
        const relationOpacity = isSelectedRelation ? 0.9 : activeEntry ? 0.16 * visibility : 0.3 * visibility;
        const relationWidth = isSelectedRelation ? 1.95 : 0.72 + visibility * 0.32;
        const path = relationPath(source, target);

        return (
          <g key={relation.id} className="relation-strand-group">
            <path
              className="relation-strand-glow"
              d={path}
              fill="none"
              stroke={relationStroke}
              strokeWidth={isSelectedRelation ? 3.2 : 1.4}
              strokeDasharray={relationDash[relation.relation_type]}
              opacity={isMoving ? 0 : relationOpacity * 0.18}
            />
            <path
              className="relation-strand"
              d={path}
              fill="none"
              stroke={relationStroke}
              strokeWidth={relationWidth}
              strokeDasharray={relationDash[relation.relation_type]}
              opacity={isMoving ? relationOpacity * 0.34 : relationOpacity}
            />
          </g>
        );
      })}
      {themeRelations.map(({ source, target, strength, reason }) => {
        const path = relationPath(source, target);
        return (
          <g key={`theme-${source.entry.id}-${target.entry.id}-${reason}`} className="relation-strand-group relation-theme-hover">
            <path d={path} fill="none" stroke={reason === 'style' ? '#ffd16d' : '#00e7ff'} strokeWidth={1.25 + strength * 0.55} strokeDasharray="1 7" opacity={0.32 + strength * 0.38} />
          </g>
        );
      })}
    </g>
  );
}

export const RelationOverlay = memo(RelationOverlayComponent);

function relationPath(source: RelationNode, target: RelationNode) {
  const midX = (source.x + target.x) / 2;
  const midY = (source.y + target.y) / 2;
  const distance = Math.hypot(target.x - source.x, target.y - source.y);
  const direction = shortestAngleDelta(source.angle, target.angle) >= 0 ? 1 : -1;
  const bend = Math.min(116, Math.max(24, distance * 0.2));
  const sourceTangent = tangentUnit(source.x, source.y, direction);
  const targetTangent = tangentUnit(target.x, target.y, direction);
  const centerPull = distance > 260 ? 0.22 : 0.14;
  const controlAX = roundPath(source.x + (atlasSize.cx - source.x) * centerPull + sourceTangent.x * bend);
  const controlAY = roundPath(source.y + (atlasSize.cy - source.y) * centerPull + sourceTangent.y * bend);
  const controlBX = roundPath(target.x + (atlasSize.cx - target.x) * centerPull - targetTangent.x * bend);
  const controlBY = roundPath(target.y + (atlasSize.cy - target.y) * centerPull - targetTangent.y * bend);

  if (distance < 90) {
    const controlX = roundPath(midX + (atlasSize.cx - midX) * 0.18 + sourceTangent.x * bend * 0.42);
    const controlY = roundPath(midY + (atlasSize.cy - midY) * 0.18 + sourceTangent.y * bend * 0.42);
    return `M ${source.x} ${source.y} Q ${controlX} ${controlY} ${target.x} ${target.y}`;
  }

  return `M ${source.x} ${source.y} C ${controlAX} ${controlAY} ${controlBX} ${controlBY} ${target.x} ${target.y}`;
}

function relationVisibility(source: RelationNode, target: RelationNode) {
  const depthGap = Math.abs((source.depth ?? 0.5) - (target.depth ?? 0.5));
  const opacity = Math.min(source.opacity ?? 1, target.opacity ?? 1);
  const focusBoost = Math.max(source.closeness ?? 0, target.closeness ?? 0) * 0.18;
  return Math.max(0, Math.min(1, opacity * (0.85 - depthGap * 1.35) + focusBoost));
}

function themeNetworkRelations(focusEntry: Entry, nodes: RelationNode[], explicitRelationKeys: Set<string>) {
  const source = nodes.find((node) => node.entry.id === focusEntry.id);
  if (!source) return [];

  return nodes
    .filter((node) => node.entry.id !== focusEntry.id && !explicitRelationKeys.has(relationKey(focusEntry.id, node.entry.id)))
    .map((target) => {
      const sharedThemes = focusEntry.themes.filter((theme) => target.entry.themes.includes(theme)).length;
      const sameStyle = target.entry.style_sector === focusEntry.style_sector;
      const sameSource = sourceBucket(target.entry) && sourceBucket(target.entry) === sourceBucket(focusEntry);
      const strength = Math.min(1, sharedThemes * 0.34 + (sameStyle ? 0.28 : 0) + (sameSource ? 0.24 : 0));
      const reason = sharedThemes ? 'theme' : sameStyle ? 'style' : 'source';
      return { source, target, strength, reason };
    })
    .filter((item) => item.strength >= 0.28)
    .sort((a, b) => b.strength - a.strength)
    .slice(0, 18);
}

function sourceBucket(entry: Entry) {
  const sourceText = [entry.source_url, ...(entry.source_documents ?? [])].join(' ').toLowerCase();
  if (sourceText.includes('afasia')) return 'afasia';
  if (sourceText.includes('landschaft')) return 'landschaft';
  if (sourceText.includes('global')) return 'global-history';
  if (sourceText.includes('architekturgeschichte')) return 'architecture-history';
  return '';
}

function relationKey(a: string, b: string) {
  return [a, b].sort().join('::');
}

function tangentUnit(x: number, y: number, direction: number) {
  const dx = x - atlasSize.cx;
  const dy = y - atlasSize.cy;
  const length = Math.hypot(dx, dy) || 1;
  return {
    x: (-dy / length) * direction,
    y: (dx / length) * direction
  };
}

function shortestAngleDelta(a: number, b: number) {
  return ((((a - b) % 360) + 540) % 360) - 180;
}

function roundPath(value: number) {
  return Math.round(value * 100) / 100;
}
