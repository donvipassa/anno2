/**
 * Конфигурация приложения
 */

export const APP_CONFIG = {
  // Ограничения файлов
  MAX_FILE_SIZE: 20 * 1024 * 1024, // 20 MB
  SUPPORTED_FORMATS: ['image/jpeg', 'image/png', 'image/tiff', 'image/bmp'],
  
  // API настройки
  API_URL: import.meta.env.VITE_API_URL || 'https://visio.weldmarker.ru/detect',
  
  // Настройки по умолчанию
  DEFAULT_CALIBRATION_VALUE: 50,
  MIN_BBOX_SIZE: 10,
  MIN_LINE_LENGTH: 5,
  MIN_CALIBRATION_LENGTH: 10,
} as const;

export const UI_CONFIG = {
  // Размеры элементов управления
  HANDLE_SIZE_HOVER: 8,
  HANDLE_SIZE_VISUAL: 6,
  
  // Допуски для взаимодействия
  RULER_TOLERANCE: 15,
  DENSITY_POINT_TOLERANCE: 25,
  
  // Масштабирование
  ZOOM_FACTOR: 1.2,
  MIN_SCALE: 0.1,
  MAX_SCALE: 10,
} as const;

export const HOTKEYS = {
  OPEN_FILE: 'Ctrl+O',
  SAVE_MARKUP: 'Ctrl+S',
  ZOOM_IN: 'Ctrl++',
  ZOOM_OUT: 'Ctrl+-',
  ZOOM_RESET: 'Ctrl+1',
  FIT_TO_CANVAS: 'F',
  INVERT_COLORS: 'I',
  DENSITY_TOOL: 'D',
  RULER_TOOL: 'R',
  CALIBRATION_TOOL: 'C',
  TOGGLE_LAYER: 'L',
  TOGGLE_FILTER: 'Ctrl+L',
  HELP: 'F1',
  DELETE: 'Delete',
  ESCAPE: 'Escape',
} as const;

export const ERROR_MESSAGES = {
  FILE_TOO_LARGE: 'Файл слишком большой. Максимум — 20 МБ',
  INVALID_FORMAT: 'Недопустимый формат. Поддерживаются форматы: JPG, PNG, TIFF, BMP',
  LOAD_ERROR: 'Не удалось загрузить изображение',
  READ_ERROR: 'Ошибка чтения файла',
  API_ERROR: 'Ошибка при обращении к серверу',
  MARKUP_MISMATCH: 'Файл разметки не соответствует файлу изображения',
  MARKUP_CORRUPTED: 'Файл разметки поврежден или имеет неверный формат',
  NO_IMAGE: 'Сначала загрузите изображение',
  CALIBRATION_ERROR: 'Ошибка при установке калибровки',
} as const;