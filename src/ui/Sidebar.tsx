import React from 'react';
import { DEFECT_CLASSES } from '../types';
import { useAnnotations } from '../core/AnnotationManager';
import { Tooltip } from './Tooltip';

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
  const { annotations } = useAnnotations();

  const getClassCount = (classId: number): number => {
    return annotations.boundingBoxes.filter(bbox => bbox.classId === classId).length;
  };

  return (
    <div className="w-64 bg-white border-r border-gray-200 p-4 overflow-y-auto">
      <h2 className="text-sm font-semibold text-gray-700 mb-4">Классы дефектов</h2>
      
      <div className="space-y-2">
        {DEFECT_CLASSES.map((defectClass) => {
          const count = getClassCount(defectClass.id);
          const isActive = activeClassId === defectClass.id;
          
          return (
            <Tooltip
              key={defectClass.id}
              text={disabled ? '' : `${defectClass.name} (${defectClass.hotkey})`}
            >
              <button
                className={`
                  w-full h-12 px-3 py-2 rounded border-2 transition-all duration-200 text-left
                  flex items-center justify-between
                  ${disabled 
                    ? 'opacity-50 pointer-events-none bg-gray-50 border-gray-200 text-gray-400'
                    : `
                      bg-white hover:bg-gray-50 border-gray-200 text-black
                      hover:border-opacity-80
                    `
                  }
                  ${isActive && !disabled ? 'border-4 ring-2 ring-gray-400 ring-opacity-50' : ''}
                `}
                style={{
                  borderColor: disabled ? undefined : defectClass.color,
                  borderWidth: isActive && !disabled ? '4px' : '2px'
                }}
                onClick={() => !disabled && onClassSelect(defectClass.id)}
                disabled={disabled}
              >
                <span className="text-sm font-medium text-black">
                  {defectClass.name}
                </span>
                <span className="text-sm font-medium text-black">
                  ({count})
                </span>
              </button>
            </Tooltip>
          );
        })}
      </div>
      
      {/* Секция API классов */}
      {getApiClassesCount() > 0 && (
        <>
          <div className="mt-6 pt-4 border-t border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">
              Обнаруженные объекты ({getApiClassesCount()})
            </h3>
            
            <div className="space-y-2">
              {annotations.boundingBoxes
                .filter(bbox => bbox.isApiClass)
                .map((bbox) => (
                  <div
                    key={bbox.id}
                    className={`
                      w-full p-3 rounded border-2 transition-all duration-200
                      ${disabled 
                        ? 'opacity-50 pointer-events-none bg-gray-50 border-gray-200'
                        : 'bg-white hover:bg-gray-50 border-gray-200'
                      }
                      ${annotations.selectedObjectId === bbox.id && !disabled ? 'border-4 ring-2 ring-gray-400 ring-opacity-50' : ''}
                    `}
                    style={{
                      borderColor: disabled ? undefined : bbox.apiColor,
                      borderWidth: annotations.selectedObjectId === bbox.id && !disabled ? '4px' : '2px'
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-black">
                        {bbox.apiClassName}
                      </span>
                      <span className="text-sm text-gray-600">
                        {bbox.confidence ? `${Math.round(bbox.confidence * 100)}%` : ''}
                      </span>
                    </div>
                    
                    <select
                      className="w-full text-xs border border-gray-300 rounded px-2 py-1"
                      onChange={(e) => {
                        const newClassId = parseInt(e.target.value);
                        if (newClassId >= 0) {
                          handleApiClassConvert(bbox.id, newClassId);
                        }
                      }}
                      defaultValue="-1"
                      disabled={disabled}
                    >
                      <option value="-1">Выберите класс дефекта...</option>
                      {DEFECT_CLASSES.map((defectClass) => (
                        <option key={defectClass.id} value={defectClass.id}>
                          {defectClass.name}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};