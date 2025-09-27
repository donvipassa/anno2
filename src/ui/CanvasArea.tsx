import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useImage } from '../core/ImageProvider';
import { useAnnotations } from '../core/AnnotationManager';
import { useCalibration } from '../core/CalibrationManager';
import { DEFECT_CLASSES, BoundingBox, Ruler, CalibrationLine, DensityPoint } from '../types';
import { calculateDistance, pointInRect, clampToImageBounds } from '../utils/geometry';
import { calculateDensity } from '../utils/imageUtils';
import { drawBoundingBox, drawResizeHandles, getResizeHandle, isPointInBox } from '../utils/canvas';
import { v4 as uuidv4 } from 'uuid';
import jsonData from '../data/defect-classes.json';

interface CanvasAreaProps {
  activeTool: string;
  activeClassId: number;
  layerVisible: boolean;
  filterActive: boolean;
  onToolChange: (tool: string) => void;
  onSelectClass: (classId: number) => void;
  onShowContextMenu: (x: number, y: number) => void;
  onCalibrationLineFinished: (lineData: any, isNew: boolean) => void;
  onBboxCreated: (bboxData: Omit<BoundingBox, 'id' | 'defectRecord' | 'formattedDefectString'>) => void;
  onEditDefectBbox: (bboxId: string) => void;
}

