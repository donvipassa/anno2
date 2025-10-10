/**
 * Константы приложения
 */

// Константы для модальных окон
export const MODAL_TYPES = {
  INFO: 'info',
  CONFIRM: 'confirm',
  ERROR: 'error',
  CALIBRATION: 'calibration',
  HELP: 'help'
} as const;

// Константы для инструментов
export const TOOLS = {
  BBOX: 'bbox',
  RULER: 'ruler',
  CALIBRATION: 'calibration',
  DENSITY: 'density'
} as const;

// Константы для размеров
export const SIZES = {
  MIN_BBOX_SIZE: 10,
  MIN_LINE_LENGTH: 5,
  MARKER_TOLERANCE: 10,
  RULER_TOLERANCE: 15,
  DENSITY_TOLERANCE: 25,
  DENSITY_POINT_TOLERANCE: 50,
  BORDER_WIDTH: 4,
  HANDLE_SIZE_HOVER: 8,
  HANDLE_SIZE_VISUAL: 6
} as const;

// Константы для калибровки
export const CALIBRATION = {
  DEFAULT_VALUE: 50,
  MIN_VALUE: 0.1,
  DEFAULT_COUNT: 1
} as const;