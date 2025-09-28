import { useState, useCallback, useRef } from 'react';
import { useAnnotations } from '../core/AnnotationManager';
import { useCalibration } from '../core/CalibrationManager';
import { MODAL_TYPES } from '../constants/modalTypes';

/**
 * Хук для управления модальными окнами калибровки
 */
export const useCalibrationModal = (
  showModal: (type: string, title: string, message: string, buttons?: any[]) => void,
  closeModal: () => void,
  setActiveTool: (tool: string) => void
) => {
  const { annotations, setCalibrationLine, updateCalibrationLine } = useAnnotations();
  const { setScale: setCalibrationScale } = useCalibration();
  
  const [calibrationInputValue, setCalibrationInputValue] = useState<string>('50');
  const pendingCalibrationLineRef = useRef<any>(null);
  const calibrationInputRef = useRef<HTMLInputElement>(null);

  const processCalibration = useCallback((realLength: number, isNew: boolean) => {
    try {
      let lineToCalculateFrom;
      if (isNew) {
        lineToCalculateFrom = pendingCalibrationLineRef.current;
      } else {
        lineToCalculateFrom = annotations.calibrationLine;
      }
      
      if (!lineToCalculateFrom) {
        throw new Error('Нет данных линии для расчета');
      }
      
      // Вычисляем пиксельную длину
      const pixelLength = Math.sqrt(
        (lineToCalculateFrom.x2 - lineToCalculateFrom.x1) ** 2 + 
        (lineToCalculateFrom.y2 - lineToCalculateFrom.y1) ** 2
      );
      
      if (isNew) {
        setCalibrationLine({
          ...lineToCalculateFrom,
          realLength: realLength
        });
      } else if (annotations.calibrationLine) {
        updateCalibrationLine({
          realLength: realLength
        });
      }
      
      // Устанавливаем масштаб
      setCalibrationScale(pixelLength, realLength);
      setActiveTool(''); // Сбрасываем активный инструмент после успешной калибровки
      closeModal();
    } catch (error) {
      console.error('Ошибка при установке калибровки:', error);
      closeModal();
      alert('Произошла ошибка при установке калибровки');
    }
  }, [
    annotations.calibrationLine,
    setCalibrationLine,
    updateCalibrationLine,
    setCalibrationScale,
    closeModal,
    setActiveTool
  ]);

  const handleCalibrationLineFinished = useCallback((lineData: any, isNew: boolean) => {
    let defaultLength = '50';
    if (!isNew && annotations.calibrationLine) {
      defaultLength = annotations.calibrationLine.realLength.toString();
    } else if (lineData?.realLength) {
      defaultLength = lineData.realLength.toString();
    }

    // Сохраняем данные новой линии
    if (isNew) {
      pendingCalibrationLineRef.current = lineData;
    }

    setCalibrationInputValue(defaultLength);
    showModal(MODAL_TYPES.CALIBRATION, 'Калибровка масштаба', 'Укажите реальный размер эталона для установки масштаба (мм):',
      [
        { 
          text: 'Отмена', 
          action: () => {
            setCalibrationInputValue('50');
            if (isNew) pendingCalibrationLineRef.current = null;
            closeModal();
          }
        },
        { 
          text: 'Применить', 
          action: () => {
            const inputValue = calibrationInputRef.current?.value || calibrationInputValue;
            const realLength = parseFloat(inputValue);
            
            if (isNaN(realLength) || realLength <= 0) {
              alert('Пожалуйста, введите корректное положительное число');
              return;
            }
            
            processCalibration(realLength, isNew);
          },
          primary: true
        }
      ]
    );
  }, [
    annotations.calibrationLine,
    calibrationInputValue,
    processCalibration,
    showModal,
    closeModal
  ]);

  const handleEditCalibration = useCallback(() => {
    if (annotations.calibrationLine) {
      const currentValue = annotations.calibrationLine.realLength.toString();
      setCalibrationInputValue(currentValue);
      
      showModal(MODAL_TYPES.CALIBRATION, 'Калибровка масштаба', 'Укажите реальный размер эталона для установки масштаба (мм):',
        [
          { 
            text: 'Отмена', 
            action: closeModal
          },
          { 
            text: 'Применить', 
            action: () => {
              const inputValue = calibrationInputRef.current?.value || calibrationInputValue;
              const realLength = parseFloat(inputValue);
              
              if (isNaN(realLength) || realLength <= 0) {
                alert('Пожалуйста, введите корректное положительное число');
                return;
              }
              
              processCalibration(realLength, false);
            },
            primary: true
          }
        ]
      );
    }
  }, [
    annotations.calibrationLine,
    calibrationInputValue,
    processCalibration,
    showModal,
    closeModal
  ]);

  return {
    calibrationInputValue,
    calibrationInputRef,
    handleCalibrationLineFinished,
    handleEditCalibration,
    setCalibrationInputValue
  };
};