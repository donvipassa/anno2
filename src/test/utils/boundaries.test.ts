import { describe, it, expect } from 'vitest';
import {
  clampToImageBounds,
  isPointInBounds,
  isPointOnBorder,
  normalizeBox,
  ensureMinimumSize,
  calculateDistanceToLine,
  isPointNearLine,
  type BoundingBoxBounds
} from '../../utils/boundaries';

describe('boundaries', () => {
  describe('clampToImageBounds', () => {
    it('should not modify box that is completely within bounds', () => {
      const result = clampToImageBounds(10, 10, 50, 50, 100, 100);

      expect(result.x).toBe(10);
      expect(result.y).toBe(10);
      expect(result.width).toBe(50);
      expect(result.height).toBe(50);
    });

    it('should clamp box that exceeds right boundary', () => {
      const result = clampToImageBounds(80, 10, 50, 50, 100, 100);

      expect(result.x).toBe(50);
      expect(result.y).toBe(10);
      expect(result.width).toBe(50);
      expect(result.height).toBe(50);
    });

    it('should clamp box that exceeds bottom boundary', () => {
      const result = clampToImageBounds(10, 80, 50, 50, 100, 100);

      expect(result.x).toBe(10);
      expect(result.y).toBe(50);
      expect(result.width).toBe(50);
      expect(result.height).toBe(50);
    });

    it('should clamp box that exceeds left boundary', () => {
      const result = clampToImageBounds(-20, 10, 50, 50, 100, 100);

      expect(result.x).toBe(0);
      expect(result.y).toBe(10);
      expect(result.width).toBe(50);
      expect(result.height).toBe(50);
    });

    it('should clamp box that exceeds top boundary', () => {
      const result = clampToImageBounds(10, -20, 50, 50, 100, 100);

      expect(result.x).toBe(10);
      expect(result.y).toBe(0);
      expect(result.width).toBe(50);
      expect(result.height).toBe(50);
    });

    it('should clamp box that is larger than image', () => {
      const result = clampToImageBounds(10, 10, 200, 200, 100, 100);

      expect(result.x).toBe(0);
      expect(result.y).toBe(0);
      expect(result.width).toBe(100);
      expect(result.height).toBe(100);
    });

    it('should handle zero-size box', () => {
      const result = clampToImageBounds(50, 50, 0, 0, 100, 100);

      expect(result.x).toBe(50);
      expect(result.y).toBe(50);
      expect(result.width).toBe(0);
      expect(result.height).toBe(0);
    });
  });

  describe('isPointInBounds', () => {
    const bounds: BoundingBoxBounds = {
      x: 10,
      y: 10,
      width: 50,
      height: 50
    };

    it('should return true for point inside bounds', () => {
      expect(isPointInBounds(30, 30, bounds)).toBe(true);
    });

    it('should return true for point on left edge', () => {
      expect(isPointInBounds(10, 30, bounds)).toBe(true);
    });

    it('should return true for point on right edge', () => {
      expect(isPointInBounds(60, 30, bounds)).toBe(true);
    });

    it('should return true for point on top edge', () => {
      expect(isPointInBounds(30, 10, bounds)).toBe(true);
    });

    it('should return true for point on bottom edge', () => {
      expect(isPointInBounds(30, 60, bounds)).toBe(true);
    });

    it('should return true for point at corner', () => {
      expect(isPointInBounds(10, 10, bounds)).toBe(true);
      expect(isPointInBounds(60, 60, bounds)).toBe(true);
    });

    it('should return false for point outside bounds', () => {
      expect(isPointInBounds(5, 30, bounds)).toBe(false);
      expect(isPointInBounds(65, 30, bounds)).toBe(false);
      expect(isPointInBounds(30, 5, bounds)).toBe(false);
      expect(isPointInBounds(30, 65, bounds)).toBe(false);
    });
  });

  describe('isPointOnBorder', () => {
    const box: BoundingBoxBounds = {
      x: 10,
      y: 10,
      width: 50,
      height: 50
    };
    const borderWidth = 5;

    it('should return true for point on top border', () => {
      expect(isPointOnBorder(30, 10, box, borderWidth)).toBe(true);
      expect(isPointOnBorder(30, 12, box, borderWidth)).toBe(true);
    });

    it('should return true for point on bottom border', () => {
      expect(isPointOnBorder(30, 60, box, borderWidth)).toBe(true);
      expect(isPointOnBorder(30, 58, box, borderWidth)).toBe(true);
    });

    it('should return true for point on left border', () => {
      expect(isPointOnBorder(10, 30, box, borderWidth)).toBe(true);
      expect(isPointOnBorder(12, 30, box, borderWidth)).toBe(true);
    });

    it('should return true for point on right border', () => {
      expect(isPointOnBorder(60, 30, box, borderWidth)).toBe(true);
      expect(isPointOnBorder(58, 30, box, borderWidth)).toBe(true);
    });

    it('should return false for point in center', () => {
      expect(isPointOnBorder(30, 30, box, borderWidth)).toBe(false);
    });

    it('should return false for point far outside', () => {
      expect(isPointOnBorder(0, 0, box, borderWidth)).toBe(false);
      expect(isPointOnBorder(100, 100, box, borderWidth)).toBe(false);
    });
  });

  describe('normalizeBox', () => {
    it('should not modify box with positive dimensions', () => {
      const result = normalizeBox({ x: 10, y: 10, width: 50, height: 50 });

      expect(result.x).toBe(10);
      expect(result.y).toBe(10);
      expect(result.width).toBe(50);
      expect(result.height).toBe(50);
    });

    it('should normalize box with negative width', () => {
      const result = normalizeBox({ x: 60, y: 10, width: -50, height: 50 });

      expect(result.x).toBe(10);
      expect(result.y).toBe(10);
      expect(result.width).toBe(50);
      expect(result.height).toBe(50);
    });

    it('should normalize box with negative height', () => {
      const result = normalizeBox({ x: 10, y: 60, width: 50, height: -50 });

      expect(result.x).toBe(10);
      expect(result.y).toBe(10);
      expect(result.width).toBe(50);
      expect(result.height).toBe(50);
    });

    it('should normalize box with both negative dimensions', () => {
      const result = normalizeBox({ x: 60, y: 60, width: -50, height: -50 });

      expect(result.x).toBe(10);
      expect(result.y).toBe(10);
      expect(result.width).toBe(50);
      expect(result.height).toBe(50);
    });

    it('should handle zero dimensions', () => {
      const result = normalizeBox({ x: 10, y: 10, width: 0, height: 0 });

      expect(result.x).toBe(10);
      expect(result.y).toBe(10);
      expect(result.width).toBe(0);
      expect(result.height).toBe(0);
    });
  });

  describe('ensureMinimumSize', () => {
    it('should not modify box larger than minimum', () => {
      const box: BoundingBoxBounds = { x: 10, y: 10, width: 50, height: 50 };
      const result = ensureMinimumSize(box, 20, 20);

      expect(result.width).toBe(50);
      expect(result.height).toBe(50);
    });

    it('should enforce minimum width', () => {
      const box: BoundingBoxBounds = { x: 10, y: 10, width: 10, height: 50 };
      const result = ensureMinimumSize(box, 20, 20);

      expect(result.width).toBe(20);
      expect(result.height).toBe(50);
    });

    it('should enforce minimum height', () => {
      const box: BoundingBoxBounds = { x: 10, y: 10, width: 50, height: 10 };
      const result = ensureMinimumSize(box, 20, 20);

      expect(result.width).toBe(50);
      expect(result.height).toBe(20);
    });

    it('should enforce both minimum dimensions', () => {
      const box: BoundingBoxBounds = { x: 10, y: 10, width: 5, height: 5 };
      const result = ensureMinimumSize(box, 20, 20);

      expect(result.width).toBe(20);
      expect(result.height).toBe(20);
    });

    it('should preserve position', () => {
      const box: BoundingBoxBounds = { x: 100, y: 200, width: 5, height: 5 };
      const result = ensureMinimumSize(box, 20, 20);

      expect(result.x).toBe(100);
      expect(result.y).toBe(200);
    });
  });

  describe('calculateDistanceToLine', () => {
    it('should calculate distance to horizontal line', () => {
      const distance = calculateDistanceToLine(50, 30, 0, 10, 100, 10);

      expect(distance).toBe(20);
    });

    it('should calculate distance to vertical line', () => {
      const distance = calculateDistanceToLine(30, 50, 10, 0, 10, 100);

      expect(distance).toBe(20);
    });

    it('should return zero for point on line', () => {
      const distance = calculateDistanceToLine(50, 10, 0, 10, 100, 10);

      expect(distance).toBeCloseTo(0, 10);
    });

    it('should calculate distance to diagonal line', () => {
      const distance = calculateDistanceToLine(10, 10, 0, 0, 20, 20);

      expect(distance).toBeCloseTo(0, 10);
    });

    it('should return Infinity for zero-length line', () => {
      const distance = calculateDistanceToLine(50, 50, 10, 10, 10, 10);

      expect(distance).toBe(Infinity);
    });
  });

  describe('isPointNearLine', () => {
    it('should return true for point on horizontal line', () => {
      const result = isPointNearLine(50, 10, 0, 10, 100, 10, 5);

      expect(result).toBe(true);
    });

    it('should return true for point near horizontal line', () => {
      const result = isPointNearLine(50, 12, 0, 10, 100, 10, 5);

      expect(result).toBe(true);
    });

    it('should return false for point far from line', () => {
      const result = isPointNearLine(50, 20, 0, 10, 100, 10, 5);

      expect(result).toBe(false);
    });

    it('should return false for point near line but outside segment bounds', () => {
      const result = isPointNearLine(150, 10, 0, 10, 100, 10, 5);

      expect(result).toBe(false);
    });

    it('should return true for point on vertical line', () => {
      const result = isPointNearLine(10, 50, 10, 0, 10, 100, 5);

      expect(result).toBe(true);
    });

    it('should return true for point near diagonal line', () => {
      const result = isPointNearLine(51, 51, 0, 0, 100, 100, 5);

      expect(result).toBe(true);
    });

    it('should respect tolerance parameter', () => {
      expect(isPointNearLine(50, 13, 0, 10, 100, 10, 5)).toBe(true);
      expect(isPointNearLine(50, 13, 0, 10, 100, 10, 2)).toBe(false);
    });
  });
});
