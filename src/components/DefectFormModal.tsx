import React, { useState, useEffect } from 'react';
import { Modal, ModalButtons, ModalButton } from '../ui/Modal';
import { DefectRecord, DefectsData } from '../types/defects';
import { formatDefectRecord } from '../utils/formatDefectRecord';
import defectsData from '../data/defects_data.json';

interface DefectFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  bboxId: string | null;
  defectClassId: number | null;
  initialRecord: DefectRecord | null;
  onSaveRecord: (bboxId: string, record: DefectRecord, formattedString: string) => void;
}

export const DefectFormModal: React.FC<DefectFormModalProps> = ({
  isOpen,
  onClose,
  bboxId,
  defectClassId,
  initialRecord,
  onSaveRecord
}) => {
  const [selectedDefectId, setSelectedDefectId] = useState<number>(1);
  const [selectedCharacterId, setSelectedCharacterId] = useState<string>('');
  const [selectedVariety, setSelectedVariety] = useState<string>('');
  const [count, setCount] = useState<number>(1);
  const [dimensions, setDimensions] = useState({
    diameter: 0,
    width: 0,
    length: 0,
    elementLength: 0
  });
  const [useLatinAlphabet, setUseLatinAlphabet] = useState<boolean>(false);

  const typedDefectsData = defectsData as DefectsData;

  // Инициализация формы при открытии
  useEffect(() => {
    if (isOpen && initialRecord) {
      setSelectedDefectId(initialRecord.defectId);
      setSelectedCharacterId(initialRecord.characterId);
      setSelectedVariety(initialRecord.variety || '');
      setCount(initialRecord.count);
      setDimensions(initialRecord.dimensions);
    } else if (isOpen && defectClassId !== null) {
      // Устанавливаем дефект по умолчанию на основе класса
      setSelectedDefectId(defectClassId + 1); // defectClassId 0-9 соответствует defectId 1-10
      setSelectedCharacterId('');
      setSelectedVariety('');
      setCount(1);
      setDimensions({
        diameter: 0,
        width: 0,
        length: 0,
        elementLength: 0
      });
    }
  }, [isOpen, initialRecord, defectClassId]);

  const selectedDefect = typedDefectsData.defects.find(d => d.id === selectedDefectId);
  const availableCharacters = selectedDefect?.характер_дефекта || [];
  const selectedCharacter = availableCharacters.find(c => c.id === selectedCharacterId);
  
  // Получаем уникальные разновидности для выбранного характера
  const availableVarieties = selectedCharacter 
    ? [...new Set(availableCharacters
        .filter(c => c.id === selectedCharacterId)
        .map(c => c.разновидность_дефекта))]
    : [];

  const handleSave = () => {
    if (!bboxId || !selectedCharacter) return;

    const record: DefectRecord = {
      defectId: selectedDefectId,
      characterId: selectedCharacterId,
      variety: selectedVariety || undefined,
      count,
      dimensions
    };

    const formattedString = formatDefectRecord([record], typedDefectsData, useLatinAlphabet);
    onSaveRecord(bboxId, record, formattedString);
  };

  const isFormValid = selectedDefectId && selectedCharacterId && count > 0;

  return (
    <Modal
      isOpen={isOpen}
      title="Параметры дефекта"
      onClose={onClose}
      maxWidth="max-w-2xl"
    >
      <div className="space-y-4">
        {/* Выбор вида дефекта */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Вид дефекта
          </label>
          <select
            value={selectedDefectId}
            onChange={(e) => {
              setSelectedDefectId(Number(e.target.value));
              setSelectedCharacterId('');
              setSelectedVariety('');
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {typedDefectsData.defects.map(defect => (
              <option key={defect.id} value={defect.id}>
                {defect.вид_дефекта} ({defect.условное_обозначение_русский})
              </option>
            ))}
          </select>
        </div>

        {/* Выбор характера дефекта */}
        {availableCharacters.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Характер дефекта
            </label>
            <select
              value={selectedCharacterId}
              onChange={(e) => {
                setSelectedCharacterId(e.target.value);
                setSelectedVariety('');
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Выберите характер дефекта</option>
              {[...new Set(availableCharacters.map(c => c.id))].map(characterId => {
                const character = availableCharacters.find(c => c.id === characterId);
                return (
                  <option key={characterId} value={characterId}>
                    {character?.название_характера} ({character?.условное_обозначение_русский})
                  </option>
                );
              })}
            </select>
          </div>
        )}

        {/* Выбор разновидности */}
        {availableVarieties.length > 1 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Разновидность дефекта
            </label>
            <select
              value={selectedVariety}
              onChange={(e) => setSelectedVariety(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {availableVarieties.map(variety => (
                <option key={variety} value={variety}>
                  {variety}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Количество */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Количество
          </label>
          <input
            type="number"
            min="1"
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Размеры */}
        {selectedCharacter && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Размеры (мм)
            </label>
            <div className="grid grid-cols-2 gap-4">
              {selectedCharacter.контролируемый_размер_1.includes('Диаметр') && (
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Диаметр</label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={dimensions.diameter}
                    onChange={(e) => setDimensions(prev => ({ ...prev, diameter: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}
              
              {selectedCharacter.контролируемый_размер_1.includes('Ширина') && (
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Ширина</label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={dimensions.width}
                    onChange={(e) => setDimensions(prev => ({ ...prev, width: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}
              
              {selectedCharacter.контролируемый_размер_2?.includes('Длина') && (
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Длина элемента</label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={dimensions.elementLength}
                    onChange={(e) => setDimensions(prev => ({ ...prev, elementLength: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}
              
              {(selectedCharacter.контролируемый_размер_1.includes('Длина') || 
                selectedCharacter.название_характера.includes('Цепочка') ||
                selectedCharacter.название_характера.includes('Скопление')) && (
                <div>
                  <label className="block text-xs text-gray-600 mb-1">
                    {selectedCharacter.название_характера.includes('Цепочка') ? 'Длина цепочки' :
                     selectedCharacter.название_характера.includes('Скопление') ? 'Длина скопления' :
                     'Длина'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={dimensions.length}
                    onChange={(e) => setDimensions(prev => ({ ...prev, length: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Выбор алфавита */}
        <div>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={useLatinAlphabet}
              onChange={(e) => setUseLatinAlphabet(e.target.checked)}
              className="mr-2"
            />
            <span className="text-sm text-gray-700">Использовать латинский алфавит</span>
          </label>
        </div>

        {/* Предварительный просмотр записи */}
        {isFormValid && selectedCharacter && (
          <div className="bg-gray-50 p-3 rounded-md">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Условная запись дефекта:
            </label>
            <div className="font-mono text-lg">
              {formatDefectRecord([{
                defectId: selectedDefectId,
                characterId: selectedCharacterId,
                variety: selectedVariety || undefined,
                count,
                dimensions
              }], typedDefectsData, useLatinAlphabet)}
            </div>
          </div>
        )}
      </div>

      <ModalButtons>
        <ModalButton onClick={onClose}>
          Отмена
        </ModalButton>
        <ModalButton onClick={handleSave} primary disabled={!isFormValid}>
          Сохранить
        </ModalButton>
      </ModalButtons>
    </Modal>
  );
};