import React from 'react';
import { DEFECT_CLASSES } from '../types';
import { useAnnotations } from '../core/AnnotationManager';
import { useImage } from '../core/ImageProvider';
import { Tooltip } from './Tooltip';
import jsonData from '../utils/JSON_data.json';

interface SidebarProps {
  activeClassId: number;
  onClassSelect: (classId: number) => void;
  disabled: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeClassId,
  onClassSelect,
  disabled
}) => {
  const { annotations, updateBoundingBox } = useAnnotations();
  const { imageState } = useImage();

  const getClassCount = (classId: number): number => {
    if (classId === 10) {
      // Для класса "Другое" считаем только объекты, которые действительно имеют classId = 10
      return annotations.boundingBoxes.filter(bbox => bbox.classId === 10).length;
    } else {
      // Для остальных классов считаем по classId
      return annotations.boundingBoxes.filter(bbox => bbox.classId === classId).length;
    }
  };

  const handleClassClick = (classId: number) => {
    // Проверяем, есть ли выделенный bbox
    const selectedBbox = annotations.selectedObjectId && annotations.selectedObjectType === 'bbox' 
      ? annotations.boundingBoxes.find(bbox => bbox.id === annotations.selectedObjectId)
      : null;

    if (selectedBbox) {
      // Если есть выделенный bbox, изменяем его класс
      updateBoundingBox(selectedBbox.id, { classId });
    } else {
      // Если нет выделенного bbox, активируем класс для рисования
      onClassSelect(classId);
    }
  };
  const getClassColor = (classId: number): string => {
    const defectClass = DEFECT_CLASSES.find(c => c.id === classId);
    if (!defectClass) return '#808080';
    
    // Для класса "Другое" показываем стандартный цвет в боковой панели
    return defectClass.color;
  };
  return (
    <div className="w-64 bg-white border-r border-gray-200 p-4 overflow-y-auto">
      <h2 className="text-sm font-semibold text-gray-700 mb-4">Классы дефектов</h2>
      
      <div className="space-y-2">
        {DEFECT_CLASSES.map((defectClass) => {
          const count = getClassCount(defectClass.id);
          const isActive = activeClassId === defectClass.id;
          const selectedBbox = annotations.selectedObjectId && annotations.selectedObjectType === 'bbox' 
            ? annotations.boundingBoxes.find(bbox => bbox.id === annotations.selectedObjectId)
            : null;
          const isSelectedObjectClass = selectedBbox?.classId === defectClass.id;
          
          return (
            <Tooltip
              key={defectClass.id}
              text={disabled ? '' : 
                (selectedBbox ? 
                  `Изменить класс на "${defectClass.name}" (${defectClass.hotkey})` : 
                  `${defectClass.name} (${defectClass.hotkey})`
                )
              }
            >
              <button
                className={`
                  w-full h-12 px-3 py-2 rounded border-2 transition-all duration-200 text-left
                  flex items-center justify-between
                  ${disabled 
                    ? 'opacity-50 pointer-events-none bg-gray-50 border-gray-200 text-gray-400'
                    : `
                      ${isActive ? 'bg-blue-50' : (isSelectedObjectClass ? 'bg-green-50' : 'bg-white hover:bg-gray-50')} border-gray-200 text-black
                      hover:border-opacity-80
                    `
                  }
                  ${isActive && !disabled ? 'border-4 ring-2 ring-blue-400 ring-opacity-50' : ''}
                `}
                style={{
                  borderColor: disabled ? undefined : getClassColor(defectClass.id),
                  borderWidth: isActive && !disabled ? '4px' : '2px'
                }}
                onClick={() => !disabled && handleClassClick(defectClass.id)}
                disabled={disabled}
              >
                <span className="text-sm font-medium text-black">
                  {defectClass.name}
                </span>
                <span className={`text-sm font-medium ${
                  isActive ? 'text-blue-700' : 
                  (isSelectedObjectClass ? 'text-green-700' : 'text-black')
                }`}>
                  ({count})
                </span>
              </button>
            </Tooltip>
          );
        })}
      </div>
      
      {/* Показываем информацию о неизвестных классах */}
      {annotations.boundingBoxes.some(bbox => bbox.apiClassName && !jsonData.find((entry: any) => entry.name.toLowerCase().trim() === bbox.apiClassName!.toLowerCase().trim())) && (
        <div className="mt-6 pt-4 border-t border-gray-200">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Обнаруженные классы:</h3>
          <div className="space-y-1 text-xs text-gray-600">
            {Array.from(new Set(
              annotations.boundingBoxes
                .filter(bbox => bbox.apiClassName && !jsonData.find((entry: any) => entry.name.toLowerCase().trim() === bbox.apiClassName!.toLowerCase().trim()))
                .map(bbox => bbox.apiClassName)
            )).map(className => (
              <div key={className} className="flex items-center space-x-2">
                <div 
                  className="w-3 h-3 border rounded"
                  style={{
                    backgroundColor: (() => {
                      const bbox = annotations.boundingBoxes.find(b => b.apiClassName === className && b.apiColor);
                      if (bbox?.apiColor) {
                        const [r, g, b] = bbox.apiColor;
                        return `rgb(${r}, ${g}, ${b})`;
                      }
                      return '#808080';
                    })()
                  }}
                />
                <span>{className}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Выберите объект и измените класс вручную
          </p>
        </div>
      )}
    </div>
  );
};