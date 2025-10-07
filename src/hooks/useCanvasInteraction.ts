import { useState, useCallback, useRef } from 'react';
import { useMemo } from 'react';
import { useImage } from '../core/ImageProvider';
import { useAnnotations } from '../core/AnnotationManager';
import { calculateDistance, clampToImageBounds, SIZES } from '../utils';
import { getResizeHandle, isPointInBox } from '../utils/canvas';
import { v4 as uuidv4 } from 'uuid';

export const useCanvasInteraction = (
  activeTool: string,
  activeClassId: number,
  onCalibrationLineFinished: (lineData: any, isNew: boolean) => void,
  onBboxCreated: (bboxData: any) => void,
  onShowContextMenu: (x: number, y: number) => void,
  onEditCalibration: () => void
) => {
  const { imageState, setOffset, zoomToPoint } = useImage();
  const { 
    annotations, 
    addRuler, 
    updateRuler, 
    deleteRuler,
    addDensityPoint,
    updateDensityPoint,
    deleteDensityPoint,
    updateCalibrationLine,
    deleteCalibrationLine,
    selectObject,
    updateBoundingBox,
    deleteBoundingBox
  } = useAnnotations();

  // Состояние для рисования
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentBox, setCurrentBox] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [currentLine, setCurrentLine] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  const [lineHandle, setLineHandle] = useState<'start' | 'end' | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [draggedObjectId, setDraggedObjectId] = useState<string | null>(null);
  const [draggedObjectType, setDraggedObjectType] = useState<string | null>(null);
  const [panStart, setPanStart] = useState<{ x: number; y: number; offsetX: number; offsetY: number } | null>(null);
  const [hoverCursor, setHoverCursor] = useState<string>('default');

  // Мемоизируем допуски для производительности
  const tolerances = useMemo(() => ({
    marker: SIZES.MARKER_TOLERANCE / imageState.scale,
    ruler: SIZES.RULER_TOLERANCE / imageState.scale,
    density: SIZES.DENSITY_POINT_TOLERANCE / imageState.scale,
    border: SIZES.BORDER_WIDTH / imageState.scale
  }), [imageState.scale]);

  // Получение координат изображения из координат мыши
  const getImageCoords = useCallback((clientX: number, clientY: number, canvasRef: React.RefObject<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const canvasX = clientX - rect.left;
    const canvasY = clientY - rect.top;

    const imageX = (canvasX - imageState.offsetX) / imageState.scale;
    const imageY = (canvasY - imageState.offsetY) / imageState.scale;

    return { x: imageX, y: imageY };
  }, [imageState]);

  // Поиск объекта в точке
  const getObjectAtPoint = useCallback((x: number, y: number) => {
    // Проверяем точки плотности ПЕРВЫМИ (наивысший приоритет)
    for (let i = annotations.densityPoints.length - 1; i >= 0; i--) {
      const point = annotations.densityPoints[i];
      const distance = calculateDistance(x, y, point.x, point.y);
      if (distance <= tolerances.density) {
        return { type: 'density', object: point };
      }
    }
    
    // Проверяем маркеры линеек и калибровочной линии
    
    // Проверяем маркеры калибровочной линии
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
    
    // Проверяем маркеры линеек
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

    // Проверяем bounding boxes
    for (let i = annotations.boundingBoxes.length - 1; i >= 0; i--) {
      const bbox = annotations.boundingBoxes[i];
      if (isPointInBox(x, y, bbox)) {
        return { type: 'bbox', object: bbox };
      }
    }

    // Проверяем линейки
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

    // Проверяем калибровочную линию
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

    return null;
  }, [annotations, tolerances]);

  // Определение курсора при наведении
  const getHoverCursor = useCallback((x: number, y: number) => {
    // Проверяем точки плотности
    for (let i = annotations.densityPoints.length - 1; i >= 0; i--) {
      const point = annotations.densityPoints[i];
      const distance = calculateDistance(x, y, point.x, point.y);
      if (distance <= tolerances.density) {
        return 'pointer';
      }
    }

    // Проверяем маркеры калибровочной линии
    if (annotations.calibrationLine) {
      const line = annotations.calibrationLine;
      const distToStart = calculateDistance(x, y, line.x1, line.y1);
      const distToEnd = calculateDistance(x, y, line.x2, line.y2);
      
      if (distToStart <= tolerances.marker || distToEnd <= tolerances.marker) {
        return 'pointer';
      }
    }
    
    // Проверяем маркеры линеек
    for (let i = annotations.rulers.length - 1; i >= 0; i--) {
      const ruler = annotations.rulers[i];
      const distToStart = calculateDistance(x, y, ruler.x1, ruler.y1);
      const distToEnd = calculateDistance(x, y, ruler.x2, ruler.y2);
      
      if (distToStart <= tolerances.marker || distToEnd <= tolerances.marker) {
        return 'pointer';
      }
    }

    // Проверяем маркеры изменения размера bbox
    for (let i = annotations.boundingBoxes.length - 1; i >= 0; i--) {
      const bbox = annotations.boundingBoxes[i];
      if (annotations.selectedObjectId === bbox.id && annotations.selectedObjectType === 'bbox') {
        const handle = getResizeHandle(x, y, bbox, imageState.scale);
        if (handle && handle !== 'move') {
          const cursorMap = {
            'nw': 'nw-resize', 'n': 'n-resize', 'ne': 'ne-resize',
            'e': 'e-resize', 'se': 'se-resize', 's': 's-resize',
            'sw': 'sw-resize', 'w': 'w-resize'
          };
          return cursorMap[handle] || 'default';
        }
      }
    }

    // Проверяем границы bbox для перемещения
    for (let i = annotations.boundingBoxes.length - 1; i >= 0; i--) {
      const bbox = annotations.boundingBoxes[i];
      const isOnBorder = (
        (x >= bbox.x - tolerances.border && x <= bbox.x + bbox.width + tolerances.border && 
         y >= bbox.y - tolerances.border && y <= bbox.y + tolerances.border) ||
        (x >= bbox.x - tolerances.border && x <= bbox.x + bbox.width + tolerances.border && 
         y >= bbox.y + bbox.height - tolerances.border && y <= bbox.y + bbox.height + tolerances.border) ||
        (x >= bbox.x - tolerances.border && x <= bbox.x + tolerances.border && 
         y >= bbox.y - tolerances.border && y <= bbox.y + bbox.height + tolerances.border) ||
        (x >= bbox.x + bbox.width - tolerances.border && x <= bbox.x + bbox.width + tolerances.border && 
         y >= bbox.y - tolerances.border && y <= bbox.y + bbox.height + tolerances.border)
      );
      
      if (isOnBorder) {
        return 'move';
      }
    }

    // Проверяем тело калибровочной линии для перемещения
    if (annotations.calibrationLine) {
      const line = annotations.calibrationLine;
      const distance = Math.abs((line.y2 - line.y1) * x - (line.x2 - line.x1) * y + line.x2 * line.y1 - line.y2 * line.x1) /
                      Math.sqrt((line.y2 - line.y1) ** 2 + (line.x2 - line.x1) ** 2);
      
      if (distance <= tolerances.ruler &&
          x >= Math.min(line.x1, line.x2) - tolerances.ruler &&
          x <= Math.max(line.x1, line.x2) + tolerances.ruler &&
          y >= Math.min(line.y1, line.y2) - tolerances.ruler &&
          y <= Math.max(line.y1, line.y2) + tolerances.ruler) {
        const distToStart = calculateDistance(x, y, line.x1, line.y1);
        const distToEnd = calculateDistance(x, y, line.x2, line.y2);
        if (distToStart > tolerances.marker && distToEnd > tolerances.marker) {
          return 'move';
        }
      }
    }

    // Проверяем тело линеек для перемещения
    for (let i = annotations.rulers.length - 1; i >= 0; i--) {
      const ruler = annotations.rulers[i];
      const distance = Math.abs((ruler.y2 - ruler.y1) * x - (ruler.x2 - ruler.x1) * y + ruler.x2 * ruler.y1 - ruler.y2 * ruler.x1) /
                      Math.sqrt((ruler.y2 - ruler.y1) ** 2 + (ruler.x2 - ruler.x1) ** 2);
      
      if (distance <= tolerances.ruler &&
          x >= Math.min(ruler.x1, ruler.x2) - tolerances.ruler &&
          x <= Math.max(ruler.x1, ruler.x2) + tolerances.ruler &&
          y >= Math.min(ruler.y1, ruler.y2) - tolerances.ruler &&
          y <= Math.max(ruler.y1, ruler.y2) + tolerances.ruler) {
        const distToStart = calculateDistance(x, y, ruler.x1, ruler.y1);
        const distToEnd = calculateDistance(x, y, ruler.x2, ruler.y2);
        if (distToStart > tolerances.marker && distToEnd > tolerances.marker) {
          return 'move';
        }
      }
    }
    return 'default';
  }, [annotations, tolerances, imageState.scale]);

  // Обработчик нажатия мыши
  const handleMouseDown = useCallback((e: React.MouseEvent, canvasRef: React.RefObject<HTMLCanvasElement>) => {
    if (!imageState.imageElement) return;

    const coords = getImageCoords(e.clientX, e.clientY, canvasRef);
    
    // Правая кнопка мыши - панорамирование
    if (e.button === 2) {
      setIsPanning(true);
      setPanStart({
        x: e.clientX,
        y: e.clientY,
        offsetX: imageState.offsetX,
        offsetY: imageState.offsetY
      });
      return;
    }

    // Левая кнопка мыши
    if (e.button === 0) {
      const clickedObject = getObjectAtPoint(coords.x, coords.y);

      if (clickedObject) {
        selectObject(clickedObject.object.id, clickedObject.type.split('-')[0] as any);
        
        setDraggedObjectId(clickedObject.object.id);
        setDraggedObjectType(clickedObject.type.split('-')[0]);
        
        if (clickedObject.type === 'bbox') {
          const handle = getResizeHandle(coords.x, coords.y, clickedObject.object, imageState.scale);
          if (handle && handle !== 'move') {
            setResizeHandle(handle);
            setIsDragging(true);
            setDragStart(coords);
            return;
          } else if (handle === 'move') {
            const bbox = clickedObject.object;
            const borderWidth = 4 / imageState.scale;
            const isOnBorder = (
              (coords.x >= bbox.x - borderWidth && coords.x <= bbox.x + bbox.width + borderWidth && 
               coords.y >= bbox.y - borderWidth && coords.y <= bbox.y + borderWidth) ||
              (coords.x >= bbox.x - borderWidth && coords.x <= bbox.x + bbox.width + borderWidth && 
               coords.y >= bbox.y + bbox.height - borderWidth && coords.y <= bbox.y + bbox.height + borderWidth) ||
              (coords.x >= bbox.x - borderWidth && coords.x <= bbox.x + borderWidth && 
               coords.y >= bbox.y - borderWidth && coords.y <= bbox.y + bbox.height + borderWidth) ||
              (coords.x >= bbox.x + bbox.width - borderWidth && coords.x <= bbox.x + bbox.width + borderWidth && 
               coords.y >= bbox.y - borderWidth && coords.y <= bbox.y + bbox.height + borderWidth)
            );
            
            if (isOnBorder) {
              setIsDragging(true);
              setDragStart(coords);
              return;
            }
          }
        }
        
        if (clickedObject.handle) {
          setLineHandle(clickedObject.handle);
          setIsDragging(true);
          setDragStart(coords);
          return;
        }

        // Обработка двойного клика по калибровочной линии
        if (clickedObject.type === 'calibration' && e.detail === 2) {
          onEditCalibration();
          return;
        }

        setIsDragging(true);
        setDragStart(coords);
      } else {
        selectObject(null, null);

        if (activeTool === 'bbox' && activeClassId >= 0) {
          setIsDrawing(true);
          setCurrentBox({ x: coords.x, y: coords.y, width: 0, height: 0 });
        } else if (activeTool === 'ruler' || activeTool === 'calibration') {
          setIsDrawing(true);
          setCurrentLine({ x1: coords.x, y1: coords.y, x2: coords.x, y2: coords.y });
        } else if (activeTool === 'density') {
          const pointId = addDensityPoint({ x: coords.x, y: coords.y });
          selectObject(pointId, 'density');
        }
      }
    }
  }, [imageState, getImageCoords, getObjectAtPoint, selectObject, activeTool, activeClassId, addDensityPoint]);

  // Обработчик движения мыши
  const handleMouseMove = useCallback((e: React.MouseEvent, canvasRef: React.RefObject<HTMLCanvasElement>) => {
    if (!imageState.imageElement) return;

    const coords = getImageCoords(e.clientX, e.clientY, canvasRef);

    const newCursor = getHoverCursor(coords.x, coords.y);
    if (newCursor !== hoverCursor) {
      setHoverCursor(newCursor);
    }

    if (isPanning && panStart) {
      const deltaX = e.clientX - panStart.x;
      const deltaY = e.clientY - panStart.y;
      setOffset(panStart.offsetX + deltaX, panStart.offsetY + deltaY);
      return;
    }

    if (isDragging && dragStart && draggedObjectId) {
      const deltaX = coords.x - dragStart.x;
      const deltaY = coords.y - dragStart.y;

      if (draggedObjectType === 'bbox') {
        const bbox = annotations.boundingBoxes.find(b => b.id === draggedObjectId);
        if (bbox) {
          if (resizeHandle) {
            let newBbox = { ...bbox };
            
            switch (resizeHandle) {
              case 'nw':
                newBbox.width = Math.max(10, bbox.width - deltaX);
                newBbox.height = Math.max(10, bbox.height - deltaY);
                newBbox.x = bbox.x + (bbox.width - newBbox.width);
                newBbox.y = bbox.y + (bbox.height - newBbox.height);
                break;
              case 'n':
                newBbox.height = Math.max(10, bbox.height - deltaY);
                newBbox.y = bbox.y + (bbox.height - newBbox.height);
                break;
              case 'ne':
                newBbox.width = Math.max(10, bbox.width + deltaX);
                newBbox.height = Math.max(10, bbox.height - deltaY);
                newBbox.y = bbox.y + (bbox.height - newBbox.height);
                break;
              case 'e':
                newBbox.width = Math.max(10, bbox.width + deltaX);
                break;
              case 'se':
                newBbox.width = Math.max(10, bbox.width + deltaX);
                newBbox.height = Math.max(10, bbox.height + deltaY);
                break;
              case 's':
                newBbox.height = Math.max(10, bbox.height + deltaY);
                break;
              case 'sw':
                newBbox.width = Math.max(10, bbox.width - deltaX);
                newBbox.height = Math.max(10, bbox.height + deltaY);
                newBbox.x = bbox.x + (bbox.width - newBbox.width);
                break;
              case 'w':
                newBbox.width = Math.max(10, bbox.width - deltaX);
                newBbox.x = bbox.x + (bbox.width - newBbox.width);
                break;
            }

            const clamped = clampToImageBounds(newBbox.x, newBbox.y, newBbox.width, newBbox.height, imageState.width, imageState.height);
            updateBoundingBox(bbox.id, clamped);
          } else {
            const newX = Math.max(0, Math.min(bbox.x + deltaX, imageState.width - bbox.width));
            const newY = Math.max(0, Math.min(bbox.y + deltaY, imageState.height - bbox.height));
            updateBoundingBox(bbox.id, { x: newX, y: newY });
          }
        }
      } else if (draggedObjectType === 'ruler') {
        if (lineHandle) {
          const ruler = annotations.rulers.find(r => r.id === draggedObjectId);
          if (ruler) {
            if (lineHandle === 'start') {
              updateRuler(ruler.id, { x1: coords.x, y1: coords.y });
            } else if (lineHandle === 'end') {
              updateRuler(ruler.id, { x2: coords.x, y2: coords.y });
            }
          }
        } else {
          const ruler = annotations.rulers.find(r => r.id === draggedObjectId);
          if (ruler) {
            updateRuler(ruler.id, {
              x1: ruler.x1 + deltaX,
              y1: ruler.y1 + deltaY,
              x2: ruler.x2 + deltaX,
              y2: ruler.y2 + deltaY
            });
          }
        }
      } else if (draggedObjectType === 'calibration') {
        if (lineHandle) {
          if (annotations.calibrationLine) {
            if (lineHandle === 'start') {
              updateCalibrationLine({ x1: coords.x, y1: coords.y });
            } else if (lineHandle === 'end') {
              updateCalibrationLine({ x2: coords.x, y2: coords.y });
            }
          }
        } else {
          if (annotations.calibrationLine) {
            updateCalibrationLine({
              x1: annotations.calibrationLine.x1 + deltaX,
              y1: annotations.calibrationLine.y1 + deltaY,
              x2: annotations.calibrationLine.x2 + deltaX,
              y2: annotations.calibrationLine.y2 + deltaY
            });
          }
        }
      } else if (draggedObjectType === 'density') {
        const point = annotations.densityPoints.find(p => p.id === draggedObjectId);
        if (point) {
          updateDensityPoint(point.id, {
            x: Math.max(0, Math.min(coords.x, imageState.width)),
            y: Math.max(0, Math.min(coords.y, imageState.height))
          });
        }
      }

      if (!lineHandle) {
        setDragStart(coords);
      }
    }

    if (isDrawing) {
      if (currentBox) {
        const width = coords.x - currentBox.x;
        const height = coords.y - currentBox.y;
        setCurrentBox({ ...currentBox, width, height });
      } else if (currentLine) {
        setCurrentLine({ ...currentLine, x2: coords.x, y2: coords.y });
      }
    }
  }, [imageState, getImageCoords, getHoverCursor, hoverCursor, isPanning, panStart, setOffset, isDragging, dragStart, annotations, resizeHandle, updateBoundingBox, updateRuler, updateCalibrationLine, updateDensityPoint, isDrawing, currentBox, currentLine]);

  // Обработчик отпускания мыши
  const handleMouseUp = useCallback((e: React.MouseEvent, canvasRef: React.RefObject<HTMLCanvasElement>) => {
    if (isPanning) {
      setIsPanning(false);
      setPanStart(null);
      return;
    }

    if (isDragging) {
      setIsDragging(false);
      setDragStart(null);
      setDraggedObjectId(null);
      setDraggedObjectType(null);
      setResizeHandle(null);
      setLineHandle(null);
      return;
    }

    if (isDrawing) {
      const coords = getImageCoords(e.clientX, e.clientY, canvasRef);

      if (currentBox && Math.abs(currentBox.width) > 10 && Math.abs(currentBox.height) > 10) {
        const normalizedBox = {
          x: Math.min(currentBox.x, currentBox.x + currentBox.width),
          y: Math.min(currentBox.y, currentBox.y + currentBox.height),
          width: Math.abs(currentBox.width),
          height: Math.abs(currentBox.height)
        };

        const clampedBox = clampToImageBounds(normalizedBox.x, normalizedBox.y, normalizedBox.width, normalizedBox.height, imageState.width, imageState.height);
        
        onBboxCreated({
          ...clampedBox,
          classId: activeClassId
        });
      } else if (currentLine && calculateDistance(currentLine.x1, currentLine.y1, currentLine.x2, currentLine.y2) > 5) {
        if (activeTool === 'ruler') {
          const rulerId = addRuler({
            x1: currentLine.x1,
            y1: currentLine.y1,
            x2: currentLine.x2,
            y2: currentLine.y2
          });
          selectObject(rulerId, 'ruler');
        } else if (activeTool === 'calibration') {
          const lineData = {
            x1: currentLine.x1,
            y1: currentLine.y1,
            x2: currentLine.x2,
            y2: currentLine.y2,
            realLength: 50
          };
          
          if (annotations.calibrationLine) {
            updateCalibrationLine(lineData);
            onCalibrationLineFinished(lineData, false);
          } else {
            onCalibrationLineFinished(lineData, true);
          }
        }
      }

      setIsDrawing(false);
      setCurrentBox(null);
      setCurrentLine(null);
    }
  }, [isPanning, isDragging, isDrawing, currentBox, currentLine, getImageCoords, imageState, activeClassId, onBboxCreated, addRuler, selectObject, activeTool, annotations.calibrationLine, updateCalibrationLine, onCalibrationLineFinished]);

  // Обработка колеса мыши для масштабирования
  const handleWheel = useCallback((e: React.WheelEvent, canvasRef: React.RefObject<HTMLCanvasElement>) => {
    e.preventDefault();
    
    if (!imageState.imageElement) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const pointX = e.clientX - rect.left;
    const pointY = e.clientY - rect.top;
    
    const zoomIn = e.deltaY < 0;
    zoomToPoint(pointX, pointY, zoomIn, canvas.clientWidth, canvas.clientHeight);
  }, [imageState.imageElement, zoomToPoint]);

  // Получение курсора
  const getCursor = () => {
    if (isPanning) return 'grabbing';
    if (isDragging) {
      if (lineHandle) return 'pointer';
      if (resizeHandle) {
        const cursorMap = {
          'nw': 'nw-resize', 'n': 'n-resize', 'ne': 'ne-resize',
          'e': 'e-resize', 'se': 'se-resize', 's': 's-resize',
          'sw': 'sw-resize', 'w': 'w-resize'
        };
        return cursorMap[resizeHandle] || 'grabbing';
      }
      return 'grabbing';
    }
    if (isDrawing) {
      if (activeTool === 'bbox' && activeClassId >= 0) return 'crosshair';
      if (activeTool === 'ruler' || activeTool === 'calibration') return 'crosshair';
      if (activeTool === 'density') return 'crosshair';
    }
    
    if (!isDragging && !isPanning && !isDrawing) {
      return hoverCursor;
    }

    if (activeTool === 'bbox' && activeClassId >= 0) return 'crosshair';
    if (activeTool === 'ruler' || activeTool === 'calibration') return 'crosshair';
    if (activeTool === 'density') return 'crosshair';
    
    return 'default';
  };

  return {
    // Состояния для отрисовки
    isDrawing,
    currentBox,
    currentLine,
    
    // Обработчики событий
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleWheel,
    
    // Утилиты
    getCursor,
    
    // Для контекстного меню
    handleContextMenu: (e: React.MouseEvent) => {
      e.preventDefault();
      onShowContextMenu(e.clientX, e.clientY);
    }
  };
};