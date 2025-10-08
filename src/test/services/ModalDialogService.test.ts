import { describe, it, expect } from 'vitest';
import { ModalDialogService } from '../../services/ModalDialogService';
import type { ModalState } from '../../types';

describe('ModalDialogService', () => {
  describe('createInfoDialog', () => {
    it('should create info dialog with correct structure', () => {
      const dialog = ModalDialogService.createInfoDialog(
        'Test Title',
        'Test Message',
        () => {}
      );

      expect(dialog.type).toBe('info');
      expect(dialog.title).toBe('Test Title');
      expect(dialog.message).toBe('Test Message');
      expect(dialog.buttons).toHaveLength(1);
      expect(dialog.buttons![0].text).toBe('Ок');
    });

    it('should execute onClose callback when button is clicked', () => {
      let called = false;
      const onClose = () => { called = true; };

      const dialog = ModalDialogService.createInfoDialog(
        'Test Title',
        'Test Message',
        onClose
      );

      dialog.buttons![0].action();
      expect(called).toBe(true);
    });
  });

  describe('createErrorDialog', () => {
    it('should create error dialog with correct structure', () => {
      const dialog = ModalDialogService.createErrorDialog(
        'Error Title',
        'Error Message',
        () => {}
      );

      expect(dialog.type).toBe('error');
      expect(dialog.title).toBe('Error Title');
      expect(dialog.message).toBe('Error Message');
      expect(dialog.buttons).toHaveLength(1);
      expect(dialog.buttons![0].text).toBe('Ок');
    });

    it('should execute onClose callback when button is clicked', () => {
      let called = false;
      const onClose = () => { called = true; };

      const dialog = ModalDialogService.createErrorDialog(
        'Error Title',
        'Error Message',
        onClose
      );

      dialog.buttons![0].action();
      expect(called).toBe(true);
    });
  });

  describe('createConfirmDialog', () => {
    it('should create confirm dialog with correct structure', () => {
      const onConfirm = () => {};
      const onCancel = () => {};

      const dialog = ModalDialogService.createConfirmDialog(
        'Confirm Title',
        'Confirm Message',
        onConfirm,
        onCancel
      );

      expect(dialog.type).toBe('confirm');
      expect(dialog.title).toBe('Confirm Title');
      expect(dialog.message).toBe('Confirm Message');
      expect(dialog.buttons).toHaveLength(2);
    });

    it('should have correct button order and properties', () => {
      const onConfirm = () => {};
      const onCancel = () => {};

      const dialog = ModalDialogService.createConfirmDialog(
        'Confirm Title',
        'Confirm Message',
        onConfirm,
        onCancel
      );

      expect(dialog.buttons![0].text).toBe('Да');
      expect(dialog.buttons![0].primary).toBe(true);

      expect(dialog.buttons![1].text).toBe('Нет');
      expect(dialog.buttons![1].primary).toBeUndefined();
    });

    it('should execute onConfirm callback when Yes is clicked', () => {
      let confirmed = false;
      const onConfirm = () => { confirmed = true; };
      const onCancel = () => {};

      const dialog = ModalDialogService.createConfirmDialog(
        'Confirm Title',
        'Confirm Message',
        onConfirm,
        onCancel
      );

      dialog.buttons![0].action();
      expect(confirmed).toBe(true);
    });

    it('should execute onCancel callback when No is clicked', () => {
      let cancelled = false;
      const onConfirm = () => {};
      const onCancel = () => { cancelled = true; };

      const dialog = ModalDialogService.createConfirmDialog(
        'Confirm Title',
        'Confirm Message',
        onConfirm,
        onCancel
      );

      dialog.buttons![1].action();
      expect(cancelled).toBe(true);
    });
  });

  describe('createCalibrationDialog', () => {
    it('should create calibration dialog', () => {
      const onConfirm = vi.fn();
      const onCancel = () => {};

      const dialog = ModalDialogService.createCalibrationDialog(
        onConfirm,
        onCancel,
        '100'
      );

      expect(dialog.type).toBe('calibration');
      expect(dialog.title).toBe('Калибровка масштаба');
      expect(dialog.message).toBe('Укажите реальный размер эталона для установки масштаба (мм):');
    });

    it('should have correct button structure', () => {
      const onConfirm = vi.fn();
      const onCancel = () => {};

      const dialog = ModalDialogService.createCalibrationDialog(
        onConfirm,
        onCancel,
        '100'
      );

      expect(dialog.buttons).toHaveLength(2);
      expect(dialog.buttons![0].text).toBe('Отмена');
      expect(dialog.buttons![1].text).toBe('Применить');
      expect(dialog.buttons![1].primary).toBe(true);
    });

    it('should execute onConfirm with value', () => {
      const onConfirm = vi.fn();
      const onCancel = () => {};

      const dialog = ModalDialogService.createCalibrationDialog(
        onConfirm,
        onCancel,
        '100'
      );

      dialog.buttons![1].action();
      expect(onConfirm).toHaveBeenCalledWith('100');
    });

    it('should execute onCancel callback', () => {
      let cancelled = false;
      const onConfirm = vi.fn();
      const onCancel = () => { cancelled = true; };

      const dialog = ModalDialogService.createCalibrationDialog(
        onConfirm,
        onCancel,
        '100'
      );

      dialog.buttons![0].action();
      expect(cancelled).toBe(true);
    });
  });

  describe('createHelpDialog', () => {
    it('should create help dialog with correct structure', () => {
      const dialog = ModalDialogService.createHelpDialog(() => {});

      expect(dialog.type).toBe('help');
      expect(dialog.title).toBe('О программе');
      expect(dialog.message).toContain('Автор и разработчик');
      expect(dialog.buttons).toHaveLength(1);
      expect(dialog.buttons![0].text).toBe('Закрыть');
    });

    it('should execute onClose callback', () => {
      let closed = false;
      const onClose = () => { closed = true; };

      const dialog = ModalDialogService.createHelpDialog(onClose);

      dialog.buttons![0].action();
      expect(closed).toBe(true);
    });
  });

  describe('createUnsavedChangesDialog', () => {
    it('should create unsaved changes dialog', () => {
      const onSave = () => {};
      const onDiscard = () => {};
      const onCancel = () => {};

      const dialog = ModalDialogService.createUnsavedChangesDialog(onSave, onDiscard, onCancel);

      expect(dialog.type).toBe('confirm');
      expect(dialog.title).toBe('Несохраненные изменения');
      expect(dialog.buttons).toHaveLength(3);
    });

    it('should execute callbacks correctly', () => {
      let saved = false;
      let discarded = false;
      let cancelled = false;
      const onSave = () => { saved = true; };
      const onDiscard = () => { discarded = true; };
      const onCancel = () => { cancelled = true; };

      const dialog = ModalDialogService.createUnsavedChangesDialog(onSave, onDiscard, onCancel);

      dialog.buttons![0].action();
      expect(saved).toBe(true);

      dialog.buttons![1].action();
      expect(discarded).toBe(true);

      dialog.buttons![2].action();
      expect(cancelled).toBe(true);
    });
  });
});
