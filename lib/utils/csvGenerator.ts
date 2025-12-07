/**
 * CSV 생성 유틸리티
 * 
 * 간/비장 분석 결과를 CSV 형식으로 생성합니다.
 * 백엔드 API 대신 클라이언트 사이드에서 직접 CSV를 생성할 때 사용합니다.
 */

import { CSV_COLUMNS, CSVExportData } from '@/lib/ctTypes';

// 백엔드 API URL (환경변수로 설정 가능)
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

/**
 * 값을 CSV 형식으로 포맷합니다.
 */
function formatValue(value: number | string | null | undefined): string {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'number') {
    return value.toFixed(4);
  }
  return String(value);
}

/**
 * CSV 행 데이터를 생성합니다.
 */
function createRow(
  patientId: string,
  studyId: string | undefined,
  organ: 'liver' | 'spleen',
  data: {
    volume_ml?: number | null;
    mean_HU?: number | null;
    std_HU?: number | null;
    min_HU?: number | null;
    max_HU?: number | null;
    p10_HU?: number | null;
    p90_HU?: number | null;
    GLCM_contrast?: number | null;
    GLCM_homogeneity?: number | null;
    GLRLM_LRE?: number | null;
    GLSZM_ZE?: number | null;
  }
): string[] {
  return [
    patientId,
    studyId || '',
    organ,
    formatValue(data.volume_ml),
    formatValue(data.mean_HU),
    formatValue(data.std_HU),
    formatValue(data.min_HU),
    formatValue(data.max_HU),
    formatValue(data.p10_HU),
    formatValue(data.p90_HU),
    formatValue(data.GLCM_contrast),
    formatValue(data.GLCM_homogeneity),
    formatValue(data.GLRLM_LRE),
    formatValue(data.GLSZM_ZE),
  ];
}

/**
 * CSV 문자열을 생성합니다.
 */
export function generateCSVContent(data: CSVExportData): string {
  const rows: string[][] = [];
  
  // 헤더 추가
  rows.push([...CSV_COLUMNS]);
  
  // 간 데이터 추가
  if (data.liver_volume_ml !== null && data.liver_volume_ml !== undefined) {
    rows.push(createRow(data.patient_id, data.study_id, 'liver', {
      volume_ml: data.liver_volume_ml,
      mean_HU: data.liver_mean_hu,
      std_HU: data.liver_std_hu,
      min_HU: data.liver_min_hu,
      max_HU: data.liver_max_hu,
      p10_HU: data.liver_p10_hu,
      p90_HU: data.liver_p90_hu,
      GLCM_contrast: data.liver_glcm_contrast,
      GLCM_homogeneity: data.liver_glcm_homogeneity,
      GLRLM_LRE: data.liver_glrlm_lre,
      GLSZM_ZE: data.liver_glszm_ze,
    }));
  }
  
  // 비장 데이터 추가
  if (data.spleen_volume_ml !== null && data.spleen_volume_ml !== undefined) {
    rows.push(createRow(data.patient_id, data.study_id, 'spleen', {
      volume_ml: data.spleen_volume_ml,
      mean_HU: data.spleen_mean_hu,
      std_HU: data.spleen_std_hu,
      min_HU: data.spleen_min_hu,
      max_HU: data.spleen_max_hu,
      p10_HU: data.spleen_p10_hu,
      p90_HU: data.spleen_p90_hu,
      GLCM_contrast: data.spleen_glcm_contrast,
      GLCM_homogeneity: data.spleen_glcm_homogeneity,
      GLRLM_LRE: data.spleen_glrlm_lre,
      GLSZM_ZE: data.spleen_glszm_ze,
    }));
  }
  
  // CSV 문자열 생성
  return rows.map(row => 
    row.map(cell => {
      // 쉼표나 따옴표가 포함된 경우 따옴표로 감싸기
      if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
        return `"${cell.replace(/"/g, '""')}"`;
      }
      return cell;
    }).join(',')
  ).join('\n');
}

/**
 * CSV 파일을 Blob으로 생성합니다 (UTF-8 BOM 포함).
 * 엑셀에서 한글/영문이 깨지지 않도록 BOM을 추가합니다.
 */
export function generateCSVBlob(data: CSVExportData): Blob {
  const csvContent = generateCSVContent(data);
  // UTF-8 BOM
  const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
  const csvBytes = new TextEncoder().encode(csvContent);
  
  return new Blob([bom, csvBytes], { type: 'text/csv;charset=utf-8' });
}

