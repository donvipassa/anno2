import { ImageState, AnnotationState } from '../../types';
import { UI_CONFIG } from '../../config';

interface MouseEventHandlerConfig {
  imageState: ImageState;
  annotations: AnnotationState;
  activeTool: string;
  activeClassId: number;
  onBboxCreated: (bboxData: any) => void;
  onCalibrationLineFinished: (lineData: any, isNew: boolean) => void;
  selectObject: (id: string | null, type: any) => void;
  setOffset: (x: number, y: number) => void;
}

export class MouseEventHandler {
  private config: MouseEventHandlerConfig;
  private lastPanPosition = { x: 0, y: 0 };
  private dragStart = { x: 0, y: 0 };
  private didPanWithRMB = false;

  constructor(config: MouseEventHandlerConfig) {
    this.config = config;
  }

  handleMouseDown(e: React.MouseEvent, coords: { x: number; y: number }) {
    if (e.button === 2) {
      // Правая кнопка мыши - панорамирование
      this.lastPanPosition = { x: e.clientX, y: e.clientY };
      this.didPanWithRMB = false;
      return { stateUpdate: { isPanning: true } };
    }

    if (e.button !== 0) return {}; // Только левая кнопка

    // Логика обработки клика по объектам и создания новых
    return this.handleLeftClick(e, coords);
  }

  handleMouseMove(e: React.MouseEvent, coords: { x: number; y: number }, drawingState: any) {
    if (drawingState.isPanning) {
      return this.handlePanning(e);
    }

    if (drawingState.isDrawing) {
      return this.handleDrawing(e, coords, drawingState);
    }

    return {};
  }

  handleMouseUp(e: React.MouseEvent, coords: { x: number; y: number }, drawingState: any) {
    if (drawingState.isPanning) {
      return { stateUpdate: { isPanning: false } };
    }

    if (drawingState.isDrawing) {
      return this.finishDrawing(coords, drawingState);
    }

    return {};
  }

  private handleLeftClick(e: React.MouseEvent, coords: { x: number; y: number }) {
    const { activeTool, activeClassId } = this.config;

    // Проверка клика по существующим объектам
    const clickedObject = this.getObjectAtPoint(coords);
    if (clickedObject) {
      this.config.selectObject(clickedObject.id, clickedObject.type);
      return { stateUpdate: { isDragging: true } };
    }

    // Создание новых объектов
    if (activeTool === 'bbox' && activeClassId >= 0) {
      return this.startBboxDrawing(coords);
    }

    if (activeTool === 'ruler' || activeTool === 'calibration') {
      return this.startLineDrawing(e, coords);
    }

    // Сброс выделения при клике в пустое место
    this.config.selectObject(null, null);
    return {};
  }

  private handlePanning(e: React.MouseEvent) {
    const deltaX = e.clientX - this.lastPanPosition.x;
    const deltaY = e.clientY - this.lastPanPosition.y;
    
    if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) {
      this.didPanWithRMB = true;
    }
    
    const { imageState, setOffset } = this.config;
    setOffset(
      imageState.offsetX + deltaX,
      imageState.offsetY + deltaY
    );
    
    this.lastPanPosition = { x: e.clientX, y: e.clientY };
    return {};
  }

  private handleDrawing(e: React.MouseEvent, coords: { x: number; y: number }, drawingState: any) {
    const { activeTool } = this.config;

    if (activeTool === 'bbox' && drawingState.currentBox) {
      return this.updateBboxDrawing(coords, drawingState);
    }

    if ((activeTool === 'ruler' || activeTool === 'calibration') && drawingState.currentLine) {
      return this.updateLineDrawing(e, drawingState);
    }

    return {};
  }

  private startBboxDrawing(coords: { x: number; y: number }) {
    return {
      stateUpdate: {
        isDrawing: true,
        currentBox: {
          x: coords.x,
          y: coords.y,
          width: 0,
          height: 0
        }
      }
    };
  }

  private startLineDrawing(e: React.MouseEvent, coords: { x: number; y: number }) {
    const canvas = e.currentTarget as HTMLCanvasElement;
    const rect = canvas.getBoundingClientRect();
    const canvasX = e.clientX - rect.left;
    const canvasY = e.clientY - rect.top;

    return {
      stateUpdate: {
        isDrawing: true,
        currentLine: {
          x1: canvasX,
          y1: canvasY,
          x2: canvasX,
          y2: canvasY
        }
      }
    };
  }

  private updateBboxDrawing(coords: { x: number; y: number }, drawingState: any) {
    const startPoint = drawingState.startPoint || { x: drawingState.currentBox.x, y: drawingState.currentBox.y };
    
    return {
      stateUpdate: {
        currentBox: {
          x: Math.min(startPoint.x, coords.x),
          y: Math.min(startPoint.y, coords.y),
          width: Math.abs(coords.x - startPoint.x),
          height: Math.abs(coords.y - startPoint.y)
        }
      }
    };
  }

  private updateLineDrawing(e: React.MouseEvent, drawingState: any) {
    const canvas = e.currentTarget as HTMLCanvasElement;
    const rect = canvas.getBoundingClientRect();
    const canvasX = e.clientX - rect.left;
    const canvasY = e.clientY - rect.top;

    return {
      stateUpdate: {
        currentLine: {
          ...drawingState.currentLine,
          x2: canvasX,
          y2: canvasY
        }
      }
    };
  }

  private finishDrawing(coords: { x: number; y: number }, drawingState: any) {
    const { activeTool, activeClassId, onBboxCreated, onCalibrationLineFinished } = this.config;

    if (activeTool === 'bbox' && drawingState.currentBox) {
      const { currentBox } = drawingState;
      if (currentBox.width >= UI_CONFIG.MIN_BBOX_SIZE && currentBox.height >= UI_CONFIG.MIN_BBOX_SIZE) {
        onBboxCreated({
          classId: activeClassId,
          x: currentBox.x,
          y: currentBox.y,
          width: currentBox.width,
          height: currentBox.height
        });
      }
    }

    if (activeTool === 'calibration' && drawingState.currentLine) {
      // Логика завершения калибровочной линии
      const startPoint = { x: 0, y: 0 }; // Нужно сохранять startPoint
      const pixelLength = Math.sqrt(
        (coords.x - startPoint.x) ** 2 + (coords.y - startPoint.y) ** 2
      );
      
      if (pixelLength >= UI_CONFIG.MIN_CALIBRATION_LENGTH) {
        onCalibrationLineFinished({
          x1: startPoint.x,
          y1: startPoint.y,
          x2: coords.x,
          y2: coords.y,
          realLength: 50
        }, true);
      }
    }

    return {
      stateUpdate: {
        isDrawing: false,
        currentBox: null,
        currentLine: null
      }
    };
  }

  private getObjectAtPoint(coords: { x: number; y: number }) {
    // Логика поиска объектов в точке
    // Возвращает объект с id и type или null
    return null;
  }
}