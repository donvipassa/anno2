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