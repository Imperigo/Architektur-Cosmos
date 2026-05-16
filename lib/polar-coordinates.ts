export function polarToCartesian(cx: number, cy: number, radius: number, angleDeg: number) {
  const angleRad = (angleDeg - 90) * Math.PI / 180;
  return {
    x: roundCoordinate(cx + radius * Math.cos(angleRad)),
    y: roundCoordinate(cy + radius * Math.sin(angleRad))
  };
}

function roundCoordinate(value: number) {
  return Math.round(value * 1000) / 1000;
}
