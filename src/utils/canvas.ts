// Вспомогательные функции для масштабирования и позиционирования

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

// Константы для работы с bbox
export const HANDLE_SIZE_HOVER = 8;
export const HANDLE_SIZE_VISUAL = 6;

// Проверка попадания точки в рамку
export function isPointInBox(x: number, y: number, box: any): boolean {
  return x >= box.x && x <= box.x + box.width && y >= box.y && y <= box.y + box.height;
}

// Определение маркера изменения размера
export function getResizeHandle(
  x: number,
  y: number,
  box: any,
  scale: number
): 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'move' | null {
  const handleSize = HANDLE_SIZE_HOVER / scale;
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
export function drawResizeHandles(ctx: CanvasRenderingContext2D, box: any, scale: number) {
  const handleSize = HANDLE_SIZE_VISUAL / scale;
  
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
  box: any,
  isSelected: boolean,
  scale: number,
  defectClasses: any[]
) {
  const defectClass = defectClasses.find(c => c.id === box.classId);
  if (!defectClass) return;

  // Рамка
  ctx.strokeStyle = defectClass.color;
  ctx.lineWidth = (isSelected ? 4 : 2) / scale;
  ctx.setLineDash([]);
  ctx.strokeRect(box.x, box.y, box.width, box.height);

  // Подпись
  ctx.fillStyle = defectClass.color;
  ctx.font = `${Math.max(16 / scale, 12)}px Arial`;
  
  // Формируем текст подписи
  let labelText = defectClass.name;
  
  // Если есть оригинальное название класса от API, используем его
  if (box.apiClassName && box.apiClassName.toLowerCase() !== defectClass.name.toLowerCase()) {
    labelText = box.apiClassName;
  }
  
  // Добавляем уверенность, если она есть
  if (box.confidence !== undefined) {
    labelText += ` (${Math.round(box.confidence * 100)}%)`;
  }
  
  ctx.fillText(labelText, box.x, box.y - 5 / scale);

  // Хэндлы для выделенного объекта
  if (isSelected) {
    drawResizeHandles(ctx, box, scale);
  }
}