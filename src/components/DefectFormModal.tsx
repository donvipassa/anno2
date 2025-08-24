import React, { useState, useEffect, useCallback } from 'react';
import { Modal, ModalButtons, ModalButton } from '../ui/Modal';
import { Defect, DefectCharacter, DefectRecord, DefectsData } from '../types/defects';
import { DEFECT_CLASSES } from '../types';
import { formatDefectRecord } from '../utils/formatDefectRecord';
import { v4 as uuidv4 } from 'uuid';
import { AlertTriangle } from 'lucide-react';
import defectsDataJson from '../data/defects_data.json';

interface DefectFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  bboxId: string | null;
  defectClassId: number | null; // ID из DEFECT_CLASSES (0-10)
  initialRecord: DefectRecord | null;
  onSaveRecord: (bboxId: string, record: DefectRecord, formattedString: string) => void;
}

export const DefectFormModal: React.FC<DefectFormModalProps> = ({
  isOpen,
  onClose,
  bboxId,
  defectClassId,
  initialRecord,
  onSaveRecord,
}) => {
  const [selectedDefect, setSelectedDefect] = useState<Defect | null>(null);
  const [selectedCharacter, setSelectedCharacter] = useState<DefectCharacter | null>(null);
  const [selectedVariety, setSelectedVariety] = useState<string>('');
  const [count, setCount] = useState<number>(1);
  const [dimensions, setDimensions] = useState<DefectRecord['dimensions']>({
    diameter: 0,
    width: 0,
    length: 0,
    elementLength: 0,
  });
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [formattedRecordString, setFormattedRecordString] = useState<string>('');

  const defectsData = defectsDataJson as DefectsData;

  // Проверяем, является ли дефект простым (без характера)
  const isSimpleDefect = (): boolean => {
    if (!selectedDefect) return false;
    const simpleDefectIds = [6, 7, 8, 9, 10]; // Окисные включения, Вогнутость корня шва, Выпуклость корня шва, Подрез, Смещение кромок
    return simpleDefectIds.includes(selectedDefect.id);
  };

  // Инициализация формы при открытии или изменении initialRecord
  useEffect(() => {
    if (isOpen && defectClassId !== null) {
      // Находим соответствующий дефект из defects_data.json по имени
      const defectClassName = DEFECT_CLASSES.find(dc => dc.id === defectClassId)?.name;
      const initialDefect = defectsData.defects.find(d => d.вид_дефекта === defectClassName);
      setSelectedDefect(initialDefect || null);

      if (initialRecord) {
        // Редактирование существующей записи
        const char = initialDefect?.характер_дефекта.find(c => 
          c.id === initialRecord.characterId && 
          (initialRecord.variety ? c.разновидность_дефекта === initialRecord.variety : true)
        );
        setSelectedCharacter(char || null);
        setSelectedVariety(initialRecord.variety || '');
        setCount(initialRecord.count);
        setDimensions(initialRecord.dimensions);
      } else {
        // Новая запись - автоматически выбираем первый характер
        if (initialDefect) {
          const uniqueCharacters = getUniqueCharacters(initialDefect);
          if (uniqueCharacters.length > 0) {
            setSelectedCharacter(uniqueCharacters[0]);
          } else {
            setSelectedCharacter(null);
          }
        }
        setSelectedVariety('');
        setCount(1);
        setDimensions({ diameter: 0, width: 0, length: 0, elementLength: 0 });
      }
      setValidationErrors([]);
    }
  }, [isOpen, defectClassId, initialRecord]);

  // Сброс размеров при смене характера или разновидности
  useEffect(() => {
    if (selectedCharacter) {
      setDimensions({ diameter: 0, width: 0, length: 0, elementLength: 0 });
      setValidationErrors([]);
    }
  }, [selectedCharacter, selectedVariety]);

  // Обновление отформатированной строки при изменении данных
  useEffect(() => {
    if (selectedDefect && selectedCharacter && bboxId) {
      const currentRecord: DefectRecord = {
        id: initialRecord?.id || uuidv4(),
        defectId: selectedDefect.id,
        characterId: selectedCharacter.id,
        variety: selectedVariety || undefined,
        count: count,
        dimensions: dimensions,
      };
      const formatted = formatDefectRecord([currentRecord], defectsData);
      setFormattedRecordString(formatted);
    } else {
      setFormattedRecordString('');
    }
  }, [selectedDefect, selectedCharacter, selectedVariety, count, dimensions, bboxId, initialRecord]);

  // Получаем уникальные характеры дефектов
  const getUniqueCharacters = (defect: Defect) => {
    const uniqueCharacters = new Map();
    defect.характер_дефекта.forEach(char => {
      if (!uniqueCharacters.has(char.id)) {
        uniqueCharacters.set(char.id, char);
      }
    });
    return Array.from(uniqueCharacters.values());
  };

  // Получаем уникальные разновидности для выбранного характера
  const getVarieties = () => {
    if (!selectedCharacter || !selectedDefect) return [];
    
    const varieties = selectedDefect.характер_дефекта
      .filter(char => char.id === selectedCharacter.id)
      .map(char => char.разновидность_дефекта)
      .filter(variety => variety !== '-');
    
    return [...new Set(varieties)];
  };

  // Получаем активный характер с учетом выбранной разновидности
  const getActiveCharacter = (): DefectCharacter | null => {
    if (!selectedCharacter || !selectedDefect) return null;
    
    const varieties = getVarieties();
    if (varieties.length > 0 && selectedVariety) {
      return selectedDefect.характер_дефекта.find(char => 
        char.id === selectedCharacter.id && char.разновидность_дефекта === selectedVariety
      ) || null;
    }
    
    return selectedCharacter;
  };

  // Проверяем, выбраны ли характер и разновидность (если нужна)
  const isCharacterAndVarietySelected = (): boolean => {
    if (!selectedCharacter) return false;
    
    const varieties = getVarieties();
    if (varieties.length > 0 && !selectedVariety) {
      return false;
    }
    
    return true;
  };

  // Валидация параметров дефекта
  const validateParameters = (): string[] => {
    const errors: string[] = [];
    
    if (!selectedCharacter) {
      errors.push('Выберите характер дефекта');
      return errors;
    }

    const varieties = getVarieties();
    if (varieties.length > 0 && !selectedVariety) {
      errors.push('Выберите разновидность дефекта');
      return errors;
    }

    const activeCharacter = getActiveCharacter();
    if (!activeCharacter) {
      errors.push('Не удалось определить параметры дефекта');
      return errors;
    }

    if (count <= 0) {
      errors.push('Количество должно быть больше нуля');
    }

    const isChainOrCluster = activeCharacter.название_характера.includes('Цепочка') || 
                            activeCharacter.название_характера.includes('Скопление');

    if (isChainOrCluster) {
      if (dimensions.length <= 0) {
        const type = activeCharacter.название_характера.includes('Цепочка') ? 'цепочки' : 'скопления';
        errors.push(`Длина ${type} должна быть больше нуля`);
      }

      if (activeCharacter.контролируемый_размер_2 && activeCharacter.контролируемый_размер_2 !== '-') {
        if (activeCharacter.контролируемый_размер_2.includes('диаметр')) {
          if (dimensions.diameter <= 0) {
            errors.push('Максимальный диаметр элементов должен быть больше нуля');
          }
        } else if (activeCharacter.контролируемый_размер_2.includes('ширина')) {
          if (dimensions.width <= 0) {
            errors.push('Максимальная ширина элементов должна быть больше нуля');
          }
          if (activeCharacter.контролируемый_размер_3 && dimensions.elementLength <= 0) {
            errors.push('Максимальная длина элементов должна быть больше нуля');
          }
        }
      }
    } else {
      if (activeCharacter.контролируемый_размер_1.includes('Диаметр')) {
        if (dimensions.diameter <= 0) {
          errors.push('Диаметр должен быть больше нуля');
        }
      }

      if (activeCharacter.контролируемый_размер_1.includes('Ширина')) {
        if (dimensions.width <= 0) {
          errors.push('Ширина должна быть больше нуля');
        }
        if (activeCharacter.контролируемый_размер_2 && activeCharacter.контролируемый_размер_2.includes('Длина')) {
          if (dimensions.elementLength <= 0) {
            errors.push('Длина должна быть больше нуля');
          }
        }
      }

      if (activeCharacter.контролируемый_размер_1.includes('Длина')) {
        if (dimensions.length <= 0) {
          errors.push('Длина должна быть больше нуля');
        }
      }
    }

    return errors;
  };

  // Обработка изменения числовых значений с валидацией
  const handleNumberChange = (field: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    
    if (field === 'count') {
      setCount(Math.max(0, Math.floor(numValue)));
    } else {
      setDimensions(prev => ({
        ...prev,
        [field]: Math.max(0, numValue)
      }));
    }
    
    setValidationErrors([]);
  };

  const handleSave = useCallback(() => {
    if (!bboxId || !selectedDefect || !selectedCharacter) {
      return;
    }

    const errors = validateParameters();
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    const record: DefectRecord = {
      id: initialRecord?.id || uuidv4(),
      defectId: selectedDefect.id,
      characterId: selectedCharacter.id,
      variety: selectedVariety || undefined,
      count: count,
      dimensions: dimensions,
    };

    onSaveRecord(bboxId, record, formattedRecordString);
    onClose();
  }, [bboxId, selectedDefect, selectedCharacter, selectedVariety, count, dimensions, formattedRecordString, onSaveRecord, onClose, initialRecord, validateParameters]);

  if (!selectedDefect) {
    return null;
  }

  const uniqueCharacters = getUniqueCharacters(selectedDefect);
  const varieties = getVarieties();
  const activeCharacter = getActiveCharacter();
  
  const isChainOrCluster = activeCharacter?.название_характера.includes('Цепочка') || 
                          activeCharacter?.название_характера.includes('Скопление');

  // Получаем изображение для отображения
  const getDisplayImage = (): string => {
    if (activeCharacter) {
      return activeCharacter.файл_изображение;
    }
    if (selectedCharacter) {
      return selectedCharacter.файл_изображение;
    }
    return '';
  };

  const displayImage = getDisplayImage();

  return (
    <Modal isOpen={isOpen} title="Параметры дефекта" onClose={onClose} maxWidth="max-w-5xl">
      <div className="max-h-[80vh] overflow-y-auto">
        {/* Ошибки валидации */}
        {validationErrors.length > 0 && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <h3 className="font-medium text-red-800">Необходимо исправить ошибки:</h3>
            </div>
            <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
              {validationErrors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex gap-8 min-w-fit">
          {/* Изображение дефекта */}
          <div className="flex-shrink-0 w-64 min-w-64">
            <h3 className="font-medium text-gray-700 mb-3">{selectedDefect.вид_дефекта}</h3>
            {displayImage && (
              <div className="bg-gray-100 rounded-lg p-4 flex items-center justify-center h-64">
                <img
                  src={`/${displayImage}`}
                  alt={activeCharacter?.название_характера || selectedDefect.вид_дефекта}
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    console.error(`Ошибка загрузки изображения: ${displayImage}`);
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
            )}
            {!displayImage && (
              <div className="bg-gray-100 rounded-lg p-4 flex items-center justify-center h-64">
                <span className="text-gray-500 text-sm">Изображение не найдено</span>
              </div>
            )}
          </div>

          {/* Правая часть с полями */}
          <div className="flex-1 flex flex-col min-w-fit">
            <div className="flex gap-8 flex-1 min-w-fit">
              {/* Характер дефекта и количество */}
              <div className="flex-1 min-w-80">
                {/* Характер дефекта - показываем только для сложных дефектов */}
                {!isSimpleDefect() && (
                  <div className="mb-6">
                    <h3 className="font-medium text-gray-700 mb-3">Характер дефекта</h3>
                    
                    {/* Показываем выбор характера только если их больше одного */}
                    {uniqueCharacters.length > 1 ? (
                      <div className="space-y-2">
                        {uniqueCharacters.map((character) => (
                          <label key={character.id} className="flex items-center space-x-3 cursor-pointer">
                            <input
                              type="radio"
                              name="character"
                              value={character.id}
                              checked={selectedCharacter?.id === character.id}
                              onChange={() => {
                                setSelectedCharacter(character);
                                setSelectedVariety('');
                                setValidationErrors([]);
                              }}
                              className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700 break-words">
                              {character.название_характера !== '-' ? character.название_характера : selectedDefect.вид_дефекта}
                            </span>
                          </label>
                        ))}
                      </div>
                    ) : uniqueCharacters.length === 1 ? (
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <span className="text-sm text-blue-800 font-medium break-words">
                          {uniqueCharacters[0].название_характера !== '-' ? uniqueCharacters[0].название_характера : selectedDefect.вид_дефекта}
                        </span>
                      </div>
                    ) : null}

                    {/* Разновидности */}
                    {varieties.length > 0 && (
                      <div className="mt-4">
                        <div className="space-y-2">
                          {varieties.map((variety) => (
                            <label key={variety} className="flex items-center space-x-3 cursor-pointer">
                              <input
                                type="radio"
                                name="variety"
                                value={variety}
                                checked={selectedVariety === variety}
                                onChange={(e) => setSelectedVariety(e.target.value)}
                                className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                              />
                              <span className="text-sm text-gray-700 break-words">{variety}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Количество однотипных дефектов */}
                {selectedCharacter && (isSimpleDefect() || isCharacterAndVarietySelected()) && (
                  <div>
                    <h3 className="font-medium text-gray-700 mb-3">Количество</h3>
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={count > 1}
                        onChange={(e) => setCount(e.target.checked ? 2 : 1)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700 break-words">
                        Количество однотипных дефектов, шт.
                      </span>
                    </label>
                    {count > 1 && (
                      <input
                        type="number"
                        min="1"
                        value={count}
                        onChange={(e) => handleNumberChange('count', e.target.value)}
                        className="mt-2 w-20 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      />
                    )}
                  </div>
                )}
              </div>

              {/* Размеры дефекта */}
              <div className="flex-1 min-w-64">
                <h3 className="font-medium text-gray-700 mb-3">Размеры дефекта</h3>
                
                {selectedCharacter && (isSimpleDefect() || isCharacterAndVarietySelected()) && activeCharacter && (
                  <div className="space-y-4">
                    {isChainOrCluster ? (
                      // Для цепочек и скоплений
                      <>
                        {/* Длина цепочки/скопления */}
                        <div>
                          <label className="block text-sm text-gray-600 mb-1 break-words">
                            {activeCharacter.контролируемый_размер_1}, мм
                          </label>
                          <input
                            type="number"
                            min="0.1"
                            step="0.1"
                            value={dimensions.length || ''}
                            onChange={(e) => handleNumberChange('length', e.target.value)}
                            className={`w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${
                              validationErrors.some(error => error.includes('цепочки') || error.includes('скопления')) 
                                ? 'border-red-300 bg-red-50' 
                                : 'border-gray-300'
                            }`}
                            placeholder="Введите значение больше 0"
                          />
                        </div>

                        {/* Максимальные размеры элементов в цепочке/скоплении */}
                        {activeCharacter.контролируемый_размер_2 && activeCharacter.контролируемый_размер_2 !== '-' && (
                          <div>
                            <label className="block text-sm text-gray-600 mb-1 break-words">
                              {activeCharacter.контролируемый_размер_2}, мм
                            </label>
                            <input
                              type="number"
                              min="0.1"
                              step="0.1"
                              value={activeCharacter.контролируемый_размер_2.includes('диаметр') ? (dimensions.diameter || '') : (dimensions.width || '')}
                              onChange={(e) => handleNumberChange(
                                activeCharacter.контролируемый_размер_2.includes('диаметр') ? 'diameter' : 'width', 
                                e.target.value
                              )}
                              className={`w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${
                                validationErrors.some(error => 
                                  error.includes('Максимальный диаметр') || error.includes('Максимальная ширина')
                                ) ? 'border-red-300 bg-red-50' : 'border-gray-300'
                              }`}
                              placeholder="Введите значение больше 0"
                            />
                          </div>
                        )}

                        {/* Максимальная длина элементов (только для удлиненных) */}
                        {activeCharacter.контролируемый_размер_3 && activeCharacter.контролируемый_размер_3 !== '-' && (
                          <div>
                            <label className="block text-sm text-gray-600 mb-1 break-words">
                              {activeCharacter.контролируемый_размер_3}, мм
                            </label>
                            <input
                              type="number"
                              min="0.1"
                              step="0.1"
                              value={dimensions.elementLength || ''}
                              onChange={(e) => handleNumberChange('elementLength', e.target.value)}
                              className={`w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${
                                validationErrors.some(error => error.includes('Максимальная длина элементов')) 
                                  ? 'border-red-300 bg-red-50' 
                                  : 'border-gray-300'
                              }`}
                              placeholder="Введите значение больше 0"
                            />
                          </div>
                        )}
                      </>
                    ) : (
                      // Для обычных дефектов
                      <>
                        {activeCharacter.контролируемый_размер_1.includes('Диаметр') && (
                          <div>
                            <label className="block text-sm text-gray-600 mb-1">
                              {activeCharacter.контролируемый_размер_1}, мм
                            </label>
                            <input
                              type="number"
                              min="0.1"
                              step="0.1"
                              value={dimensions.diameter || ''}
                              onChange={(e) => handleNumberChange('diameter', e.target.value)}
                              className={`w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${
                                validationErrors.some(error => error.includes('Диаметр')) 
                                  ? 'border-red-300 bg-red-50' 
                                  : 'border-gray-300'
                              }`}
                              placeholder="Введите значение больше 0"
                            />
                          </div>
                        )}

                        {activeCharacter.контролируемый_размер_1.includes('Ширина') && (
                          <div>
                            <label className="block text-sm text-gray-600 mb-1">
                              {activeCharacter.контролируемый_размер_1}, мм
                            </label>
                            <input
                              type="number"
                              min="0.1"
                              step="0.1"
                              value={dimensions.width || ''}
                              onChange={(e) => handleNumberChange('width', e.target.value)}
                              className={`w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${
                                validationErrors.some(error => error.includes('Ширина')) 
                                  ? 'border-red-300 bg-red-50' 
                                  : 'border-gray-300'
                              }`}
                              placeholder="Введите значение больше 0"
                            />
                          </div>
                        )}

                        {activeCharacter.контролируемый_размер_1.includes('Длина') && (
                          <div>
                            <label className="block text-sm text-gray-600 mb-1">
                              {activeCharacter.контролируемый_размер_1}, мм
                            </label>
                            <input
                              type="number"
                              min="0.1"
                              step="0.1"
                              value={dimensions.length || ''}
                              onChange={(e) => handleNumberChange('length', e.target.value)}
                              className={`w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${
                                validationErrors.some(error => error.includes('Длина')) 
                                  ? 'border-red-300 bg-red-50' 
                                  : 'border-gray-300'
                              }`}
                              placeholder="Введите значение больше 0"
                            />
                          </div>
                        )}

                        {activeCharacter.контролируемый_размер_2 !== '-' && activeCharacter.контролируемый_размер_2.includes('Длина') && (
                          <div>
                            <label className="block text-sm text-gray-600 mb-1">
                              {activeCharacter.контролируемый_размер_2}, мм
                            </label>
                            <input
                              type="number"
                              min="0.1"
                              step="0.1"
                              value={dimensions.elementLength || ''}
                              onChange={(e) => handleNumberChange('elementLength', e.target.value)}
                              className={`w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${
                                validationErrors.some(error => error.includes('Длина')) 
                                  ? 'border-red-300 bg-red-50' 
                                  : 'border-gray-300'
                              }`}
                              placeholder="Введите значение больше 0"
                            />
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Предварительный просмотр записи */}
        {formattedRecordString && (
          <div className="mt-6 p-3 bg-blue-50 border border-blue-200 rounded-md text-blue-800 text-sm">
            <span className="font-semibold">Итоговая запись:</span> {formattedRecordString}
          </div>
        )}
      </div>

      <ModalButtons>
        <ModalButton onClick={onClose}>Отмена</ModalButton>
        <ModalButton onClick={handleSave} primary disabled={!selectedCharacter}>
          Сохранить
        </ModalButton>
      </ModalButtons>
    </Modal>
  );
};