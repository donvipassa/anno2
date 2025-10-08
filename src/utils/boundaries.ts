import { BoundingBox } from '../types';

export interface BoundingBoxBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function clampToImageBounds(
  x: number,
  y: number,
  width: number,
  height: number,
  imageWidth: number,
  imageHeight: number
): BoundingBoxBounds {
  const clampedX = Math.max(0, Math.min(x, imageWidth - width));
  const clampedY = Math.max(0, Math.min(y, imageHeight - height));
  const clampedWidth = Math.min(width, imageWidth - clampedX);
  const clampedHeight = Math.min(height, imageHeight - clampedY);

  return {
    x: clampedX,
    y: clampedY,
    width: clampedWidth,
    height: clampedHeight
  };
}

export function isPointInBounds(
  pointX: number,
  pointY: number,
  bounds: BoundingBoxBounds
): boolean {
  return (
    pointX >= bounds.x &&
    pointX <= bounds.x + bounds.width &&
    pointY >= bounds.y &&
    pointY <= bounds.y + bounds.height
  );
}

export function isPointOnBorder(
  pointX: number,
  pointY: number,
  box: BoundingBoxBounds,
  borderWidth: number
): boolean {
  const isOnTopBorder =
    pointX >= box.x - borderWidth &&
    pointX <= box.x + box.width + borderWidth &&
    pointY >= box.y - borderWidth &&
    pointY <= box.y + borderWidth;

  const isOnBottomBorder =
    pointX >= box.x - borderWidth &&
    pointX <= box.x + box.width + borderWidth &&
    pointY >= box.y + box.height - borderWidth &&
    pointY <= box.y + box.height + borderWidth;

  const isOnLeftBorder =
    pointX >= box.x - borderWidth &&
    pointX <= box.x + borderWidth &&
    pointY >= box.y - borderWidth &&
    pointY <= box.y + box.height + borderWidth;

  const isOnRightBorder =
    pointX >= box.x + box.width - borderWidth &&
    pointX <= box.x + box.width + borderWidth &&
    pointY >= box.y - borderWidth &&
    pointY <= box.y + box.height + borderWidth;

  return isOnTopBorder || isOnBottomBorder || isOnLeftBorder || isOnRightBorder;
}

export function normalizeBox(box: {
  x: number;
  y: number;
  width: number;
  height: number;
}): BoundingBoxBounds {
  return {
    x: Math.min(box.x, box.x + box.width),
    y: Math.min(box.y, box.y + box.height),
    width: Math.abs(box.width),
    height: Math.abs(box.height)
  };
}

export function ensureMinimumSize(
  box: BoundingBoxBounds,
  minWidth: number,
  minHeight: number
): BoundingBoxBounds {
  return {
    ...box,
    width: Math.max(box.width, minWidth),
    height: Math.max(box.height, minHeight)
  };
}

export function calculateDistanceToLine(
  pointX: number,
  pointY: number,
  lineX1: number,
  lineY1: number,
  lineX2: number,
  lineY2: number
): number {
  const numerator = Math.abs(
    (lineY2 - lineY1) * pointX -
    (lineX2 - lineX1) * pointY +
    lineX2 * lineY1 -
    lineY2 * lineX1
  );
  const denominator = Math.sqrt(
    Math.pow(lineY2 - lineY1, 2) + Math.pow(lineX2 - lineX1, 2)
  );
  return denominator === 0 ? Infinity : numerator / denominator;
}

export function isPointNearLine(
  pointX: number,
  pointY: number,
  lineX1: number,
  lineY1: number,
  lineX2: number,
  lineY2: number,
  tolerance: number
): boolean {
  const distance = calculateDistanceToLine(pointX, pointY, lineX1, lineY1, lineX2, lineY2);

  const isWithinTolerance = distance <= tolerance;
  const isWithinLineBounds =
    pointX >= Math.min(lineX1, lineX2) - tolerance &&
    pointX <= Math.max(lineX1, lineX2) + tolerance &&
    pointY >= Math.min(lineY1, lineY2) - tolerance &&
    pointY <= Math.max(lineY1, lineY2) + tolerance;

  return isWithinTolerance && isWithinLineBounds;
}
