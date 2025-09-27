import { useState, useCallback } from 'react';
import { DefectRecord } from '../types/defects';

export interface DefectFormState {
  isOpen: boolean;
  bboxId: string | null;
  defectClassId: number | null;
  initialRecord: DefectRecord | null;
}

export const useDefectFormModal = () => {
  const [defectFormModalState, setDefectFormModalState] = useState<DefectFormState>({
    isOpen: false,
    bboxId: null,
    defectClassId: null,
    initialRecord: null
  });

  const openDefectFormModal = useCallback((
    bboxId: string,
    defectClassId: number,
    initialRecord: DefectRecord | null = null
  ) => {
    setDefectFormModalState({
      isOpen: true,
      bboxId,
      defectClassId,
      initialRecord
    });
  }, []);

  const closeDefectFormModal = useCallback(() => {
    setDefectFormModalState({
      isOpen: false,
      bboxId: null,
      defectClassId: null,
      initialRecord: null
    });
  }, []);

  return {
    defectFormModalState,
    openDefectFormModal,
    closeDefectFormModal
  };
};