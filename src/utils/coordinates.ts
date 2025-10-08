import { ImageState } from '../types';

export interface CanvasCoordinates {
  x: number;
  y: number;
}

export interface ImageCoordinates {
  x: number;
  y: number;
}

export function canvasToImageCoords(
  canvasX: number,
  canvasY: number,
  imageState: ImageState
): ImageCoordinates {
  const imageX = (canvasX - imageState.offsetX) / imageState.scale;
  const imageY = (canvasY - imageState.offsetY) / imageState.scale;
  return { x: imageX, y: imageY };
}

export function imageToCanvasCoords(
  imageX: number,
  imageY: number,
  imageState: ImageState
): CanvasCoordinates {
  const canvasX = imageX * imageState.scale + imageState.offsetX;
  const canvasY = imageY * imageState.scale + imageState.offsetY;
  return { x: canvasX, y: canvasY };
}

export function getCanvasEventCoords(
  event: React.MouseEvent | MouseEvent,
  canvas: HTMLCanvasElement
): CanvasCoordinates {
  const rect = canvas.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top
  };
}

export function getImageCoordsFromEvent(
  event: React.MouseEvent | MouseEvent,
  canvas: HTMLCanvasElement,
  imageState: ImageState
): ImageCoordinates {
  const canvasCoords = getCanvasEventCoords(event, canvas);
  return canvasToImageCoords(canvasCoords.x, canvasCoords.y, imageState);
}
