import { useEffect, useCallback, RefObject } from 'react';

export interface KeyboardShortcutsHandlers {
  onOpenFile: () => void;
  onSaveMarkup: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  onFitToCanvas: () => void;
  onToggleInversion: () => void;
  onToggleLayer: () => void;
  onToggleFilter: () => void;
  onHelp: () => void;
  onDeleteSelected: () => void;
  onSelectTool: (tool: string) => void;
  onResetTools: () => void;
}

export const useKeyboardShortcuts = (
  handlers: KeyboardShortcutsHandlers,
  canvasRef?: RefObject<HTMLCanvasElement>
) => {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return;
      }

      const key = e.key.toLowerCase();
      const ctrl = e.ctrlKey;

      if (ctrl && key === 'o') {
        e.preventDefault();
        handlers.onOpenFile();
      } else if (ctrl && key === 's') {
        e.preventDefault();
        handlers.onSaveMarkup();
      } else if (ctrl && (key === '+' || key === '=')) {
        e.preventDefault();
        handlers.onZoomIn();
      } else if (ctrl && key === '-') {
        e.preventDefault();
        handlers.onZoomOut();
      } else if (ctrl && key === '1') {
        e.preventDefault();
        handlers.onZoomReset();
      } else if (key === 'f') {
        e.preventDefault();
        handlers.onFitToCanvas();
      } else if (key === 'i') {
        e.preventDefault();
        handlers.onToggleInversion();
      } else if (key === 'd') {
        e.preventDefault();
        handlers.onSelectTool('density');
      } else if (key === 'r') {
        e.preventDefault();
        handlers.onSelectTool('ruler');
      } else if (key === 'c') {
        e.preventDefault();
        handlers.onSelectTool('calibration');
      } else if (key === 'l') {
        e.preventDefault();
        handlers.onToggleLayer();
      } else if (ctrl && key === 'l') {
        e.preventDefault();
        handlers.onToggleFilter();
      } else if (key === 'f1' || (ctrl && key === 'h')) {
        e.preventDefault();
        handlers.onHelp();
      } else if (key === 'escape') {
        e.preventDefault();
        handlers.onResetTools();
      } else if (key === 'delete') {
        e.preventDefault();
        handlers.onDeleteSelected();
      }
    },
    [handlers, canvasRef]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
};
