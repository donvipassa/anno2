import { ImageState, AnnotationState, DEFECT_CLASSES } from '../../types';
import { drawBoundingBox } from '../../utils/canvas';
import jsonData from '../../data/defect-classes.json';

interface CanvasRendererConfig {
  imageState: ImageState;
  annotations: AnnotationState;
  layerVisible: boolean;
  filterActive: boolean;
  activeClassId: number;
  getOriginalPixelColor: (x: number, y: number) => [number, number, number] | null;
}

export class CanvasRenderer {
  private config: CanvasRendererConfig;

  constructor(config: CanvasRendererConfig) {
    this.config = config;
  }

  render(canvas: HTMLCanvasElement, drawingState: any) {
    const ctx = canvas.getContext('2d');
    if (!ctx || !this.config.imageState.imageElement) return;

    // Очистка canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Отрисовка изображения
    this.renderImage(ctx);

    if (!this.config.layerVisible) return;

    // Отрисовка аннотаций
    this.renderAnnotations(ctx);

    // Отрисовка текущих рисуемых объектов
    this.renderDrawingObjects(ctx, drawingState);
  }

  private renderImage(ctx: CanvasRenderingContext2D) {
    const { imageState } = this.config;
    const scaledWidth = imageState.width * imageState.scale;
    const scaledHeight = imageState.height * imageState.scale;

    ctx.save();
    if (imageState.inverted) {
      ctx.filter = 'invert(1)';
    }

    ctx.drawImage(
      imageState.imageElement!,
      imageState.offsetX,
      imageState.offsetY,
      scaledWidth,
      scaledHeight
    );
    ctx.restore();
  }

  private renderAnnotations(ctx: CanvasRenderingContext2D) {
    const { imageState, annotations, filterActive, activeClassId } = this.config;

    ctx.save();
    ctx.translate(imageState.offsetX, imageState.offsetY);
    ctx.scale(imageState.scale, imageState.scale);
    
    // Отрисовка bounding boxes
    annotations.boundingBoxes.forEach(bbox => {
      if (filterActive && activeClassId >= 0 && activeClassId !== bbox.classId) return;

      drawBoundingBox(
        ctx,
        bbox,
        annotations.selectedObjectId === bbox.id,
        imageState.scale,
        DEFECT_CLASSES,
        jsonData
      );
    });
    
    ctx.restore();

    // Отрисовка других объектов (линейки, калибровка, точки плотности)
    this.renderRulers(ctx);
    this.renderCalibrationLine(ctx);
    this.renderDensityPoints(ctx);
  }

  private renderRulers(ctx: CanvasRenderingContext2D) {
    const { annotations } = this.config;
    
    annotations.rulers.forEach(ruler => {
      const start = this.getCanvasCoords(ruler.x1, ruler.y1);
      const end = this.getCanvasCoords(ruler.x2, ruler.y2);

      ctx.strokeStyle = '#FFFF00';
      ctx.lineWidth = annotations.selectedObjectId === ruler.id ? 3 : 2;
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();

      // Маркеры и подписи
      this.renderRulerMarkers(ctx, start, end, ruler);
    });
  }

  private renderCalibrationLine(ctx: CanvasRenderingContext2D) {
    const { annotations } = this.config;
    
    if (!annotations.calibrationLine) return;

    const line = annotations.calibrationLine;
    const start = this.getCanvasCoords(line.x1, line.y1);
    const end = this.getCanvasCoords(line.x2, line.y2);

    ctx.strokeStyle = '#0000FF';
    ctx.lineWidth = annotations.selectedObjectId === line.id ? 4 : 3;
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();

    // Маркеры и подписи
    this.renderCalibrationMarkers(ctx, start, end, line);
  }

  private renderDensityPoints(ctx: CanvasRenderingContext2D) {
    const { annotations, getOriginalPixelColor, imageState } = this.config;
    
    annotations.densityPoints.forEach(point => {
      const canvasCoords = this.getCanvasCoords(point.x, point.y);

      // Динамический расчет плотности
      let density = 0;
      const originalColor = getOriginalPixelColor(point.x, point.y);
      if (originalColor) {
        let [r, g, b] = originalColor;
        
        if (imageState.inverted) {
          r = 255 - r;
          g = 255 - g;
          b = 255 - b;
        }
        
        const gray = 0.299 * r + 0.587 * g + 0.114 * b;
        density = 1 - (gray / 255);
      }

      this.renderDensityPoint(ctx, canvasCoords, density, point);
    });
  }

  private renderDrawingObjects(ctx: CanvasRenderingContext2D, drawingState: any) {
    if (drawingState.isDrawing && drawingState.currentBox) {
      this.renderCurrentBox(ctx, drawingState.currentBox);
    }

    if (drawingState.isDrawing && drawingState.currentLine) {
      this.renderCurrentLine(ctx, drawingState.currentLine);
    }
  }

  private getCanvasCoords(imageX: number, imageY: number) {
    const { imageState } = this.config;
    return {
      x: imageState.offsetX + imageX * imageState.scale,
      y: imageState.offsetY + imageY * imageState.scale
    };
  }

  private renderRulerMarkers(ctx: CanvasRenderingContext2D, start: any, end: any, ruler: any) {
    // Реализация отрисовки маркеров линейки
  }

  private renderCalibrationMarkers(ctx: CanvasRenderingContext2D, start: any, end: any, line: any) {
    // Реализация отрисовки маркеров калибровки
  }

  private renderDensityPoint(ctx: CanvasRenderingContext2D, coords: any, density: number, point: any) {
    // Реализация отрисовки точки плотности
  }

  private renderCurrentBox(ctx: CanvasRenderingContext2D, currentBox: any) {
    // Реализация отрисовки текущей рисуемой рамки
  }

  private renderCurrentLine(ctx: CanvasRenderingContext2D, currentLine: any) {
    // Реализация отрисовки текущей рисуемой линии
  }
}