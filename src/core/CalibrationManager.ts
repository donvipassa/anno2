import { useState, useCallback } from 'react';

interface CalibrationState {
  scale: number; // мм/пиксель
  isSet: boolean;
}

export const useCalibration = () => {
  const [calibration, setCalibration] = useState<CalibrationState>({
    scale: 0,
    isSet: false
  });

  const setScale = useCallback((pixelLength: number, realLength: number) => {
    if (pixelLength > 0 && realLength > 0) {
      setCalibration({
        scale: realLength / pixelLength,
        isSet: true
      });
    }
  }, []);

  const resetScale = useCallback(() => {
    setCalibration({
      scale: 0,
      isSet: false
    });
  }, []);

  const getLength = useCallback((pixelLength: number): { value: number; unit: string } => {
    if (calibration.isSet) {
      return {
        value: pixelLength * calibration.scale,
        unit: 'мм'
      };
    } else {
      return {
        value: pixelLength,
        unit: 'px'
      };
    }
  }, [calibration]);

  const getArea = useCallback((pixelWidth: number, pixelHeight: number): { value: number; unit: string } => {
    if (calibration.isSet) {
      const mmWidth = pixelWidth * calibration.scale;
      const mmHeight = pixelHeight * calibration.scale;
      return {
        value: mmWidth * mmHeight,
        unit: 'мм²'
      };
    } else {
      return {
        value: pixelWidth * pixelHeight,
        unit: 'px²'
      };
    }
  }, [calibration]);

  return {
    calibration,
    setScale,
    resetScale,
    getLength,
    getArea
  };
};