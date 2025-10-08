import { describe, it, expect } from 'vitest';
import {
  canvasToImageCoords,
  imageToCanvasCoords,
  getCanvasEventCoords,
  getImageCoordsFromEvent
} from '../../utils/coordinates';
import { ImageState } from '../../types';

describe('coordinates', () => {
  const mockImageState: ImageState = {
    file: null,
    src: null,
    width: 1000,
    height: 800,
    scale: 2,
    offsetX: 100,
    offsetY: 50,
    inverted: false,
    imageElement: null
  };

  describe('canvasToImageCoords', () => {
    it('should convert canvas coordinates to image coordinates', () => {
      const result = canvasToImageCoords(300, 250, mockImageState);

      expect(result.x).toBe(100);
      expect(result.y).toBe(100);
    });

    it('should handle zero coordinates', () => {
      const result = canvasToImageCoords(0, 0, mockImageState);

      expect(result.x).toBe(-50);
      expect(result.y).toBe(-25);
    });

    it('should handle scale of 1', () => {
      const state = { ...mockImageState, scale: 1, offsetX: 0, offsetY: 0 };
      const result = canvasToImageCoords(100, 200, state);

      expect(result.x).toBe(100);
      expect(result.y).toBe(200);
    });
  });

  describe('imageToCanvasCoords', () => {
    it('should convert image coordinates to canvas coordinates', () => {
      const result = imageToCanvasCoords(100, 100, mockImageState);

      expect(result.x).toBe(300);
      expect(result.y).toBe(250);
    });

    it('should handle zero coordinates', () => {
      const result = imageToCanvasCoords(0, 0, mockImageState);

      expect(result.x).toBe(100);
      expect(result.y).toBe(50);
    });

    it('should be inverse of canvasToImageCoords', () => {
      const canvas = { x: 500, y: 400 };
      const image = canvasToImageCoords(canvas.x, canvas.y, mockImageState);
      const backToCanvas = imageToCanvasCoords(image.x, image.y, mockImageState);

      expect(backToCanvas.x).toBe(canvas.x);
      expect(backToCanvas.y).toBe(canvas.y);
    });
  });

  describe('getCanvasEventCoords', () => {
    it('should extract coordinates from mouse event', () => {
      const mockEvent = {
        clientX: 150,
        clientY: 200
      } as MouseEvent;

      const mockCanvas = {
        getBoundingClientRect: () => ({
          left: 50,
          top: 100,
          right: 0,
          bottom: 0,
          width: 0,
          height: 0,
          x: 0,
          y: 0,
          toJSON: () => ({})
        })
      } as HTMLCanvasElement;

      const result = getCanvasEventCoords(mockEvent, mockCanvas);

      expect(result.x).toBe(100);
      expect(result.y).toBe(100);
    });
  });

  describe('getImageCoordsFromEvent', () => {
    it('should convert event to image coordinates', () => {
      const mockEvent = {
        clientX: 300,
        clientY: 250
      } as MouseEvent;

      const mockCanvas = {
        getBoundingClientRect: () => ({
          left: 0,
          top: 0,
          right: 0,
          bottom: 0,
          width: 0,
          height: 0,
          x: 0,
          y: 0,
          toJSON: () => ({})
        })
      } as HTMLCanvasElement;

      const result = getImageCoordsFromEvent(mockEvent, mockCanvas, mockImageState);

      expect(result.x).toBe(100);
      expect(result.y).toBe(100);
    });
  });
});
