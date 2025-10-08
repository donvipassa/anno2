import { BoundingBox, Ruler, CalibrationLine, DensityPoint } from './index';

export type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'move';

export type ObjectType = 'bbox' | 'ruler' | 'calibration' | 'density';

export interface CanvasObject {
  id: string;
  type: ObjectType;
}

export interface ClickedObject {
  type: ObjectType;
  object: BoundingBox | Ruler | CalibrationLine | DensityPoint;
  handle?: 'start' | 'end';
}

export interface DrawingState {
  isDrawing: boolean;
  currentBox: { x: number; y: number; width: number; height: number } | null;
  currentLine: { x1: number; y1: number; x2: number; y2: number } | null;
}

export interface DraggingState {
  isDragging: boolean;
  dragStart: { x: number; y: number } | null;
  draggedObjectId: string | null;
  draggedObjectType: string | null;
  resizeHandle: ResizeHandle | null;
  lineHandle: 'start' | 'end' | null;
}

export interface PanningState {
  isPanning: boolean;
  panStart: { x: number; y: number; offsetX: number; offsetY: number } | null;
}

export interface CanvasInteractionState extends DrawingState, DraggingState, PanningState {
  hoverCursor: string;
}

export type CursorType =
  | 'default'
  | 'crosshair'
  | 'pointer'
  | 'move'
  | 'grabbing'
  | 'nw-resize'
  | 'n-resize'
  | 'ne-resize'
  | 'e-resize'
  | 'se-resize'
  | 's-resize'
  | 'sw-resize'
  | 'w-resize';

export interface Tolerances {
  marker: number;
  ruler: number;
  density: number;
  border: number;
}
