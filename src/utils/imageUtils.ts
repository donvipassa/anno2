// Утилиты для работы с изображениями

export const calculateDensity = (imageData: ImageData, x: number, y: number): number => {
  const index = (y * imageData.width + x) * 4;
  const r = imageData.data[index];
  const g = imageData.data[index + 1];
  const b = imageData.data[index + 2];
  
  // Преобразование в оттенки серого
  const gray = 0.299 * r + 0.587 * g + 0.114 * b;
  
  // Оптическая плотность (0 = белый, 1 = черный)
  return 1 - (gray / 255);
};

export const saveImageAsFile = (
  imageElement: HTMLImageElement,
  imageWidth: number,
  imageHeight: number,
  annotations: any,
  filename: string
): void => {
  // Создаем временный canvas с оригинальным разрешением
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  canvas.width = imageWidth;
  canvas.height = imageHeight;

  // Рисуем оригинальное изображение
  ctx.drawImage(imageElement, 0, 0, imageWidth, imageHeight);

  // Рисуем все аннотации в оригинальном масштабе
  const DEFECT_CLASSES = [
    { id: 0, name: 'Трещины', color: '#FF0000' },
    { id: 1, name: 'Непровары', color: '#00FF00' },
    { id: 2, name: 'Поры', color: '#0000FF' },
    { id: 3, name: 'Шлаковые включения', color: '#FFFF00' },
    { id: 4, name: 'Вольфрамовые включения', color: '#FF00FF' },
    { id: 5, name: 'Окисные включения', color: '#00FFFF' },
    { id: 6, name: 'Вогнутость корня шва', color: '#FFA500' },
    { id: 7, name: 'Выпуклость корня шва', color: '#800080' },
    { id: 8, name: 'Подрез', color: '#008000' },
    { id: 9, name: 'Смещение кромок', color: '#800000' },
    { id: 10, name: 'Другое', color: '#808080' }
  ];

  // Рисуем bounding boxes
  annotations.boundingBoxes?.forEach((bbox: any) => {
    const defectClass = DEFECT_CLASSES.find(c => c.id === bbox.classId);
    if (!defectClass) return;

    // Определяем цвет рамки
    let strokeColor = defectClass.color;
    if (bbox.classId === 10 && bbox.apiColor) {
      // Для класса "Другое" используем оригинальный цвет от API, если он есть
      const [r, g, b] = bbox.apiColor;
      strokeColor = `rgb(${r}, ${g}, ${b})`;
    }

    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 3;
    ctx.strokeRect(bbox.x, bbox.y, bbox.width, bbox.height);

    // Подпись
    ctx.fillStyle = strokeColor;
    ctx.font = '16px Arial';
    
    // Формируем текст подписи
    let labelText = defectClass.name;
    if (bbox.apiClassName && bbox.apiClassName.toLowerCase() !== defectClass.name.toLowerCase()) {
      labelText = bbox.apiClassName;
    }
    if (bbox.confidence !== undefined) {
      labelText += ` (${Math.round(bbox.confidence * 100)}%)`;
    }
    
    ctx.fillText(labelText, bbox.x, bbox.y - 5);
  });

  // Рисуем линейки
  annotations.rulers?.forEach((ruler: any) => {
    ctx.strokeStyle = '#FFFF00';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(ruler.x1, ruler.y1);
    ctx.lineTo(ruler.x2, ruler.y2);
    ctx.stroke();

    // Маркеры
    ctx.fillStyle = '#FFFF00';
    ctx.beginPath();
    ctx.arc(ruler.x1, ruler.y1, 4, 0, 2 * Math.PI);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(ruler.x2, ruler.y2, 4, 0, 2 * Math.PI);
    ctx.fill();
  });

  // Рисуем калибровочную линию
  if (annotations.calibrationLine) {
    const line = annotations.calibrationLine;
    ctx.strokeStyle = '#0000FF';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(line.x1, line.y1);
    ctx.lineTo(line.x2, line.y2);
    ctx.stroke();

    // Маркеры
    ctx.fillStyle = '#0000FF';
    ctx.beginPath();
    ctx.arc(line.x1, line.y1, 5, 0, 2 * Math.PI);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(line.x2, line.y2, 5, 0, 2 * Math.PI);
    ctx.fill();
  }

  // Рисуем точки плотности
  annotations.densityPoints?.forEach((point: any) => {
    ctx.strokeStyle = '#FF00FF';
    ctx.lineWidth = 3;

    // Крест
    ctx.beginPath();
    ctx.moveTo(point.x - 15, point.y);
    ctx.lineTo(point.x + 15, point.y);
    ctx.moveTo(point.x, point.y - 15);
    ctx.lineTo(point.x, point.y + 15);
    ctx.stroke();

    // Значение плотности
    ctx.fillStyle = '#FF00FF';
    ctx.font = '16px Arial';
    ctx.fillText(`${point.density.toFixed(2)}`, point.x + 20, point.y - 5);
  });

  // Сохраняем файл
  const link = document.createElement('a');
  link.download = filename;
  link.href = canvas.toDataURL('image/png');
  link.click();
};

export const loadImageFromFile = (file: File): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
};

export const validateImageFile = (file: File): { valid: boolean; error?: string } => {
  const maxSize = 20 * 1024 * 1024; // 20 MB
  const validTypes = ['image/jpeg', 'image/png', 'image/tiff', 'image/bmp'];

  if (file.size > maxSize) {
    return { valid: false, error: 'FILE_TOO_LARGE' };
  }

  if (!validTypes.includes(file.type)) {
    return { valid: false, error: 'INVALID_FORMAT' };
  }

  return { valid: true };
};