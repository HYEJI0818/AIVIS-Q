// 환자 정보 타입
export interface PatientInfo {
  name: string;
  sex: 'M' | 'F';
  birthDate: string; // YYYY-MM-DD 형식
  studyDate: string; // 촬영일자 YYYY-MM-DD
  ageYears: number | null; // 만 나이
}

// 볼륨 측정값 타입
export interface VolumeMetrics {
  // AI 추정값
  liverVolumeEstimated: number | null; // cc 단위
  spleenVolumeEstimated: number | null; // cc 단위
  ratioEstimated: number | null; // LSVR (Liver/Spleen Volume Ratio)
  
  // 사용자 수정값
  liverVolumeEdited: number | null; // cc 단위
  spleenVolumeEdited: number | null; // cc 단위
  ratioEdited: number | null; // LSVR (수정 후)
}

// CT 추론 진행률 타입
export interface CtProgress {
  preprocessing: number; // 0~100
  inference: number; // 0~100
  postprocessing: number; // 0~100
}

// 뷰어 방향 타입
export type ViewOrientation = 'axial' | 'sagittal' | 'coronal' | '3d';

// 소아 참고치 입력 타입
export interface PediatricReferenceInput {
  sex: 'M' | 'F';
  birthDate: string;
  studyDate: string;
  heightCm: number;
  weightKg: number;
  ageYears: number;
}

// 소아 참고치 백분위수 타입
export interface ReferencePercentile {
  p5: number;
  p25: number;
  p50: number;
  p75: number;
  p95: number;
}

// 소아 참고치 비교 결과 타입
export interface PediatricReferenceResult {
  liverVolume: ReferencePercentile;
  spleenVolume: ReferencePercentile;
  patientLiverVolume: number;
  patientSpleenVolume: number;
}

