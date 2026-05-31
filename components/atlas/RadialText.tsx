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
  onClick?: (event: ReactMouseEvent<SVGElement>) => void;
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
  const centerRadialRotation = inward ? angle + 180 : angle;
  const normalizedCenterRotation = ((centerRadialRotation % 360) + 360) % 360;
  const centerNeedsFlip = normalizedCenterRotation > 90 && normalizedCenterRotation < 270;
  const direction = centerNeedsFlip ? -1 : 1;
  const baseStep = letterAngleStep ?? Math.max(1.2, Math.min(3.6, fontSize * 38 / Math.max(80, radius)));
  const step = Math.abs(baseStep) * direction;
  const startAngle = angle - ((letters.length - 1) * step) / 2;
  const centerPoint = polarToCartesian(cx, cy, radius, angle);
  const readableRotationOffset = centerNeedsFlip ? 180 : 0;

  return (
    <g className={className} opacity={opacity} aria-label={text} pointerEvents={onClick ? 'auto' : 'none'} onClick={onClick}>
      {onClick ? (
        <circle
          cx={centerPoint.x}
          cy={centerPoint.y}
          r={fontSize * 2.2}
          fill="transparent"
          pointerEvents="all"
        />
      ) : null}
      {letters.map((letter, index) => {
        const letterAngle = startAngle + index * step;
        const point = polarToCartesian(cx, cy, radius, letterAngle);
        const radialRotation = inward ? letterAngle + 180 : letterAngle;
        const rotation = radialRotation + readableRotationOffset;

        return (
          <g key={`${letter}-${index}`}>
            {onClick ? (
              <circle
                cx={point.x}
                cy={point.y}
                r={fontSize * 0.86}
                fill="transparent"
                pointerEvents="all"
                onClick={onClick}
              />
            ) : null}
            <text
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
          </g>
        );
      })}
    </g>
  );
}
