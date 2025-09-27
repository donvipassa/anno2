import { useState, useCallback } from 'react';

export interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
}

export const useContextMenu = () => {
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0
  });

  const showContextMenu = useCallback((x: number, y: number) => {
    setContextMenu({ visible: true, x, y });
  }, []);

  const hideContextMenu = useCallback(() => {
    setContextMenu({ visible: false, x: 0, y: 0 });
  }, []);

  return {
    contextMenu,
    showContextMenu,
    hideContextMenu
  };
};