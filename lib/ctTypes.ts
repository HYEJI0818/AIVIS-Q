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

// HU 통계 타입
export interface HUStatistics {
  mean: number | null;
  std: number | null;
  min: number | null;
  max: number | null;
  p10: number | null;
  p90: number | null;
}

// 라디오믹스 특징 타입
export interface RadiomicsFeatures {
  glcm_contrast: number | null;
  glcm_homogeneity: number | null;
  glrlm_lre: number | null;
  glszm_ze: number | null;
}

// 장기별 분석 특징 타입
export interface OrganFeatures {
  organ: 'liver' | 'spleen';
  volume_ml: number | null;
  hu_stats: HUStatistics | null;
  radiomics: RadiomicsFeatures | null;
}

// CSV 내보내기 요청 타입
export interface CSVExportData {
  patient_id: string;
  study_id?: string;
  liver_volume_ml?: number | null;
  liver_mean_hu?: number | null;
  liver_std_hu?: number | null;
  liver_min_hu?: number | null;
  liver_max_hu?: number | null;
  liver_p10_hu?: number | null;
  liver_p90_hu?: number | null;
  liver_glcm_contrast?: number | null;
  liver_glcm_homogeneity?: number | null;
  liver_glrlm_lre?: number | null;
  liver_glszm_ze?: number | null;
  spleen_volume_ml?: number | null;
  spleen_mean_hu?: number | null;
  spleen_std_hu?: number | null;
  spleen_min_hu?: number | null;
  spleen_max_hu?: number | null;
  spleen_p10_hu?: number | null;
  spleen_p90_hu?: number | null;
  spleen_glcm_contrast?: number | null;
  spleen_glcm_homogeneity?: number | null;
  spleen_glrlm_lre?: number | null;
  spleen_glszm_ze?: number | null;
}

// CSV 컬럼 정의 (확장 가능한 상수)
export const CSV_COLUMNS = [
  'patient_id',
  'study_id',
  'organ',
  'volume_ml',
  'mean_HU',
  'std_HU',
  'min_HU',
  'max_HU',
  'p10_HU',
  'p90_HU',
  'GLCM_contrast',
  'GLCM_homogeneity',
  'GLRLM_LRE',
  'GLSZM_ZE',
] as const;


