import { useCallback } from 'react';
import { ModalDialogService } from '../services/ModalDialogService';

export const useModalDialogs = (
  showModal: (type: string, title: string, message: string, buttons?: any[]) => void,
  closeModal: () => void
) => {
  const showInfoDialog = useCallback(
    (title: string, message: string) => {
      const dialog = ModalDialogService.createInfoDialog(title, message, closeModal);
      showModal(dialog.type, dialog.title, dialog.message, dialog.buttons);
    },
    [showModal, closeModal]
  );

  const showErrorDialog = useCallback(
    (title: string, message: string) => {
      const dialog = ModalDialogService.createErrorDialog(title, message, closeModal);
      showModal(dialog.type, dialog.title, dialog.message, dialog.buttons);
    },
    [showModal, closeModal]
  );

  const showConfirmDialog = useCallback(
    (
      title: string,
      message: string,
      onConfirm: () => void,
      onCancel: () => void,
      confirmText?: string,
      cancelText?: string
    ) => {
      const dialog = ModalDialogService.createConfirmDialog(
        title,
        message,
        onConfirm,
        onCancel,
        confirmText,
        cancelText
      );
      showModal(dialog.type, dialog.title, dialog.message, dialog.buttons);
    },
    [showModal, closeModal]
  );

  const showUnsavedChangesDialog = useCallback(
    (onSave: () => void, onDiscard: () => void, onCancel: () => void) => {
      const dialog = ModalDialogService.createUnsavedChangesDialog(onSave, onDiscard, onCancel);
      showModal(dialog.type, dialog.title, dialog.message, dialog.buttons);
    },
    [showModal]
  );

  const showCalibrationDialog = useCallback(
    (onConfirm: (value: string) => void, onCancel: () => void, defaultValue?: string) => {
      const dialog = ModalDialogService.createCalibrationDialog(
        onConfirm,
        onCancel,
        defaultValue
      );
      showModal(dialog.type, dialog.title, dialog.message, dialog.buttons);
    },
    [showModal]
  );

  const showHelpDialog = useCallback(() => {
    const dialog = ModalDialogService.createHelpDialog(closeModal);
    showModal(dialog.type, dialog.title, dialog.message, dialog.buttons);
  }, [showModal, closeModal]);

  const showFileErrorDialog = useCallback(
    (errorType: string) => {
      const dialog = ModalDialogService.createFileErrorDialog(errorType, closeModal);
      showModal(dialog.type, dialog.title, dialog.message, dialog.buttons);
    },
    [showModal, closeModal]
  );

  const showAutoAnnotationSuccessDialog = useCallback(
    (objectCount: number) => {
      const dialog = ModalDialogService.createAutoAnnotationSuccessDialog(objectCount, closeModal);
      showModal(dialog.type, dialog.title, dialog.message, dialog.buttons);
    },
    [showModal, closeModal]
  );

  const showAutoAnnotationErrorDialog = useCallback(() => {
    const dialog = ModalDialogService.createAutoAnnotationErrorDialog(closeModal);
    showModal(dialog.type, dialog.title, dialog.message, dialog.buttons);
  }, [showModal, closeModal]);

  const showLoadImageRequiredDialog = useCallback(() => {
    const dialog = ModalDialogService.createLoadImageRequiredDialog(closeModal);
    showModal(dialog.type, dialog.title, dialog.message, dialog.buttons);
  }, [showModal, closeModal]);

  return {
    showInfoDialog,
    showErrorDialog,
    showConfirmDialog,
    showUnsavedChangesDialog,
    showCalibrationDialog,
    showHelpDialog,
    showFileErrorDialog,
    showAutoAnnotationSuccessDialog,
    showAutoAnnotationErrorDialog,
    showLoadImageRequiredDialog
  };
};
