import { create } from 'zustand';
import { PatientInfo, VolumeMetrics, CtProgress } from '@/lib/ctTypes';

interface CtSessionState {
  // 환자 및 분석 데이터
  patientInfo: PatientInfo | null;
  volumeMetrics: VolumeMetrics | null;
  
  // CT 파일 및 Niivue 이미지
  ctFile: File | null;
  ctNvImage: any | null; // Niivue NVImage 타입
  liverMask: any | null; // liver segmentation nvImage
  spleenMask: any | null; // spleen segmentation nvImage
  
  // 일반 마스크 파일 (파일명에 'mask'가 포함된 파일들)
  maskFiles: File[];
  
  // 수정된 마스크 데이터 (드로우 모달에서 저장한 drawBitmap)
  editedMaskData: Uint8Array | null;
  
  // 마스크 뷰 모드 (메인 뷰어에서 원본/수정본 전환)
  maskViewMode: 'original' | 'edited';
  
  // 추론 진행률
  progress: CtProgress;
  
  // 뷰어 컨트롤
  brightness: number; // 0~100
  contrast: number; // 0~100
  opacity: number; // 0~100 (segmentation overlay 투명도)
  
  // 모달 상태
  isDrawingModalOpen: boolean;
  isComparisonModalOpen: boolean;
  isPediatricModalOpen: boolean;
  
  // Actions
  setPatientInfo: (info: PatientInfo) => void;
  setVolumeMetrics: (metrics: VolumeMetrics) => void;
  setCtFile: (file: File | null) => void;
  setCtNvImage: (image: any) => void;
  setLiverMask: (image: any) => void;
  setSpleenMask: (image: any) => void;
  setMaskFiles: (files: File[]) => void;
  addMaskFile: (file: File) => void;
  clearMaskFiles: () => void;
  setEditedMaskData: (data: Uint8Array | null) => void;
  setMaskViewMode: (mode: 'original' | 'edited') => void;
  setProgress: (progress: Partial<CtProgress>) => void;
  setViewControls: (params: Partial<{ brightness: number; contrast: number; opacity: number }>) => void;
  
  // 모달 액션
  openDrawingModal: () => void;
  closeDrawingModal: () => void;
  openComparisonModal: () => void;
  closeComparisonModal: () => void;
  openPediatricModal: () => void;
  closePediatricModal: () => void;
  
  // 세션 초기화
  resetSession: () => void;
}

const initialProgress: CtProgress = {
  preprocessing: 0,
  inference: 0,
  postprocessing: 0,
};

export const useCtSessionStore = create<CtSessionState>((set) => ({
  // 초기 상태
  patientInfo: null,
  volumeMetrics: null,
  ctFile: null,
  ctNvImage: null,
  liverMask: null,
  spleenMask: null,
  maskFiles: [],
  editedMaskData: null,
  maskViewMode: 'original',
  progress: initialProgress,
  brightness: 50,
  contrast: 50,
  opacity: 40,
  isDrawingModalOpen: false,
  isComparisonModalOpen: false,
  isPediatricModalOpen: false,
  
  // Actions
  setPatientInfo: (info) => set({ patientInfo: info }),
  
  setVolumeMetrics: (metrics) => set({ volumeMetrics: metrics }),
  
  setCtFile: (file) => set({ ctFile: file }),
  
  setCtNvImage: (image) => set({ ctNvImage: image }),
  
  setLiverMask: (image) => set({ liverMask: image }),
  
  setSpleenMask: (image) => set({ spleenMask: image }),
  
  setMaskFiles: (files) => set({ maskFiles: files }),
  
  addMaskFile: (file) => set((state) => ({ 
    maskFiles: [...state.maskFiles, file] 
  })),
  
  clearMaskFiles: () => set({ maskFiles: [] }),
  
  setEditedMaskData: (data) => set({ editedMaskData: data }),
  
  setMaskViewMode: (mode) => set({ maskViewMode: mode }),
  
  setProgress: (newProgress) =>
    set((state) => ({
      progress: { ...state.progress, ...newProgress },
    })),
  
  setViewControls: (params) =>
    set((state) => ({
      brightness: params.brightness ?? state.brightness,
      contrast: params.contrast ?? state.contrast,
      opacity: params.opacity ?? state.opacity,
    })),
  
  // 모달 액션
  openDrawingModal: () => set({ isDrawingModalOpen: true }),
  closeDrawingModal: () => set({ isDrawingModalOpen: false }),
  openComparisonModal: () => set({ isComparisonModalOpen: true }),
  closeComparisonModal: () => set({ isComparisonModalOpen: false }),
  openPediatricModal: () => set({ isPediatricModalOpen: true }),
  closePediatricModal: () => set({ isPediatricModalOpen: false }),
  
  // 세션 초기화
  resetSession: () =>
    set({
      patientInfo: null,
      volumeMetrics: null,
      ctFile: null,
      ctNvImage: null,
      liverMask: null,
      spleenMask: null,
      maskFiles: [],
      editedMaskData: null,
      maskViewMode: 'original',
      progress: initialProgress,
      brightness: 50,
      contrast: 50,
      opacity: 40,
      isDrawingModalOpen: false,
      isComparisonModalOpen: false,
      isPediatricModalOpen: false,
    }),
}));


