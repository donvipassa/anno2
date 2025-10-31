import React, { useMemo, useCallback } from 'react';
import { BoundingBox } from '../types';
import { Tooltip } from './Tooltip';
import jsonData from '../data/defect-classes.json';

interface ObjectClassesSidebarProps {
  activeClassId: number;
  onClassSelect: (classId: number) => void;
  disabled: boolean;
  boundingBoxes: BoundingBox[];
  selectedObjectId: string | null;
  selectedObjectType: string | null;
  onUpdateBoundingBox: (id: string, updates: Partial<BoundingBox>) => void;
}

interface ObjectClass {
  apiID: number;
  name: string;
  russian_name: string;
  color: [number, number, number];
  description?: string;
}

const OBJECT_CLASSES_ORDER = [
  { ids: [13, 16, 18], label: 'Эталоны чувствительности' },
  { ids: [14], label: 'Маркировочные знаки' },
  { ids: [19], label: 'Текстовые комментарии' },
  { ids: [15], label: 'Мерные пояса' }
];

export const ObjectClassesSidebar = React.memo<ObjectClassesSidebarProps>(function ObjectClassesSidebar({
  activeClassId,
  onClassSelect,
  disabled,
  boundingBoxes,
  selectedObjectId,
  selectedObjectType,
  onUpdateBoundingBox
}) {
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

  const objectClasses = useMemo(() => {
    const allIds = OBJECT_CLASSES_ORDER.flatMap(group => group.ids);
    return (jsonData as ObjectClass[]).filter(cls => allIds.includes(cls.apiID));
  }, []);

  const classCounts = useMemo(() => {
    const counts: Record<number, number> = {};
    objectClasses.forEach(cls => {
      counts[cls.apiID] = boundingBoxes.filter(bbox => bbox.classId === cls.apiID).length;
    });
    return counts;
  }, [boundingBoxes, objectClasses]);

  return (
    <div className="w-64 bg-white border-l border-gray-200 p-4 overflow-y-auto">
      <h2 className="text-sm font-semibold text-gray-700 mb-4">Классы других объектов</h2>

      <div className="space-y-4">
        {OBJECT_CLASSES_ORDER.map((group, groupIndex) => {
          const groupClasses = objectClasses.filter(cls => group.ids.includes(cls.apiID));
          if (groupClasses.length === 0) return null;

          return (
            <div key={groupIndex} className="space-y-2">
              <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                {group.label}
              </h3>
              {groupClasses.map((objClass) => {
                const count = classCounts[objClass.apiID] || 0;
                const isSelected = activeClassId === objClass.apiID || selectedBbox?.classId === objClass.apiID;
                const rgbColor = `rgb(${objClass.color[0]}, ${objClass.color[1]}, ${objClass.color[2]})`;

                return (
                  <Tooltip
                    key={objClass.apiID}
                    text={disabled ? '' :
                      (selectedBbox ?
                        `Изменить класс на "${objClass.russian_name}"` :
                        objClass.russian_name
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
                            ${isSelected ? 'bg-blue-50' : 'bg-white hover:bg-gray-50'} border-gray-200 text-black
                            hover:border-opacity-80
                          `
                        }
                        ${isSelected && !disabled ? 'border-4 ring-2 ring-blue-400 ring-opacity-50' : ''}
                      `}
                      style={{
                        borderColor: disabled ? undefined : rgbColor,
                        borderWidth: isSelected && !disabled ? '4px' : '2px'
                      }}
                      onClick={() => !disabled && handleClassClick(objClass.apiID)}
                      disabled={disabled}
                    >
                      <span className="text-sm font-medium text-black truncate pr-2">
                        {objClass.russian_name}
                      </span>
                      <span className={`text-sm font-medium ${
                        isSelected ? 'text-blue-700' : 'text-black'
                      }`}>
                        ({count})
                      </span>
                    </button>
                  </Tooltip>
                );
              })}
            </div>
          );
        })}
      </div>
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
