import { AnnotationState, ImageState } from '../../types';
import { isPointInBox } from '../../utils/canvas';
import { UI_CONFIG } from '../../config';

interface ObjectDetectorConfig {
  annotations: AnnotationState;
  imageState: ImageState;
}

export class ObjectDetector {
  private config: ObjectDetectorConfig;

  constructor(config: ObjectDetectorConfig) {
    this.config = config;
  }

  getBboxAtPoint(imageX: number, imageY: number) {
    const { annotations } = this.config;
    
    for (let i = annotations.boundingBoxes.length - 1; i >= 0; i--) {
      const bbox = annotations.boundingBoxes[i];
      if (isPointInBox(imageX, imageY, bbox)) {
        return bbox;
      }
    }
    return null;
  }

  getRulerAtPoint(imageX: number, imageY: number) {
    const { annotations } = this.config;
    const tolerance = UI_CONFIG.RULER_TOLERANCE;
    
    for (let i = annotations.rulers.length - 1; i >= 0; i--) {
      const ruler = annotations.rulers[i];
      
      // Проверяем попадание в маркеры на концах
      const startDistance = Math.sqrt((imageX - ruler.x1) ** 2 + (imageY - ruler.y1) ** 2);
      const endDistance = Math.sqrt((imageX - ruler.x2) ** 2 + (imageY - ruler.y2) ** 2);
      
      if (startDistance <= tolerance) {
        return { ruler, handleType: 'start' };
      }
      if (endDistance <= tolerance) {
        return { ruler, handleType: 'end' };
      }
      
      // Проверяем попадание в линию
      if (this.isPointOnLine(imageX, imageY, ruler, tolerance)) {
        return { ruler, handleType: null };
      }
    }
    return null;
  }

  getDensityPointAtPoint(imageX: number, imageY: number) {
    const { annotations } = this.config;
    const tolerance = UI_CONFIG.DENSITY_POINT_TOLERANCE;
    
    for (let i = annotations.densityPoints.length - 1; i >= 0; i--) {
      const point = annotations.densityPoints[i];
      const distance = Math.sqrt((imageX - point.x) ** 2 + (imageY - point.y) ** 2);
      
      if (distance <= tolerance) {
        return { point, handleType: 'center' };
      }
    }
    return null;
  }

  getCalibrationLineAtPoint(imageX: number, imageY: number) {
    const { annotations } = this.config;
    
    if (!annotations.calibrationLine) return null;
    
    const line = annotations.calibrationLine;
    const tolerance = UI_CONFIG.RULER_TOLERANCE;
    
    // Проверяем попадание в маркеры на концах
    const startDistance = Math.sqrt((imageX - line.x1) ** 2 + (imageY - line.y1) ** 2);
    const endDistance = Math.sqrt((imageX - line.x2) ** 2 + (imageY - line.y2) ** 2);
    
    if (startDistance <= tolerance) {
      return { line, handleType: 'start' };
    }
    if (endDistance <= tolerance) {
      return { line, handleType: 'end' };
    }
    
    // Проверяем попадание в линию
    if (this.isPointOnLine(imageX, imageY, line, tolerance)) {
      return { line, handleType: null };
    }
    
    return null;
  }

  private isPointOnLine(x: number, y: number, line: any, tolerance: number): boolean {
    const A = y - line.y1;
    const B = line.x1 - x;
    const C = (x - line.x1) * (line.y2 - line.y1) - (y - line.y1) * (line.x2 - line.x1);
    const distance = Math.abs(C) / Math.sqrt(A * A + B * B);
    
    const dotProduct = (x - line.x1) * (line.x2 - line.x1) + (y - line.y1) * (line.y2 - line.y1);
    const squaredLength = (line.x2 - line.x1) ** 2 + (line.y2 - line.y1) ** 2;
    
    return dotProduct >= 0 && dotProduct <= squaredLength && distance <= tolerance;
  }
}