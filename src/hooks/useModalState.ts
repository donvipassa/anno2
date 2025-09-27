import { useState, useCallback } from 'react';

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

export const useModalState = () => {
  const [modalState, setModalState] = useState<ModalState>({
    type: null,
    title: '',
    message: ''
  });

  const closeModal = useCallback(() => {
    setModalState({ type: null, title: '', message: '' });
  }, []);

  const showModal = useCallback((
    type: string, 
    title: string, 
    message: string, 
    buttons?: Array<{ text: string; action: () => void; primary?: boolean }>, 
    input?: any
  ) => {
    setModalState({ type, title, message, buttons, input });
  }, []);

  return {
    modalState,
    closeModal,
    showModal
  };
};