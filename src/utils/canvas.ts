// Вспомогательные функции для масштабирования и позиционирования
import { SIZES } from './constants';
import { BoundingBox, DefectClass, CalibrationLine } from '../types';
import type { ResizeHandle } from '../types/canvas';

interface ApiClassData {
  apiID: number;
  name: string;
  russian_name: string;
  color: [number, number, number];
  description?: string;
}

// Функция для масштабирования от центра
export function scaleFromCenter(
  currentScale: number,
  newScale: number,
  currentOffsetX: number,
  currentOffsetY: number,
  canvasWidth: number,
  canvasHeight: number,
  imageWidth: number,
  imageHeight: number
): { offsetX: number, offsetY: number } {
  // Центр видимой области
  const centerX = canvasWidth / 2;
  const centerY = canvasHeight / 2;
  
  // Точка в координатах изображения, которая находится в центре экрана
  const imageCenterX = (centerX - currentOffsetX) / currentScale;
  const imageCenterY = (centerY - currentOffsetY) / currentScale;
  
  // Новые смещения для сохранения центрирования
  const newOffsetX = centerX - imageCenterX * newScale;
  const newOffsetY = centerY - imageCenterY * newScale;
  
  return { offsetX: newOffsetX, offsetY: newOffsetY };
}

// Функция для вписывания изображения в холст
export function fitImageToCanvas(
  imageWidth: number,
  imageHeight: number,
  canvasWidth: number,
  canvasHeight: number
): { scale: number, offsetX: number, offsetY: number } {
  const scaleX = canvasWidth / imageWidth;
  const scaleY = canvasHeight / imageHeight;
  const scale = Math.min(scaleX, scaleY, 1); // Масштабируем так, чтобы изображение полностью поместилось, но не увеличивалось сверх 100% если оно меньше холста
  
  const scaledWidth = imageWidth * scale;
  const scaledHeight = imageHeight * scale;
  
  const offsetX = (canvasWidth - scaledWidth) / 2;
  const offsetY = (canvasHeight - scaledHeight) / 2;
  
  return { scale, offsetX, offsetY };
}

// Функция для масштабирования от точки (например, курсора мыши)
export function scaleFromPoint(
  currentScale: number,
  newScale: number,
  currentOffsetX: number,
  currentOffsetY: number,
  pointX: number,
  pointY: number
): { offsetX: number, offsetY: number } {
  // Точка в координатах изображения
  const imagePointX = (pointX - currentOffsetX) / currentScale;
  const imagePointY = (pointY - currentOffsetY) / currentScale;
  
  // Новые смещения для сохранения позиции точки
  const newOffsetX = pointX - imagePointX * newScale;
  const newOffsetY = pointY - imagePointY * newScale;
  
  return { offsetX: newOffsetX, offsetY: newOffsetY };
}

// Проверка попадания точки в рамку
export function isPointInBox(
  x: number,
  y: number,
  box: { x: number; y: number; width: number; height: number }
): boolean {
  return x >= box.x && x <= box.x + box.width && y >= box.y && y <= box.y + box.height;
}

export function isPointOnBoxBorder(
  x: number,
  y: number,
  box: { x: number; y: number; width: number; height: number },
  tolerance: number
): boolean {
  const isNearLeft = Math.abs(x - box.x) <= tolerance && y >= box.y - tolerance && y <= box.y + box.height + tolerance;
  const isNearRight = Math.abs(x - (box.x + box.width)) <= tolerance && y >= box.y - tolerance && y <= box.y + box.height + tolerance;
  const isNearTop = Math.abs(y - box.y) <= tolerance && x >= box.x - tolerance && x <= box.x + box.width + tolerance;
  const isNearBottom = Math.abs(y - (box.y + box.height)) <= tolerance && x >= box.x - tolerance && x <= box.x + box.width + tolerance;

  return isNearLeft || isNearRight || isNearTop || isNearBottom;
}

// Определение маркера изменения размера
export function getResizeHandle(
  x: number,
  y: number,
  box: { x: number; y: number; width: number; height: number },
  scale: number
): ResizeHandle | null {
  const handleSize = SIZES.HANDLE_SIZE_HOVER / scale;
  const centerX = box.x + box.width / 2;
  const centerY = box.y + box.height / 2;

  // Углы
  if (Math.abs(x - box.x) <= handleSize && Math.abs(y - box.y) <= handleSize) return 'nw';
  if (Math.abs(x - (box.x + box.width)) <= handleSize && Math.abs(y - box.y) <= handleSize) return 'ne';
  if (Math.abs(x - (box.x + box.width)) <= handleSize && Math.abs(y - (box.y + box.height)) <= handleSize) return 'se';
  if (Math.abs(x - box.x) <= handleSize && Math.abs(y - (box.y + box.height)) <= handleSize) return 'sw';

  // Стороны
  if (Math.abs(x - centerX) <= handleSize && Math.abs(y - box.y) <= handleSize) return 'n';
  if (Math.abs(x - (box.x + box.width)) <= handleSize && Math.abs(y - centerY) <= handleSize) return 'e';
  if (Math.abs(x - centerX) <= handleSize && Math.abs(y - (box.y + box.height)) <= handleSize) return 's';
  if (Math.abs(x - box.x) <= handleSize && Math.abs(y - centerY) <= handleSize) return 'w';

  // Внутри box - перемещение
  if (isPointInBox(x, y, box)) return 'move';

  return null;
}

