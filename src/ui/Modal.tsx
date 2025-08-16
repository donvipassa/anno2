import React, { useEffect } from 'react';

interface ModalProps {
  isOpen: boolean;
  title: string;
  children: React.ReactNode;
  onClose?: () => void;
  closeOnOutsideClick?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  title,
  children,
  onClose,
  closeOnOutsideClick = false
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (closeOnOutsideClick && e.target === e.currentTarget && onClose) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={handleOverlayClick}
    >
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        </div>
        
        <div className="px-6 py-4">
          {children}
        </div>
      </div>
    </div>
  );
};

interface ModalButtonsProps {
  children: React.ReactNode;
}

export const ModalButtons: React.FC<ModalButtonsProps> = ({ children }) => (
  <div className="flex justify-end space-x-3 mt-6">
    {children}
  </div>
);

interface ModalButtonProps {
  onClick: () => void;
  children: React.ReactNode;
  primary?: boolean;
  disabled?: boolean;
}

export const ModalButton: React.FC<ModalButtonProps> = ({
  onClick,
  children,
  primary = false,
  disabled = false
}) => (
  <button
    className={`px-4 py-2 rounded transition-colors ${
      primary
        ? 'bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-300'
        : 'bg-gray-200 hover:bg-gray-300 text-gray-900 disabled:bg-gray-100'
    } disabled:cursor-not-allowed`}
    onClick={onClick}
    disabled={disabled}
  >
    {children}
  </button>
);