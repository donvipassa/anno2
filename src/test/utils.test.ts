import { describe, it, expect } from 'vitest';
import { calculateDistance, pointInRect, clampToImageBounds } from '../utils/geometry';
import { validateImageFile, getMarkupFileName } from '../utils/fileUtils';

describe('Geometry Utils', () => {
  it('should calculate distance correctly', () => {
    expect(calculateDistance(0, 0, 3, 4)).toBe(5);
    expect(calculateDistance(0, 0, 0, 0)).toBe(0);
  });

  it('should check point in rectangle', () => {
    expect(pointInRect(5, 5, 0, 0, 10, 10)).toBe(true);
    expect(pointInRect(15, 5, 0, 0, 10, 10)).toBe(false);
  });

  it('should clamp to image bounds', () => {
    const result = clampToImageBounds(-5, -5, 20, 20, 100, 100);
    expect(result.x).toBe(0);
    expect(result.y).toBe(0);
    expect(result.width).toBe(20);
    expect(result.height).toBe(20);
  });
});

describe('File Utils', () => {
  it('should generate correct markup filename', () => {
    expect(getMarkupFileName('image.jpg')).toBe('image.jpg.txt');
    expect(getMarkupFileName('test.png')).toBe('test.png.txt');
  });

  it('should validate image files', () => {
    const validFile = new File([''], 'test.jpg', { type: 'image/jpeg' });
    const invalidFile = new File([''], 'test.txt', { type: 'text/plain' });
    
    expect(validateImageFile(validFile).valid).toBe(true);
    expect(validateImageFile(invalidFile).valid).toBe(false);
  });
});