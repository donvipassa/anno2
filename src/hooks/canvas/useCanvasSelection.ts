import { useState, useCallback } from 'react';
import { calculateDistance } from '../../utils';
import { isPointInBox } from '../../utils/canvas';
import { BoundingBox, Ruler, CalibrationLine, DensityPoint } from '../../types';

interface Annotations {
  boundingBoxes: BoundingBox[];
  rulers: Ruler[];
  calibrationLine: CalibrationLine | null;
  densityPoints: DensityPoint[];
}

interface Tolerances {
  marker: number;
  ruler: number;
  density: number;
  border: number;
}

interface ObjectAtPoint {
  type: string;
  object: any;
  handle?: 'start' | 'end';
}

export const useCanvasSelection = (
  annotations: Annotations,
  tolerances: Tolerances
) => {
  const [hoveredObjectId, setHoveredObjectId] = useState<string | null>(null);
  const [hoveredObjectType, setHoveredObjectType] = useState<string | null>(null);

  const getObjectAtPoint = useCallback((x: number, y: number): ObjectAtPoint | null => {
    if (annotations.calibrationLine) {
      const line = annotations.calibrationLine;
      const distToStart = calculateDistance(x, y, line.x1, line.y1);
      const distToEnd = calculateDistance(x, y, line.x2, line.y2);

      if (distToStart <= tolerances.marker) {
        return { type: 'calibration', object: line, handle: 'start' };
      }
      if (distToEnd <= tolerances.marker) {
        return { type: 'calibration', object: line, handle: 'end' };
      }
    }

    for (let i = annotations.rulers.length - 1; i >= 0; i--) {
      const ruler = annotations.rulers[i];
      const distToStart = calculateDistance(x, y, ruler.x1, ruler.y1);
      const distToEnd = calculateDistance(x, y, ruler.x2, ruler.y2);

      if (distToStart <= tolerances.marker) {
        return { type: 'ruler', object: ruler, handle: 'start' };
      }
      if (distToEnd <= tolerances.marker) {
        return { type: 'ruler', object: ruler, handle: 'end' };
      }
    }

    for (let i = annotations.boundingBoxes.length - 1; i >= 0; i--) {
      const bbox = annotations.boundingBoxes[i];
      if (isPointInBox(x, y, bbox)) {
        return { type: 'bbox', object: bbox };
      }
    }

    for (let i = annotations.rulers.length - 1; i >= 0; i--) {
      const ruler = annotations.rulers[i];
      const distance = Math.abs((ruler.y2 - ruler.y1) * x - (ruler.x2 - ruler.x1) * y + ruler.x2 * ruler.y1 - ruler.y2 * ruler.x1) /
                      Math.sqrt((ruler.y2 - ruler.y1) ** 2 + (ruler.x2 - ruler.x1) ** 2);

      if (distance <= tolerances.ruler &&
          x >= Math.min(ruler.x1, ruler.x2) - tolerances.ruler &&
          x <= Math.max(ruler.x1, ruler.x2) + tolerances.ruler &&
          y >= Math.min(ruler.y1, ruler.y2) - tolerances.ruler &&
          y <= Math.max(ruler.y1, ruler.y2) + tolerances.ruler) {
        return { type: 'ruler', object: ruler };
      }
    }

    if (annotations.calibrationLine) {
      const line = annotations.calibrationLine;
      const distance = Math.abs((line.y2 - line.y1) * x - (line.x2 - line.x1) * y + line.x2 * line.y1 - line.y2 * line.x1) /
                      Math.sqrt((line.y2 - line.y1) ** 2 + (line.x2 - line.x1) ** 2);

      if (distance <= tolerances.ruler &&
          x >= Math.min(line.x1, line.x2) - tolerances.ruler &&
          x <= Math.max(line.x1, line.x2) + tolerances.ruler &&
          y >= Math.min(line.y1, line.y2) - tolerances.ruler &&
          y <= Math.max(line.y1, line.y2) + tolerances.ruler) {
        return { type: 'calibration', object: line };
      }
    }

    for (let i = annotations.densityPoints.length - 1; i >= 0; i--) {
      const point = annotations.densityPoints[i];
      const distance = calculateDistance(x, y, point.x, point.y);
      if (distance <= tolerances.density) {
        return { type: 'density', object: point };
      }
    }

    return null;
  }, [annotations, tolerances]);

  const updateHoveredObject = useCallback((x: number, y: number) => {
    const obj = getObjectAtPoint(x, y);
    if (obj) {
      setHoveredObjectId(obj.object.id);
      setHoveredObjectType(obj.type);
    } else {
      setHoveredObjectId(null);
      setHoveredObjectType(null);
    }
  }, [getObjectAtPoint]);

  const clearHoveredObject = useCallback(() => {
    setHoveredObjectId(null);
    setHoveredObjectType(null);
  }, []);

  return {
    hoveredObjectId,
    hoveredObjectType,
    getObjectAtPoint,
    updateHoveredObject,
    clearHoveredObject
  };
};