// Отрисовка маркеров изменения размера
export function drawResizeHandles(
  ctx: CanvasRenderingContext2D,
  box: { x: number; y: number; width: number; height: number },
  scale: number
) {
  const handleSize = SIZES.HANDLE_SIZE_VISUAL / scale;
  
  ctx.fillStyle = 'white';
  ctx.strokeStyle = 'black';
  ctx.lineWidth = 1 / scale;

  const handles = [
    { x: box.x - handleSize/2, y: box.y - handleSize/2 }, // nw
    { x: box.x + box.width/2 - handleSize/2, y: box.y - handleSize/2 }, // n
    { x: box.x + box.width - handleSize/2, y: box.y - handleSize/2 }, // ne
    { x: box.x + box.width - handleSize/2, y: box.y + box.height/2 - handleSize/2 }, // e
    { x: box.x + box.width - handleSize/2, y: box.y + box.height - handleSize/2 }, // se
    { x: box.x + box.width/2 - handleSize/2, y: box.y + box.height - handleSize/2 }, // s
    { x: box.x - handleSize/2, y: box.y + box.height - handleSize/2 }, // sw
    { x: box.x - handleSize/2, y: box.y + box.height/2 - handleSize/2 }, // w
  ];

  handles.forEach(handle => {
    ctx.fillRect(handle.x, handle.y, handleSize, handleSize);
    ctx.strokeRect(handle.x, handle.y, handleSize, handleSize);
  });
}

// Отрисовка ограничивающей рамки
export function drawBoundingBox(
  ctx: CanvasRenderingContext2D,
  box: BoundingBox,
  isSelected: boolean,
  scale: number,
  defectClasses: DefectClass[],
  jsonData?: ApiClassData[],
  calibrationLine?: CalibrationLine | null
) {
  let defectClass = defectClasses.find(c => c.id === box.classId);
  let strokeColor = '#808080'; // цвет по умолчанию
  let labelText = 'Неизвестно';

  // Приоритет: сначала проверяем наличие отформатированной записи дефекта
  if (box.formattedDefectString) {
    if (defectClass) {
      strokeColor = defectClass.color;
    }
    // Добавляем размеры к условной записи дефекта
    const sizeText = getSizeText(box, calibrationLine);
    labelText = `${box.formattedDefectString} - ${sizeText}`;
  } else if (defectClass) {
    // Стандартный класс дефектов
    strokeColor = defectClass.color;
    // Добавляем размеры к названию класса
    const sizeText = getSizeText(box, calibrationLine);
    labelText = `${defectClass.name} - ${sizeText}`;
  } else if (jsonData && box.classId >= 12) {
    // Класс от API - ищем в JSON данных
    const jsonEntry = jsonData.find((entry) => entry.apiID === box.classId);
    if (jsonEntry) {
      const [r, g, b] = jsonEntry.color;
      strokeColor = `rgb(${r}, ${g}, ${b})`;
      // Добавляем размеры к названию API класса
      const sizeText = getSizeText(box, calibrationLine);
      labelText = `${jsonEntry.russian_name || jsonEntry.name} - ${sizeText}`;
    }
  } else if (box.apiColor) {
    // Используем цвет от API если есть
    const [r, g, b] = box.apiColor;
    strokeColor = `rgb(${r}, ${g}, ${b})`;
    // Добавляем размеры к API классу
    const sizeText = getSizeText(box, calibrationLine);
    labelText = `${box.apiClassName || 'Неизвестно'} - ${sizeText}`;
  }

  // Рамка
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = (isSelected ? 4 : 2) / scale;
  ctx.setLineDash([]);
  ctx.strokeRect(box.x, box.y, box.width, box.height);

  // Подпись
  ctx.fillStyle = strokeColor;
  ctx.font = `${Math.max(16 / scale, 12)}px Arial`;
  
  // Добавляем уверенность для объектов от API
  if (box.confidence !== undefined && box.apiClassName) {
    const confidenceText = ` (${Math.round(box.confidence * 100)}%)`;
    labelText += confidenceText;
  }
  
  ctx.fillText(labelText, box.x, box.y - 5 / scale);

  // Хэндлы для выделенного объекта
  if (isSelected) {
    drawResizeHandles(ctx, box, scale);
  }
}

// Вспомогательная функция для получения текста размеров
function getSizeText(
  box: { width: number; height: number },
  calibrationLine?: CalibrationLine | null
): string {
  if (calibrationLine) {
    // Если есть калибровка, показываем в мм
    const pixelLength = Math.sqrt(
      (calibrationLine.x2 - calibrationLine.x1) ** 2 + 
      (calibrationLine.y2 - calibrationLine.y1) ** 2
    );
    const scale = calibrationLine.realLength / pixelLength;
    const widthMm = (box.width * scale).toFixed(1);
    const heightMm = (box.height * scale).toFixed(1);
    return `${widthMm}×${heightMm} мм`;
  } else {
    // Если нет калибровки, показываем в пикселях
    const widthPx = Math.round(box.width);
    const heightPx = Math.round(box.height);
    return `${widthPx}×${heightPx} px`;
  }
}