/**
 * CSV 파일을 다운로드합니다.
 */
export function downloadCSV(data: CSVExportData, filename?: string): void {
  const blob = generateCSVBlob(data);
  const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const defaultFilename = `liver_spleen_analysis_${data.patient_id}_${timestamp}.csv`;
  
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || defaultFilename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * 백엔드 API를 통해 CSV를 다운로드합니다.
 * API 호출이 실패하면 클라이언트 사이드에서 직접 생성합니다.
 */
export async function downloadCSVFromAPI(data: CSVExportData): Promise<void> {
  // 쿼리 파라미터 생성
  const params = new URLSearchParams();
  params.append('patient_id', data.patient_id);
  
  if (data.study_id) params.append('study_id', data.study_id);
  
  // 간 데이터
  if (data.liver_volume_ml != null) params.append('liver_volume_ml', String(data.liver_volume_ml));
  if (data.liver_mean_hu != null) params.append('liver_mean_hu', String(data.liver_mean_hu));
  if (data.liver_std_hu != null) params.append('liver_std_hu', String(data.liver_std_hu));
  if (data.liver_min_hu != null) params.append('liver_min_hu', String(data.liver_min_hu));
  if (data.liver_max_hu != null) params.append('liver_max_hu', String(data.liver_max_hu));
  if (data.liver_p10_hu != null) params.append('liver_p10_hu', String(data.liver_p10_hu));
  if (data.liver_p90_hu != null) params.append('liver_p90_hu', String(data.liver_p90_hu));
  if (data.liver_glcm_contrast != null) params.append('liver_glcm_contrast', String(data.liver_glcm_contrast));
  if (data.liver_glcm_homogeneity != null) params.append('liver_glcm_homogeneity', String(data.liver_glcm_homogeneity));
  if (data.liver_glrlm_lre != null) params.append('liver_glrlm_lre', String(data.liver_glrlm_lre));
  if (data.liver_glszm_ze != null) params.append('liver_glszm_ze', String(data.liver_glszm_ze));
  
  // 비장 데이터
  if (data.spleen_volume_ml != null) params.append('spleen_volume_ml', String(data.spleen_volume_ml));
  if (data.spleen_mean_hu != null) params.append('spleen_mean_hu', String(data.spleen_mean_hu));
  if (data.spleen_std_hu != null) params.append('spleen_std_hu', String(data.spleen_std_hu));
  if (data.spleen_min_hu != null) params.append('spleen_min_hu', String(data.spleen_min_hu));
  if (data.spleen_max_hu != null) params.append('spleen_max_hu', String(data.spleen_max_hu));
  if (data.spleen_p10_hu != null) params.append('spleen_p10_hu', String(data.spleen_p10_hu));
  if (data.spleen_p90_hu != null) params.append('spleen_p90_hu', String(data.spleen_p90_hu));
  if (data.spleen_glcm_contrast != null) params.append('spleen_glcm_contrast', String(data.spleen_glcm_contrast));
  if (data.spleen_glcm_homogeneity != null) params.append('spleen_glcm_homogeneity', String(data.spleen_glcm_homogeneity));
  if (data.spleen_glrlm_lre != null) params.append('spleen_glrlm_lre', String(data.spleen_glrlm_lre));
  if (data.spleen_glszm_ze != null) params.append('spleen_glszm_ze', String(data.spleen_glszm_ze));

  try {
    const response = await fetch(
      `${API_BASE_URL}/api/abdomen/liver-spleen/csv?${params.toString()}`,
      {
        method: 'GET',
        headers: {
          'Accept': 'text/csv',
        },
      }
    );
    
    if (!response.ok) {
      throw new Error(`API 응답 오류: ${response.status}`);
    }
    
    // Content-Disposition 헤더에서 파일명 추출
    const contentDisposition = response.headers.get('Content-Disposition');
    let filename = `liver_spleen_analysis_${data.patient_id}.csv`;
    if (contentDisposition) {
      const match = contentDisposition.match(/filename="?([^"]+)"?/);
      if (match) {
        filename = match[1];
      }
    }
    
    // Blob으로 변환하여 다운로드
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
  } catch (error) {
    console.warn('백엔드 API 호출 실패, 클라이언트 사이드에서 CSV 생성:', error);
    // Fallback: 클라이언트 사이드에서 직접 생성
    downloadCSV(data);
  }
}

