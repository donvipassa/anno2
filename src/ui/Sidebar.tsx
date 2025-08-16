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
    </div>
  );
};