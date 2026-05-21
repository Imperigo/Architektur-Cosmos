import { polarToCartesian } from '@/lib/polar-coordinates';
import type { MouseEvent as ReactMouseEvent } from 'react';

type RadialLetterTextProps = {
  text: string;
  cx: number;
  cy: number;
  radius: number;
  angle: number;
  fontSize: number;
  fill: string;
  opacity?: number;
  fontWeight?: number | string;
  letterAngleStep?: number;
  stroke?: string;
  strokeWidth?: number;
  className?: string;
  inward?: boolean;
  fontStyle?: 'normal' | 'italic';
  onClick?: (event: ReactMouseEvent<SVGTextElement>) => void;
};

export function RadialLetterText({
  text,
  cx,
  cy,
  radius,
  angle,
  fontSize,
  fill,
  opacity = 1,
  fontWeight = 500,
  letterAngleStep,
  stroke = '#050505',
  strokeWidth = 2.6,
  className,
  inward = true,
  fontStyle = 'normal',
  onClick
}: RadialLetterTextProps) {
  const letters = [...text];
  const normalizedAngle = ((angle % 360) + 360) % 360;
  const direction = normalizedAngle > 90 && normalizedAngle < 270 ? -1 : 1;
  const baseStep = letterAngleStep ?? Math.max(1.2, Math.min(3.6, fontSize * 38 / Math.max(80, radius)));
  const step = Math.abs(baseStep) * direction;
  const startAngle = angle - ((letters.length - 1) * step) / 2;

  return (
    <g className={className} opacity={opacity} aria-label={text} pointerEvents="none">
      {letters.map((letter, index) => {
        const letterAngle = startAngle + index * step;
        const point = polarToCartesian(cx, cy, radius, letterAngle);
        const radialRotation = inward ? letterAngle + 180 : letterAngle;
        const normalizedRotation = ((radialRotation % 360) + 360) % 360;
        const rotation = normalizedRotation > 90 && normalizedRotation < 270
          ? radialRotation + 180
          : radialRotation;

        return (
          <text
            key={`${letter}-${index}`}
            x={point.x}
            y={point.y}
            textAnchor="middle"
            dominantBaseline="central"
            fill={fill}
            fontSize={fontSize}
            fontWeight={fontWeight}
            fontStyle={fontStyle}
            fontFamily="var(--font-sans), system-ui, sans-serif"
            letterSpacing="0"
            stroke={stroke}
            strokeWidth={strokeWidth}
            paintOrder="stroke"
            transform={`rotate(${rotation} ${point.x} ${point.y})`}
            pointerEvents={onClick ? 'visiblePainted' : 'none'}
            onClick={onClick}
          >
            {letter === ' ' ? '\u00a0' : letter}
          </text>
        );
      })}
    </g>
  );
}
