import React, { useMemo, useCallback } from 'react';
import { DEFECT_CLASSES, BoundingBox } from '../types';
import { Tooltip } from './Tooltip';

interface SidebarProps {
  activeClassId: number;
  onClassSelect: (classId: number) => void;
  disabled: boolean;
  boundingBoxes: BoundingBox[];
  selectedObjectId: string | null;
  selectedObjectType: string | null;
  onUpdateBoundingBox: (id: string, updates: Partial<BoundingBox>) => void;
}

export const Sidebar = React.memo<SidebarProps>(function Sidebar({
  activeClassId,
  onClassSelect,
  disabled,
  boundingBoxes,
  selectedObjectId,
  selectedObjectType,
  onUpdateBoundingBox
}) {

  const classCounts = useMemo(() => {
    const counts: Record<number, number> = {};
    DEFECT_CLASSES.forEach(dc => {
      counts[dc.id] = boundingBoxes.filter(bbox => bbox.classId === dc.id).length;
    });
    return counts;
  }, [boundingBoxes]);

  const selectedBbox = useMemo(() => {
    return selectedObjectId && selectedObjectType === 'bbox'
      ? boundingBoxes.find(bbox => bbox.id === selectedObjectId)
      : null;
  }, [selectedObjectId, selectedObjectType, boundingBoxes]);

  const handleClassClick = useCallback((classId: number) => {
    if (selectedBbox) {
      onUpdateBoundingBox(selectedBbox.id, { classId });
    } else {
      onClassSelect(classId);
    }
  }, [selectedBbox, onUpdateBoundingBox, onClassSelect]);
  const defectCount = useMemo(() => {
    return boundingBoxes.filter(bbox => bbox.classId === 12).length;
  }, [boundingBoxes]);
  return (
    <div className="w-64 bg-white border-r border-gray-200 p-4 overflow-y-auto">
      <h2 className="text-sm font-semibold text-gray-700 mb-4">Классы дефектов</h2>
      
      <div className="space-y-2">
        {DEFECT_CLASSES.map((defectClass) => {
          const count = classCounts[defectClass.id] || 0;
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
                  borderColor: disabled ? undefined : defectClass.color,
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
      
      {defectCount > 0 && (
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="text-sm font-semibold text-gray-700">
            Дефектов от авторазметки: {defectCount}
          </div>
        </div>
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.activeClassId === nextProps.activeClassId &&
    prevProps.disabled === nextProps.disabled &&
    prevProps.selectedObjectId === nextProps.selectedObjectId &&
    prevProps.selectedObjectType === nextProps.selectedObjectType &&
    prevProps.boundingBoxes === nextProps.boundingBoxes
  );
});