export const CanvasArea: React.FC<CanvasAreaProps> = ({
  activeTool,
  activeClassId,
  layerVisible,
  filterActive,
  onToolChange,
  onSelectClass,
  onShowContextMenu,
  onCalibrationLineFinished,
  onBboxCreated,
  onEditDefectBbox
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const { imageState, setOffset, zoomToPoint, getOriginalPixelColor, fitToCanvas } = useImage();
  const { 
    annotations, 
    addRuler, 
    updateRuler, 
    deleteRuler,
    addDensityPoint,
    updateDensityPoint,
    deleteDensityPoint,
    setCalibrationLine,
    updateCalibrationLine,
    deleteCalibrationLine,
    selectObject,
    updateBoundingBox,
    deleteBoundingBox
  } = useAnnotations();
  const { calibration, getLength } = useCalibration();

  // Состояние для рисования
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentBox, setCurrentBox] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [currentLine, setCurrentLine] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  const [lineHandle, setLineHandle] = useState<'start' | 'end' | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number; offsetX: number; offsetY: number } | null>(null);
  const [hoverCursor, setHoverCursor] = useState<string>('default');

  // Получение координат изображения из координат мыши
  const getImageCoords = useCallback((clientX: number, clientY: number) => {
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
    // Проверяем маркеры линеек и калибровочной линии
    const markerTolerance = 10 / imageState.scale;
    
    // Проверяем маркеры калибровочной линии
    if (annotations.calibrationLine) {
      const line = annotations.calibrationLine;
      const distToStart = calculateDistance(x, y, line.x1, line.y1);
      const distToEnd = calculateDistance(x, y, line.x2, line.y2);
      
      if (distToStart <= markerTolerance) {
        return { type: 'calibration', object: line, handle: 'start' };
      }
      if (distToEnd <= markerTolerance) {
        return { type: 'calibration', object: line, handle: 'end' };
      }
    }
    
    // Проверяем маркеры линеек
    for (let i = annotations.rulers.length - 1; i >= 0; i--) {
      const ruler = annotations.rulers[i];
      const distToStart = calculateDistance(x, y, ruler.x1, ruler.y1);
      const distToEnd = calculateDistance(x, y, ruler.x2, ruler.y2);
      
      if (distToStart <= markerTolerance) {
        return { type: 'ruler', object: ruler, handle: 'start' };
      }
      if (distToEnd <= markerTolerance) {
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
    const rulerTolerance = 15 / imageState.scale;
    for (let i = annotations.rulers.length - 1; i >= 0; i--) {
      const ruler = annotations.rulers[i];
      const distance = Math.abs((ruler.y2 - ruler.y1) * x - (ruler.x2 - ruler.x1) * y + ruler.x2 * ruler.y1 - ruler.y2 * ruler.x1) /
                      Math.sqrt((ruler.y2 - ruler.y1) ** 2 + (ruler.x2 - ruler.x1) ** 2);
      
      if (distance <= rulerTolerance &&
          x >= Math.min(ruler.x1, ruler.x2) - rulerTolerance &&
          x <= Math.max(ruler.x1, ruler.x2) + rulerTolerance &&
          y >= Math.min(ruler.y1, ruler.y2) - rulerTolerance &&
          y <= Math.max(ruler.y1, ruler.y2) + rulerTolerance) {
        return { type: 'ruler', object: ruler };
      }
    }

    // Проверяем калибровочную линию
    if (annotations.calibrationLine) {
      const line = annotations.calibrationLine;
      const distance = Math.abs((line.y2 - line.y1) * x - (line.x2 - line.x1) * y + line.x2 * line.y1 - line.y2 * line.x1) /
                      Math.sqrt((line.y2 - line.y1) ** 2 + (line.x2 - line.x1) ** 2);
      
      if (distance <= rulerTolerance &&
          x >= Math.min(line.x1, line.x2) - rulerTolerance &&
          x <= Math.max(line.x1, line.x2) + rulerTolerance &&
          y >= Math.min(line.y1, line.y2) - rulerTolerance &&
          y <= Math.max(line.y1, line.y2) + rulerTolerance) {
        return { type: 'calibration', object: line };
      }
    }

    // Проверяем точки плотности
    const densityTolerance = 25 / imageState.scale;
    for (let i = annotations.densityPoints.length - 1; i >= 0; i--) {
      const point = annotations.densityPoints[i];
      const distance = calculateDistance(x, y, point.x, point.y);
      if (distance <= densityTolerance) {
        return { type: 'density', object: point };
      }
    }

    return null;
  }, [annotations, imageState.scale]);

  // Определение курсора при наведении
  const getHoverCursor = useCallback((x: number, y: number) => {
    const markerTolerance = 10 / imageState.scale;
    
    // Проверяем точки плотности
    const densityTolerance = 25 / imageState.scale;
    for (let i = annotations.densityPoints.length - 1; i >= 0; i--) {
      const point = annotations.densityPoints[i];
      const distance = calculateDistance(x, y, point.x, point.y);
      if (distance <= densityTolerance) {
        return 'pointer';
      }
    }

    // Проверяем маркеры калибровочной линии
    if (annotations.calibrationLine) {
      const line = annotations.calibrationLine;
      const distToStart = calculateDistance(x, y, line.x1, line.y1);
      const distToEnd = calculateDistance(x, y, line.x2, line.y2);
      
      if (distToStart <= markerTolerance || distToEnd <= markerTolerance) {
        return 'pointer';
      }
    }
    
    // Проверяем маркеры линеек
    for (let i = annotations.rulers.length - 1; i >= 0; i--) {
      const ruler = annotations.rulers[i];
      const distToStart = calculateDistance(x, y, ruler.x1, ruler.y1);
      const distToEnd = calculateDistance(x, y, ruler.x2, ruler.y2);
      
      if (distToStart <= markerTolerance || distToEnd <= markerTolerance) {
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
      // Проверяем только границы рамки (не внутреннюю область)
      const borderWidth = 4 / imageState.scale;
      const isOnBorder = (
        // Верхняя граница
        (x >= bbox.x - borderWidth && x <= bbox.x + bbox.width + borderWidth && 
         y >= bbox.y - borderWidth && y <= bbox.y + borderWidth) ||
        // Нижняя граница
        (x >= bbox.x - borderWidth && x <= bbox.x + bbox.width + borderWidth && 
         y >= bbox.y + bbox.height - borderWidth && y <= bbox.y + bbox.height + borderWidth) ||
        // Левая граница
        (x >= bbox.x - borderWidth && x <= bbox.x + borderWidth && 
         y >= bbox.y - borderWidth && y <= bbox.y + bbox.height + borderWidth) ||
        // Правая граница
        (x >= bbox.x + bbox.width - borderWidth && x <= bbox.x + bbox.width + borderWidth && 
         y >= bbox.y - borderWidth && y <= bbox.y + bbox.height + borderWidth)
      );
      
      if (isOnBorder) {
        return 'move';
      }
    }

    // Проверяем тело калибровочной линии для перемещения
    if (annotations.calibrationLine) {
      const line = annotations.calibrationLine;
      const rulerTolerance = 15 / imageState.scale;
      const distance = Math.abs((line.y2 - line.y1) * x - (line.x2 - line.x1) * y + line.x2 * line.y1 - line.y2 * line.x1) /
                      Math.sqrt((line.y2 - line.y1) ** 2 + (line.x2 - line.x1) ** 2);
      
      if (distance <= rulerTolerance &&
          x >= Math.min(line.x1, line.x2) - rulerTolerance &&
          x <= Math.max(line.x1, line.x2) + rulerTolerance &&
          y >= Math.min(line.y1, line.y2) - rulerTolerance &&
          y <= Math.max(line.y1, line.y2) + rulerTolerance) {
        // Проверяем, что это не маркер
        const distToStart = calculateDistance(x, y, line.x1, line.y1);
        const distToEnd = calculateDistance(x, y, line.x2, line.y2);
        if (distToStart > markerTolerance && distToEnd > markerTolerance) {
          return 'move';
        }
      }
    }

    // Проверяем тело линеек для перемещения
    const rulerTolerance = 15 / imageState.scale;
    for (let i = annotations.rulers.length - 1; i >= 0; i--) {
      const ruler = annotations.rulers[i];
      const distance = Math.abs((ruler.y2 - ruler.y1) * x - (ruler.x2 - ruler.x1) * y + ruler.x2 * ruler.y1 - ruler.y2 * ruler.x1) /
                      Math.sqrt((ruler.y2 - ruler.y1) ** 2 + (ruler.x2 - ruler.x1) ** 2);
      
      if (distance <= rulerTolerance &&
          x >= Math.min(ruler.x1, ruler.x2) - rulerTolerance &&
          x <= Math.max(ruler.x1, ruler.x2) + rulerTolerance &&
          y >= Math.min(ruler.y1, ruler.y2) - rulerTolerance &&
          y <= Math.max(ruler.y1, ruler.y2) + rulerTolerance) {
        // Проверяем, что это не маркер
        const distToStart = calculateDistance(x, y, ruler.x1, ruler.y1);
        const distToEnd = calculateDistance(x, y, ruler.x2, ruler.y2);
        if (distToStart > markerTolerance && distToEnd > markerTolerance) {
          return 'move';
        }
      }
    }
    return 'default';
  }, [annotations, imageState.scale]);

  // Обработчик нажатия мыши
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!imageState.imageElement) return;

    const coords = getImageCoords(e.clientX, e.clientY);
    
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
        // Выделяем объект
        selectObject(clickedObject.object.id, clickedObject.type.split('-')[0] as any);
        
        // Проверяем, можно ли изменить размер bbox
        if (clickedObject.type === 'bbox') {
          const handle = getResizeHandle(coords.x, coords.y, clickedObject.object, imageState.scale);
          if (handle && handle !== 'move') {
            setResizeHandle(handle);
            setIsDragging(true);
            setDragStart(coords);
            return;
          } else if (handle === 'move') {
            // Проверяем, что клик был именно на границе рамки
            const bbox = clickedObject.object;
            const borderWidth = 4 / imageState.scale;
            const isOnBorder = (
              // Верхняя граница
              (coords.x >= bbox.x - borderWidth && coords.x <= bbox.x + bbox.width + borderWidth && 
               coords.y >= bbox.y - borderWidth && coords.y <= bbox.y + borderWidth) ||
              // Нижняя граница
              (coords.x >= bbox.x - borderWidth && coords.x <= bbox.x + bbox.width + borderWidth && 
               coords.y >= bbox.y + bbox.height - borderWidth && coords.y <= bbox.y + bbox.height + borderWidth) ||
              // Левая граница
              (coords.x >= bbox.x - borderWidth && coords.x <= bbox.x + borderWidth && 
               coords.y >= bbox.y - borderWidth && coords.y <= bbox.y + bbox.height + borderWidth) ||
              // Правая граница
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
        
        // Проверяем маркеры линеек и калибровочной линии
        if (clickedObject.handle) {
          setLineHandle(clickedObject.handle);
          setIsDragging(true);
          setDragStart(coords);
          return;
        }

        // Начинаем перетаскивание
        setIsDragging(true);
        setDragStart(coords);
      } else {
        // Сбрасываем выделение
        selectObject(null, null);

        // Начинаем рисование в зависимости от активного инструмента
        if (activeTool === 'bbox' && activeClassId >= 0) {
          setIsDrawing(true);
          setCurrentBox({ x: coords.x, y: coords.y, width: 0, height: 0 });
        } else if (activeTool === 'ruler' || activeTool === 'calibration') {
          setIsDrawing(true);
          setCurrentLine({ x1: coords.x, y1: coords.y, x2: coords.x, y2: coords.y });
        } else if (activeTool === 'density') {
          // Создаем точку плотности сразу
          const pointId = addDensityPoint({ x: coords.x, y: coords.y });
          selectObject(pointId, 'density');
        }
      }
    }
  }, [imageState, getImageCoords, getObjectAtPoint, selectObject, activeTool, activeClassId, addDensityPoint]);

  // Обработчик движения мыши
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!imageState.imageElement) return;

    const coords = getImageCoords(e.clientX, e.clientY);

    // Обновляем курсор при движении мыши (всегда, кроме активного перетаскивания)
    const newCursor = getHoverCursor(coords.x, coords.y);
    if (newCursor !== hoverCursor) {
      setHoverCursor(newCursor);
    }

    // Панорамирование
    if (isPanning && panStart) {
      const deltaX = e.clientX - panStart.x;
      const deltaY = e.clientY - panStart.y;
      setOffset(panStart.offsetX + deltaX, panStart.offsetY + deltaY);
      return;
    }

    // Перетаскивание объектов
    if (isDragging && dragStart && annotations.selectedObjectId) {
      const deltaX = coords.x - dragStart.x;
      const deltaY = coords.y - dragStart.y;

      if (annotations.selectedObjectType === 'bbox') {
        const bbox = annotations.boundingBoxes.find(b => b.id === annotations.selectedObjectId);
        if (bbox) {
          if (resizeHandle) {
            // Изменение размера
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

            // Ограничиваем границами изображения
            const clamped = clampToImageBounds(newBbox.x, newBbox.y, newBbox.width, newBbox.height, imageState.width, imageState.height);
            updateBoundingBox(bbox.id, clamped);
          } else {
            // Перемещение
            const newX = Math.max(0, Math.min(bbox.x + deltaX, imageState.width - bbox.width));
            const newY = Math.max(0, Math.min(bbox.y + deltaY, imageState.height - bbox.height));
            updateBoundingBox(bbox.id, { x: newX, y: newY });
          }
        }
      } else if (annotations.selectedObjectType === 'ruler') {
        if (lineHandle) {
          // Изменение размера линейки за маркер
          const ruler = annotations.rulers.find(r => r.id === annotations.selectedObjectId);
          if (ruler) {
            if (lineHandle === 'start') {
              updateRuler(ruler.id, { x1: coords.x, y1: coords.y });
            } else if (lineHandle === 'end') {
              updateRuler(ruler.id, { x2: coords.x, y2: coords.y });
            }
          }
        } else {
          // Перемещение всей линейки
          const ruler = annotations.rulers.find(r => r.id === annotations.selectedObjectId);
          if (ruler) {
            updateRuler(ruler.id, {
              x1: ruler.x1 + deltaX,
              y1: ruler.y1 + deltaY,
              x2: ruler.x2 + deltaX,
              y2: ruler.y2 + deltaY
            });
          }
        }
      } else if (annotations.selectedObjectType === 'calibration') {
        if (lineHandle) {
          // Изменение размера калибровочной линии за маркер
          if (annotations.calibrationLine) {
            if (lineHandle === 'start') {
              updateCalibrationLine({ x1: coords.x, y1: coords.y });
            } else if (lineHandle === 'end') {
              updateCalibrationLine({ x2: coords.x, y2: coords.y });
            }
          }
        } else {
          // Перемещение всей калибровочной линии
          if (annotations.calibrationLine) {
            updateCalibrationLine({
              x1: annotations.calibrationLine.x1 + deltaX,
              y1: annotations.calibrationLine.y1 + deltaY,
              x2: annotations.calibrationLine.x2 + deltaX,
              y2: annotations.calibrationLine.y2 + deltaY
            });
          }
        }
      } else if (annotations.selectedObjectType === 'density') {
        const point = annotations.densityPoints.find(p => p.id === annotations.selectedObjectId);
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

    // Рисование новых объектов
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
  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (isPanning) {
      setIsPanning(false);
      setPanStart(null);
      return;
    }

    if (isDragging) {
      setIsDragging(false);
      setDragStart(null);
      setResizeHandle(null);
      setLineHandle(null);
      return;
    }

    if (isDrawing) {
      const coords = getImageCoords(e.clientX, e.clientY);

      if (currentBox && Math.abs(currentBox.width) > 10 && Math.abs(currentBox.height) > 10) {
        // Нормализуем координаты bbox
        const normalizedBox = {
          x: Math.min(currentBox.x, currentBox.x + currentBox.width),
          y: Math.min(currentBox.y, currentBox.y + currentBox.height),
          width: Math.abs(currentBox.width),
          height: Math.abs(currentBox.height)
        };

        // Ограничиваем границами изображения
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
            realLength: 50 // значение по умолчанию
          };
          
          if (annotations.calibrationLine) {
            // Редактирование существующей линии
            updateCalibrationLine(lineData);
            onCalibrationLineFinished(lineData, false);
          } else {
            // Создание новой линии
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
  const handleWheel = useCallback((e: React.WheelEvent) => {
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

  // Обработчик двойного клика
  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    if (!imageState.imageElement) return;
    const coords = getImageCoords(e.clientX, e.clientY);
    const clickedObject = getObjectAtPoint(coords.x, coords.y);
    
    if (clickedObject && clickedObject.type === 'bbox') {
      const bbox = clickedObject.object as BoundingBox;
      // Проверяем, что это рамка дефекта (классы 0-9) или что у неё есть запись дефекта
      if ((bbox.classId >= 0 && bbox.classId <= 9) || bbox.defectRecord) {
        onEditDefectBbox(bbox.id);
      }
    }
  }, [imageState.imageElement, getImageCoords, getObjectAtPoint, onEditDefectBbox]);

  // Обработчик клавиш
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Delete' && annotations.selectedObjectId) {
      switch (annotations.selectedObjectType) {
        case 'bbox':
          deleteBoundingBox(annotations.selectedObjectId);
          break;
        case 'ruler':
          deleteRuler(annotations.selectedObjectId);
          break;
        case 'calibration':
          deleteCalibrationLine();
          break;
        case 'density':
          deleteDensityPoint(annotations.selectedObjectId);
          break;
      }
      selectObject(null, null);
    }
  }, [annotations.selectedObjectId, annotations.selectedObjectType, deleteBoundingBox, deleteRuler, deleteCalibrationLine, deleteDensityPoint, selectObject]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Отрисовка canvas
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imageState.imageElement) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Очищаем canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Применяем трансформации
    ctx.save();
    ctx.translate(imageState.offsetX, imageState.offsetY);
    ctx.scale(imageState.scale, imageState.scale);

    // Рисуем изображение
    if (imageState.inverted) {
      ctx.filter = 'invert(1)';
    }
    ctx.drawImage(imageState.imageElement, 0, 0, imageState.width, imageState.height);
    ctx.filter = 'none';

    if (layerVisible) {
      // Рисуем bounding boxes
      annotations.boundingBoxes.forEach(bbox => {
        // Применяем фильтр активного класса
        if (filterActive && activeClassId >= 0 && bbox.classId !== activeClassId) {
          return;
        }

        const isSelected = annotations.selectedObjectId === bbox.id && annotations.selectedObjectType === 'bbox';
        drawBoundingBox(ctx, bbox, isSelected, imageState.scale, DEFECT_CLASSES, jsonData, annotations.calibrationLine);
      });

      // Рисуем линейки
      ctx.strokeStyle = '#FFFF00';
      ctx.lineWidth = 2 / imageState.scale;
      annotations.rulers.forEach(ruler => {
        const isSelected = annotations.selectedObjectId === ruler.id && annotations.selectedObjectType === 'ruler';
        
        ctx.strokeStyle = isSelected ? '#FF0000' : '#FFFF00';
        ctx.lineWidth = (isSelected ? 3 : 2) / imageState.scale;
        
        ctx.beginPath();
        ctx.moveTo(ruler.x1, ruler.y1);
        ctx.lineTo(ruler.x2, ruler.y2);
        ctx.stroke();

        // Маркеры на концах
        const markerSize = 4 / imageState.scale;
        ctx.fillStyle = ctx.strokeStyle;
        ctx.beginPath();
        ctx.arc(ruler.x1, ruler.y1, markerSize, 0, 2 * Math.PI);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(ruler.x2, ruler.y2, markerSize, 0, 2 * Math.PI);
        ctx.fill();

        // Подпись с длиной
        const length = calculateDistance(ruler.x1, ruler.y1, ruler.x2, ruler.y2);
        const lengthInfo = annotations.calibrationLine ? (() => {
          const pixelLength = Math.sqrt(
            (annotations.calibrationLine.x2 - annotations.calibrationLine.x1) ** 2 + 
            (annotations.calibrationLine.y2 - annotations.calibrationLine.y1) ** 2
          );
          const scale = annotations.calibrationLine.realLength / pixelLength;
          return { value: length * scale, unit: 'мм' };
        })() : { value: length, unit: 'px' };
        const midX = (ruler.x1 + ruler.x2) / 2;
        const midY = (ruler.y1 + ruler.y2) / 2;
        
        ctx.fillStyle = '#FFFF00';
        ctx.font = `${Math.max(16 / imageState.scale, 12)}px Arial`;
        ctx.fillText(`${lengthInfo.value.toFixed(1)} ${lengthInfo.unit}`, midX, midY - 10 / imageState.scale);
      });

      // Рисуем калибровочную линию
      if (annotations.calibrationLine) {
        const line = annotations.calibrationLine;
        const isSelected = annotations.selectedObjectId === line.id && annotations.selectedObjectType === 'calibration';
        
        ctx.strokeStyle = isSelected ? '#FF0000' : '#0000FF';
        ctx.lineWidth = (isSelected ? 4 : 3) / imageState.scale;
        
        ctx.beginPath();
        ctx.moveTo(line.x1, line.y1);
        ctx.lineTo(line.x2, line.y2);
        ctx.stroke();

        // Маркеры на концах
        const markerSize = 5 / imageState.scale;
        ctx.fillStyle = ctx.strokeStyle;
        ctx.beginPath();
        ctx.arc(line.x1, line.y1, markerSize, 0, 2 * Math.PI);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(line.x2, line.y2, markerSize, 0, 2 * Math.PI);
        ctx.fill();

        // Подпись с реальной длиной
        const midX = (line.x1 + line.x2) / 2;
        const midY = (line.y1 + line.y2) / 2;
        
        ctx.fillStyle = '#0000FF';
        ctx.font = `${Math.max(16 / imageState.scale, 12)}px Arial`;
        ctx.fillText(`${line.realLength} мм`, midX, midY - 10 / imageState.scale);
      }

      // Рисуем точки плотности
      annotations.densityPoints.forEach(point => {
        const isSelected = annotations.selectedObjectId === point.id && annotations.selectedObjectType === 'density';
        
        ctx.strokeStyle = isSelected ? '#FF0000' : '#FF00FF';
        ctx.lineWidth = (isSelected ? 3 : 2) / imageState.scale;

        // Крест
        const crossSize = 15 / imageState.scale;
        ctx.beginPath();
        ctx.moveTo(point.x - crossSize, point.y);
        ctx.lineTo(point.x + crossSize, point.y);
        ctx.moveTo(point.x, point.y - crossSize);
        ctx.lineTo(point.x, point.y + crossSize);
        ctx.stroke();

        // Значение плотности
        const originalColor = getOriginalPixelColor(point.x, point.y);
        if (originalColor) {
          const [r, g, b] = originalColor;
          const gray = 0.299 * r + 0.587 * g + 0.114 * b;
          const density = 1 - (gray / 255);
          
          ctx.fillStyle = '#FF00FF';
          ctx.font = `${Math.max(16 / imageState.scale, 12)}px Arial`;
          ctx.fillText(`${density.toFixed(2)}`, point.x + 20 / imageState.scale, point.y - 5 / imageState.scale);
        }
      });
    }

    // Рисуем текущий объект в процессе создания
    if (isDrawing) {
      if (currentBox) {
        ctx.strokeStyle = '#00FF00';
        ctx.lineWidth = 2 / imageState.scale;
        ctx.setLineDash([5 / imageState.scale, 5 / imageState.scale]);
        ctx.strokeRect(currentBox.x, currentBox.y, currentBox.width, currentBox.height);
        ctx.setLineDash([]);
      } else if (currentLine) {
        ctx.strokeStyle = activeTool === 'calibration' ? '#0000FF' : '#FFFF00';
        ctx.lineWidth = 2 / imageState.scale;
        ctx.setLineDash([5 / imageState.scale, 5 / imageState.scale]);
        ctx.beginPath();
        ctx.moveTo(currentLine.x1, currentLine.y1);
        ctx.lineTo(currentLine.x2, currentLine.y2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    ctx.restore();
  }, [imageState, annotations, layerVisible, filterActive, activeClassId, isDrawing, currentBox, currentLine, activeTool, getOriginalPixelColor, getLength]);

  // Обновление canvas при изменениях
  useEffect(() => {
    draw();
  }, [draw]);

  // Автоматическая подгонка изображения при загрузке
  useEffect(() => {
    if (imageState.src && containerRef.current) {
      const container = containerRef.current;
      setTimeout(() => {
        fitToCanvas(container.clientWidth, container.clientHeight);
      }, 100);
    }
  }, [imageState.src, fitToCanvas]);

  // Подгонка canvas к размеру контейнера
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const resizeCanvas = () => {
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
      draw();
    };

    resizeCanvas();
    
    const resizeObserver = new ResizeObserver(resizeCanvas);
    resizeObserver.observe(container);
    
    return () => resizeObserver.disconnect();
  }, [draw]);

  // Курсор
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
    
    // Возвращаем курсор на основе наведения
    if (!isDragging && !isPanning && !isDrawing) {
      return hoverCursor;
    }

    // Курсоры для активных инструментов
    if (activeTool === 'bbox' && activeClassId >= 0) return 'crosshair';
    if (activeTool === 'ruler' || activeTool === 'calibration') return 'crosshair';
    if (activeTool === 'density') return 'crosshair';
    
    return 'default';
  };

  return (
    <div 
      ref={containerRef} 
      className="flex-1 bg-gray-100 relative overflow-hidden"
      onContextMenu={(e) => e.preventDefault()}
    >
      {!imageState.src ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-gray-500">
            <p className="text-lg font-medium mb-2">Загрузите изображение для начала разметки</p>
            <p className="text-sm">Поддерживаются форматы: JPG, PNG, TIFF, BMP (до 20 МБ)</p>
          </div>
        </div>
      ) : (
        <canvas
          ref={canvasRef}
          className="w-full h-full block"
          style={{ cursor: getCursor() }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onContextMenu={(e) => {
            e.preventDefault();
            onShowContextMenu(e.clientX, e.clientY);
          }}
          onDoubleClick={handleDoubleClick}
          onWheel={handleWheel}
        />
      )}
    </div>
  );
};