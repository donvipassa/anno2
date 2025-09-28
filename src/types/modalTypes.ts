/**
 * Типы для модальных окон и форм
 */
import { DefectRecord } from './defects';

/**
 * Состояние модального окна
 */
export interface ModalState {
  type: string | null;
  title: string;
  message: string;
  buttons?: Array<{
    text: string;
    action: () => void;
    primary?: boolean;
  }>;
  input?: {
    label: string;
    value: string;
    onChange: (value: string) => void;
  };
}

/**
 * Состояние формы дефекта
 */
export interface DefectFormState {
  isOpen: boolean;
  bboxId: string | null;
  defectClassId: number | null;
  initialRecord: DefectRecord | null;
}

/**
 * Состояние контекстного меню
 */
export interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
}