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
  const centerRadialRotation = inward ? angle + 180 : angle;
  const normalizedCenterRotation = ((centerRadialRotation % 360) + 360) % 360;
  const centerNeedsFlip = normalizedCenterRotation > 90 && normalizedCenterRotation < 270;
  const reverseArc = centerNeedsFlip;
  const readableLetters = reverseArc ? [...letters].reverse() : letters;
  const direction = reverseArc ? -1 : 1;
  const baseStep = letterAngleStep ?? Math.max(1.2, Math.min(3.6, fontSize * 38 / Math.max(80, radius)));
  const step = Math.abs(baseStep) * direction;
  const startAngle = angle - ((readableLetters.length - 1) * step) / 2;

  return (
    <g className={className} opacity={opacity} aria-label={text} pointerEvents="none">
      {readableLetters.map((letter, index) => {
        const letterAngle = startAngle + index * step;
        const point = polarToCartesian(cx, cy, radius, letterAngle);
        const radialRotation = inward ? letterAngle + 180 : letterAngle;
        const rotation = centerNeedsFlip ? radialRotation + 180 : radialRotation;

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
