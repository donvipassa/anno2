/**
 * Константы для типов модальных окон
 */
export const MODAL_TYPES = {
  INFO: 'info',
  CONFIRM: 'confirm',
  ERROR: 'error',
  CALIBRATION: 'calibration',
  HELP: 'help'
} as const;

export type ModalType = typeof MODAL_TYPES[keyof typeof MODAL_TYPES];