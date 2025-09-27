import { APP_CONFIG } from '../config';

/**
 * Результат валидации файла
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Валидация файла изображения
 * @param file - Файл для валидации
 * @returns Результат валидации
 */
export const validateImageFile = (file: File): ValidationResult => {
  if (file.size > APP_CONFIG.MAX_FILE_SIZE) {
    return { valid: false, error: 'FILE_TOO_LARGE' };
  }

  if (!APP_CONFIG.SUPPORTED_FORMATS.includes(file.type)) {
    return { valid: false, error: 'INVALID_FORMAT' };
  }

  return { valid: true };
};

/**
 * Валидация имени файла разметки
 * @param markupFileName - Имя файла разметки
 * @param imageFileName - Имя файла изображения
 * @returns true если имена соответствуют
 */
export const validateMarkupFileName = (markupFileName: string, imageFileName: string): boolean => {
  // Более гибкая проверка - убираем расширение из имени файла разметки и сравниваем
  const markupBaseName = markupFileName.replace(/\.txt$/i, '');
  const imageBaseName = imageFileName;
  
  return markupBaseName === imageBaseName || markupFileName === `${imageFileName}.txt`;
};

/**
 * Валидация данных YOLO
 * @param content - Содержимое файла
 * @returns Массив валидных записей YOLO
 */
export const validateYOLOData = (content: string): any[] => {
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
    
    // Извлекаем условную запись дефекта из комментария
    let formattedDefectString = null;
    if (commentIndex >= 0) {
      const comment = line.substring(commentIndex + 1).trim();
      // Ищем условную запись после " - "
      const dashIndex = comment.indexOf(' - ');
      if (dashIndex >= 0) {
        formattedDefectString = comment.substring(dashIndex + 3).trim();
      }
    }
    
    if (parts.length < 5) return null;
    
    try {
      const result = {
        classId: parseInt(parts[0]),
        centerX: parseFloat(parts[1]),
        centerY: parseFloat(parts[2]),
        width: parseFloat(parts[3]),
        height: parseFloat(parts[4])
      };
      
      // Добавляем условную запись дефекта если найдена
      if (formattedDefectString) {
        result.formattedDefectString = formattedDefectString;
      }
      
      return result;
    } catch {
      return null;
    }
  }).filter(Boolean);
};