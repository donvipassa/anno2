import { MODAL_TYPES } from '../constants/modalTypes';

export interface ModalButton {
  text: string;
  action: () => void;
  primary?: boolean;
}

export interface ModalDialogConfig {
  type: string;
  title: string;
  message: string;
  buttons: ModalButton[];
}

export class ModalDialogService {
  static createInfoDialog(
    title: string,
    message: string,
    onClose: () => void
  ): ModalDialogConfig {
    return {
      type: MODAL_TYPES.INFO,
      title,
      message,
      buttons: [{ text: 'Ок', action: onClose }]
    };
  }

  static createErrorDialog(
    title: string,
    message: string,
    onClose: () => void
  ): ModalDialogConfig {
    return {
      type: MODAL_TYPES.ERROR,
      title,
      message,
      buttons: [{ text: 'Ок', action: onClose }]
    };
  }

  static createConfirmDialog(
    title: string,
    message: string,
    onConfirm: () => void,
    onCancel: () => void,
    confirmText: string = 'Да',
    cancelText: string = 'Нет'
  ): ModalDialogConfig {
    return {
      type: MODAL_TYPES.CONFIRM,
      title,
      message,
      buttons: [
        { text: confirmText, action: onConfirm, primary: true },
        { text: cancelText, action: onCancel }
      ]
    };
  }

  static createUnsavedChangesDialog(
    onSave: () => void,
    onDiscard: () => void,
    onCancel: () => void
  ): ModalDialogConfig {
    return {
      type: MODAL_TYPES.CONFIRM,
      title: 'Несохраненные изменения',
      message: 'У вас есть несохраненные изменения в разметке. Что вы хотите сделать?',
      buttons: [
        { text: 'Сохранить', action: onSave, primary: true },
        { text: 'Не сохранять', action: onDiscard },
        { text: 'Отмена', action: onCancel }
      ]
    };
  }

  static createCalibrationDialog(
    onConfirm: (value: string) => void,
    onCancel: () => void,
    defaultValue?: string
  ): ModalDialogConfig {
    return {
      type: MODAL_TYPES.CALIBRATION,
      title: 'Калибровка масштаба',
      message: 'Укажите реальный размер эталона для установки масштаба (мм):',
      buttons: [
        { text: 'Отмена', action: onCancel },
        {
          text: 'Применить',
          action: () => {
            onConfirm(defaultValue || '50');
          },
          primary: true
        }
      ]
    };
  }

  static createHelpDialog(onClose: () => void): ModalDialogConfig {
    return {
      type: MODAL_TYPES.HELP,
      title: 'О программе',
      message: 'Автор и разработчик Алексей Сотников\nТехнопарк "Университетские технологии"',
      buttons: [{ text: 'Закрыть', action: onClose }]
    };
  }

  static createFileErrorDialog(
    errorType: string,
    onClose: () => void
  ): ModalDialogConfig {
    const errorMessages: Record<string, string> = {
      FILE_TOO_LARGE: 'Файл слишком большой. Максимальный размер: 20 МБ',
      INVALID_FORMAT: 'Неподдерживаемый формат файла. Используйте JPG, PNG, TIFF или BMP',
      LOAD_ERROR: 'Не удалось загрузить изображение',
      READ_ERROR: 'Ошибка чтения файла'
    };

    return this.createErrorDialog(
      'Ошибка загрузки файла',
      errorMessages[errorType] || 'Произошла неизвестная ошибка',
      onClose
    );
  }

  static createAutoAnnotationSuccessDialog(
    objectCount: number,
    onClose: () => void
  ): ModalDialogConfig {
    return this.createInfoDialog(
      'Успех',
      `Обнаружено объектов: ${objectCount}`,
      onClose
    );
  }

  static createAutoAnnotationErrorDialog(onClose: () => void): ModalDialogConfig {
    return this.createErrorDialog(
      'Ошибка',
      'Не удалось выполнить автоматическую аннотацию',
      onClose
    );
  }

  static createLoadImageRequiredDialog(onClose: () => void): ModalDialogConfig {
    return this.createErrorDialog(
      'Ошибка',
      'Сначала загрузите изображение',
      onClose
    );
  }
}
