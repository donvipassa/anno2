// Утилиты для работы с файлами
import jsonData from './JSON_data.json';

export const downloadFile = (content: string, filename: string): void => {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.setAttribute('charset', 'utf-8');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
};

export const readFileAsText = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      // Проверяем на наличие некорректных символов кодировки
      if (result && /[РЎРўРЈРЄРЅРІРЇРЁРЉРЊРЋРЌРЌРЎРџ]/.test(result)) {
        // Если найдены некорректные символы, пытаемся прочитать как UTF-8
        const readerUtf8 = new FileReader();
        readerUtf8.onload = (e2) => resolve(e2.target?.result as string);
        readerUtf8.onerror = reject;
        readerUtf8.readAsText(file, 'UTF-8');
      } else {
        resolve(result);
      }
    };
    reader.onerror = reject;
    reader.readAsText(file, 'UTF-8');
  });
};

export const getMarkupFileName = (imageFileName: string): string => {
  return `${imageFileName}.txt`;
};

export const validateMarkupFileName = (markupFileName: string, imageFileName: string): boolean => {
  return markupFileName === getMarkupFileName(imageFileName);
};

export const parseYOLOData = (content: string): any[] => {
  const lines = content.trim().split('\n').filter(line => {
    const trimmed = line.trim();
    // Исключаем строки с некорректными символами кодировки
    if (/[РЎРўРЈРЄРЅРІРЇРЁРЉРЊРЋРЌРЌРЎРџ]/.test(trimmed)) {
      console.warn('Пропущена строка с некорректной кодировкой:', trimmed);
      return false;
    }
    return trimmed.length > 0;
  });
  
  return lines.map(line => {
    // Разделяем по пробелам и берем только числовые части (до комментария #)
    const commentIndex = line.indexOf('#');
    const dataLine = commentIndex >= 0 ? line.substring(0, commentIndex) : line;
    const parts = dataLine.split(' ').filter(part => part.trim());
    
    if (parts.length < 5) return null;
    
    try {
      return {
        classId: parseInt(parts[0]),
        centerX: parseFloat(parts[1]),
        centerY: parseFloat(parts[2]),
        width: parseFloat(parts[3]),
        height: parseFloat(parts[4])
      };
    } catch {
      return null;
    }
  }).filter(Boolean);
};

export const convertYOLOToPixels = (
  yoloData: any,
  imageWidth: number,
  imageHeight: number
): any => {
  const bbox = {
    classId: yoloData.classId,
    x: (yoloData.centerX - yoloData.width / 2) * imageWidth,
    y: (yoloData.centerY - yoloData.height / 2) * imageHeight,
    width: yoloData.width * imageWidth,
    height: yoloData.height * imageHeight
  };
  
  // Если это класс от API (ID >= 12), добавляем информацию из JSON
  if (yoloData.classId >= 12) {
    const jsonEntry = jsonData.find((entry: any) => entry.apiID === yoloData.classId);
    if (jsonEntry) {
      bbox.apiClassName = jsonEntry.name;
      bbox.apiColor = jsonEntry.color;
      bbox.apiId = jsonEntry.apiID;
    }
  }
  
  return bbox;
};