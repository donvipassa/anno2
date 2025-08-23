import React from 'react';
import { DEFECT_CLASSES } from '../types';
import { useAnnotations } from '../core/AnnotationManager';
import { useImage } from '../core/ImageProvider';
import { Tooltip } from './Tooltip';
import jsonData from '../data/defect-classes.json';

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
          const selectedBbox = annotations.selectedObjectId && annotations.selectedObjectType === 'bbox' 
            ? annotations.boundingBoxes.find(bbox => bbox.id === annotations.selectedObjectId)
            : null;
          
          // Унифицированное выделение: активный класс для рисования ИЛИ класс выделенной рамки
          const isUnifiedSelected = activeClassId === defectClass.id || selectedBbox?.classId === defectClass.id;
          
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
                      ${isUnifiedSelected ? 'bg-blue-50' : 'bg-white hover:bg-gray-50'} border-gray-200 text-black
                      hover:border-opacity-80
                    `
                  }
                  ${isUnifiedSelected && !disabled ? 'border-4 ring-2 ring-blue-400 ring-opacity-50' : ''}
                `}
                style={{
                  borderColor: disabled ? undefined : getClassColor(defectClass.id),
                  borderWidth: isUnifiedSelected && !disabled ? '4px' : '2px'
                }}
                onClick={() => !disabled && handleClassClick(defectClass.id)}
                disabled={disabled}
              >
                <span className="text-sm font-medium text-black">
                  {defectClass.name}
                </span>
                <span className={`text-sm font-medium ${
                  isUnifiedSelected ? 'text-blue-700' : 'text-black'
                }`}>
                  ({count})
                </span>
              </button>
            </Tooltip>
          );
        })}
      </div>
      
      {/* Показываем информацию о классах от API */}
      {annotations.boundingBoxes.some(bbox => bbox.classId >= 12) && (
        <div className="mt-6 pt-4 border-t border-gray-200">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Обнаружено объектов:</h3>
          <div className="space-y-1 text-xs text-gray-600">
            {Array.from(new Map(
              annotations.boundingBoxes
                .filter(bbox => bbox.classId >= 12)
                .map(bbox => {
                  const jsonEntry = jsonData.find((entry: any) => entry.apiID === bbox.classId);
                  return [bbox.classId, {
                    name: jsonEntry ? jsonEntry.russian_name : 'Неизвестно',
                    color: jsonEntry ? jsonEntry.color : [128, 128, 128],
                    count: annotations.boundingBoxes.filter(b => b.classId === bbox.classId).length
                  }];
                })
            ).values()).map((classInfo: any, index) => (
              <div key={index} className="flex items-center space-x-2">
                <div 
                  className="w-3 h-3 border rounded"
                  style={{
                    backgroundColor: `rgb(${classInfo.color[0]}, ${classInfo.color[1]}, ${classInfo.color[2]})`
                  }}
                />
                <span>{classInfo.name} ({classInfo.count})</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};