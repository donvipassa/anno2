import React from 'react';
import { Modal, ModalButtons, ModalButton } from '../ui';
import { MODAL_TYPES } from '../constants/modalTypes';

interface ModalContainerProps {
  isOpen: boolean;
  type: string | null;
  title: string;
  message: string;
  buttons?: Array<{
    text: string;
    action: () => void;
    primary?: boolean;
  }>;
  calibrationInputValue?: string;
  calibrationInputRef?: React.RefObject<HTMLInputElement>;
  onCalibrationInputChange?: (value: string) => void;
  onClose: () => void;
}

export const ModalContainer: React.FC<ModalContainerProps> = ({
  isOpen,
  type,
  title,
  message,
  buttons,
  calibrationInputValue,
  calibrationInputRef,
  onCalibrationInputChange,
  onClose
}) => {
  return (
    <Modal isOpen={isOpen} title={title} onClose={onClose}>
      {message && <p className="whitespace-pre-line mb-4">{message}</p>}

      {type === MODAL_TYPES.CALIBRATION && (
        <div className="mt-4">
          <input
            ref={calibrationInputRef}
            type="number"
            step="0.1"
            min="0.1"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={calibrationInputValue}
            onChange={(e) => onCalibrationInputChange?.(e.target.value)}
            placeholder="Введите размер в мм"
          />
        </div>
      )}

      <ModalButtons>
        {buttons?.map((button, index) => (
          <ModalButton key={index} onClick={button.action} primary={button.primary}>
            {button.text}
          </ModalButton>
        ))}
      </ModalButtons>
    </Modal>
  );
};
