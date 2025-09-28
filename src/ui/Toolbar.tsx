import React from 'react';
import { FolderOpen, Save, ZoomIn, ZoomOut, RotateCcw, Palette, Ruler, Trash2, Eye, EyeOff, Filter, BadgeHelp as Help, Maximize, Sparkles } from 'lucide-react';
import { useImage } from '../core/ImageProvider';
import { useAnnotations } from '../core/AnnotationManager';
import { Tooltip } from './Tooltip';

interface ToolbarProps {
  activeTool: string;
  onToolChange: (tool: string) => void;
  onOpenFile: () => void;
  onSaveMarkup: () => void;
  onInvertColors: () => void;
  onHelp: () => void;
  onAutoAnnotate: () => void;
  layerVisible: boolean;
  onToggleLayer: () => void;
  filterActive: boolean;
  onToggleFilter: () => void;
  calibrationSet: boolean;
  onEditCalibration: () => void;
  autoAnnotationPerformed: boolean;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  activeTool,
  onToolChange,
  onOpenFile,
  onSaveMarkup,
  onInvertColors,
  onHelp,
  onAutoAnnotate,
  layerVisible,
  onToggleLayer,
  filterActive,
  onToggleFilter,
  calibrationSet,
  onEditCalibration,
  autoAnnotationPerformed
}) => {
  const { imageState, zoomIn, zoomOut, zoomReset, fitToCanvas } = useImage();
  const { annotations } = useAnnotations();
  
  const hasImage = !!imageState.src;
  const hasAnnotations = annotations.boundingBoxes.length > 0;

  const ToolButton: React.FC<{
    icon: React.ReactNode;
    tooltip: string;
    onClick: () => void;
    active?: boolean;
    disabled?: boolean;
    highlighted?: boolean;
  }> = ({ icon, tooltip, onClick, active = false, disabled = false, highlighted = false }) => (
    <Tooltip text={disabled ? '' : tooltip}>
      <button
        className={`
          relative p-2 rounded transition-colors duration-200
          ${disabled 
            ? 'opacity-50 pointer-events-none text-gray-400' 
            : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
          }
          ${active ? 'bg-blue-100 text-blue-700' : ''}
          ${highlighted ? 'bg-green-100 text-green-700' : ''}
        `}
        onClick={onClick}
        disabled={disabled}
      >
        {icon}
      </button>
    </Tooltip>
  );

  return (
    <div className="flex items-center gap-1 bg-white border-b border-gray-200 px-4 py-2">
      {/* Группа файлов */}
      <ToolButton
        icon={<FolderOpen size={24} />}
        tooltip="Открыть файл (Ctrl+O)"
        onClick={onOpenFile}
      />
      <ToolButton
        icon={<Save size={24} />}
        tooltip="Сохранить разметку (Ctrl+S)"
        onClick={onSaveMarkup}
        disabled={!hasAnnotations}
      />

      <ToolButton
        icon={<Sparkles size={24} />}
        tooltip="Авто-разметка"
        onClick={onAutoAnnotate}
        disabled={!hasImage}
      />

      <div className="w-px h-6 bg-gray-300 mx-2" />

      {/* Группа масштаба */}
      <ToolButton
        icon={<ZoomIn size={24} />}
        tooltip="Увеличить масштаб (Ctrl++)"
        onClick={() => zoomIn()}
        disabled={!hasImage}
      />
      <ToolButton
        icon={<span className="text-sm font-medium">100%</span>}
        tooltip="Масштаб 1:1 (Ctrl+1)"
        onClick={() => zoomReset()}
        disabled={!hasImage}
      />
      <ToolButton
        icon={<Maximize size={24} />}
        tooltip="Подобрать масштаб (F)"
        onClick={() => {
          const canvas = document.querySelector('canvas');
          if (canvas) {
            fitToCanvas(canvas.clientWidth, canvas.clientHeight);
          }
        }}
        disabled={!hasImage}
      />
      <ToolButton
        icon={<ZoomOut size={24} />}
        tooltip="Уменьшить масштаб (Ctrl+-)"
        onClick={() => zoomOut()}
        disabled={!hasImage}
      />

      <div className="w-px h-6 bg-gray-300 mx-2" />

      {/* Группа инструментов */}
      <ToolButton
        icon={<RotateCcw size={24} />}
        tooltip="Инверсия цвета (I)"
        onClick={onInvertColors}
        disabled={!hasImage}
        active={imageState.inverted}
      />
      <ToolButton
        icon={<Palette size={24} />}
        tooltip="Оптическая плотность (D)"
        onClick={() => onToolChange('density')}
        disabled={!hasImage}
        active={activeTool === 'density'}
      />
      <ToolButton
        icon={<Ruler size={24} />}
        tooltip="Линейка (R)"
        onClick={() => onToolChange('ruler')}
        disabled={!hasImage}
        active={activeTool === 'ruler'}
      />
      <ToolButton
        icon={<span className="text-sm font-bold">К</span>}
        tooltip="Калибровка масштаба (C)"
        onClick={() => {
          if (calibrationSet) {
            onEditCalibration();
          } else {
            onToolChange('calibration');
          }
        }}
        disabled={!hasImage}
        active={activeTool === 'calibration'}
        highlighted={calibrationSet && activeTool !== 'calibration'}
      />

      <div className="w-px h-6 bg-gray-300 mx-2" />

      {/* Группа управления объектами */}
      <ToolButton
        icon={<Trash2 size={24} />}
        tooltip="Удалить объект (Delete)"
        onClick={() => {
          // Удаление выделенного объекта через событие клавиатуры
          const event = new KeyboardEvent('keydown', { key: 'Delete' });
          window.dispatchEvent(event);
        }}
        disabled={!hasImage}
      />
      <ToolButton
        icon={layerVisible ? <Eye size={24} /> : <EyeOff size={24} />}
        tooltip="Слой (L)"
        onClick={onToggleLayer}
        disabled={!hasImage}
      />

      {/* Группа фильтров */}
      <ToolButton
        icon={<Filter size={24} />}
        tooltip="Фильтр (Ctrl+L)"
        onClick={onToggleFilter}
        disabled={!hasImage}
        active={filterActive}
      />

      <div className="w-px h-6 bg-gray-300 mx-2" />

      {/* Справка */}
      <ToolButton
        icon={<Help size={24} />}
        tooltip="Справка (F1 / Ctrl+H)"
        onClick={onHelp}
      />
    </div>
  );
};