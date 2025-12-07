'use client';

import { useState } from 'react';
import * as nifti from 'nifti-reader-js';
import { useCtSessionStore } from '@/store/useCtSessionStore';
import { downloadCSV, downloadCSVFromAPI } from '@/lib/utils/csvGenerator';
import { CSVExportData } from '@/lib/ctTypes';

export default function DownloadPanel() {
  const { ctFile, maskFiles, editedMaskData, patientInfo, volumeMetrics } = useCtSessionStore();
  const hasEditedMask = !!editedMaskData;
  const [isDownloading, setIsDownloading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // 파일 다운로드 헬퍼 함수
  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // 전처리 CT 이미지 다운로드
  const handleDownloadCT = () => {
    if (!ctFile) {
      alert('다운로드할 CT 파일이 없습니다.');
      return;
    }
    downloadBlob(ctFile, ctFile.name);
  };

  // Segmentation Mask 다운로드 (원본)
  const handleDownloadMask = () => {
    if (!maskFiles || maskFiles.length === 0) {
      alert('다운로드할 마스크 파일이 없습니다.');
      return;
    }
    downloadBlob(maskFiles[0], maskFiles[0].name);
  };

  // 수정 후 Segmentation Mask 다운로드
  const handleDownloadEditedMask = async () => {
    if (!editedMaskData) {
      alert('수정된 마스크가 없습니다.');
      return;
    }
    if (!maskFiles || maskFiles.length === 0) {
      alert('원본 마스크 파일이 없습니다.');
      return;
    }

    try {
      // 원본 마스크 파일에서 헤더 추출
      let originalArrayBuffer = await maskFiles[0].arrayBuffer();
      
      // 압축된 파일인지 확인하고 압축 해제
      if (nifti.isCompressed(originalArrayBuffer)) {
        console.log('압축된 NIfTI 파일 감지, 압축 해제 중...');
        originalArrayBuffer = nifti.decompress(originalArrayBuffer);
      }
      
      // NIfTI 파일인지 확인
      if (!nifti.isNIFTI(originalArrayBuffer)) {
        alert('원본 파일이 NIfTI 형식이 아닙니다.');
        return;
      }

      // 헤더 읽기
      const header = nifti.readHeader(originalArrayBuffer);
      if (!header) {
        alert('NIfTI 헤더를 읽을 수 없습니다.');
        return;
      }

      // 헤더 크기 계산
      const headerSize = header.vox_offset || 352; // 기본 NIfTI-1 헤더 크기
      
      // 원본 헤더 부분 추출
      const headerBytes = new Uint8Array(originalArrayBuffer.slice(0, headerSize));
      
      // 새 NIfTI 파일 생성 (헤더 + 수정된 데이터)
      const newNiftiBuffer = new ArrayBuffer(headerSize + editedMaskData.length);
      const newNiftiArray = new Uint8Array(newNiftiBuffer);
      
      // 헤더 복사
      newNiftiArray.set(headerBytes, 0);
      // 수정된 마스크 데이터 복사
      newNiftiArray.set(editedMaskData, headerSize);
      
      // Blob 생성 및 다운로드 (압축 해제된 .nii로 저장)
      const blob = new Blob([newNiftiBuffer], { type: 'application/octet-stream' });
      const timestamp = new Date().toISOString().slice(0, 10);
      downloadBlob(blob, `edited_mask_${timestamp}.nii`);
      
      console.log('수정된 마스크 다운로드 완료');
    } catch (error) {
      console.error('수정된 마스크 다운로드 실패:', error);
      alert('다운로드에 실패했습니다.');
    }
  };

  // 토스트 표시 헬퍼
  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // 간/비장 CSV 다운로드
  const handleDownloadCSV = async () => {
    // 분석 결과가 없는 경우
    if (!volumeMetrics) {
      showToast('다운로드할 분석 결과가 없습니다.', 'error');
      return;
    }

    // 환자 정보가 없는 경우 기본값 사용
    const patientId = patientInfo?.name || 'UNKNOWN';
    const studyId = patientInfo?.studyDate || undefined;

    // 현재 표시 중인 데이터 기준으로 CSV 데이터 구성
    // maskViewMode에 따라 추정값 또는 수정값 사용
    const { maskViewMode } = useCtSessionStore.getState();
    const useEdited = maskViewMode === 'edited' && hasEditedMask;

    const liverVolume = useEdited 
      ? volumeMetrics.liverVolumeEdited 
      : volumeMetrics.liverVolumeEstimated;
    const spleenVolume = useEdited 
      ? volumeMetrics.spleenVolumeEdited 
      : volumeMetrics.spleenVolumeEstimated;

    // CSV 데이터 생성
    const csvData: CSVExportData = {
      patient_id: patientId,
      study_id: studyId,
      liver_volume_ml: liverVolume,
      // HU 통계 및 라디오믹스 (현재는 미계산 - 추후 확장 가능)
      // 실제 값이 있으면 여기에 추가
      liver_mean_hu: null,
      liver_std_hu: null,
      liver_min_hu: null,
      liver_max_hu: null,
      liver_p10_hu: null,
      liver_p90_hu: null,
      liver_glcm_contrast: null,
      liver_glcm_homogeneity: null,
      liver_glrlm_lre: null,
      liver_glszm_ze: null,
      spleen_volume_ml: spleenVolume,
      spleen_mean_hu: null,
      spleen_std_hu: null,
      spleen_min_hu: null,
      spleen_max_hu: null,
      spleen_p10_hu: null,
      spleen_p90_hu: null,
      spleen_glcm_contrast: null,
      spleen_glcm_homogeneity: null,
      spleen_glrlm_lre: null,
      spleen_glszm_ze: null,
    };

    setIsDownloading(true);

    try {
      // 먼저 백엔드 API 시도, 실패 시 클라이언트에서 직접 생성
      await downloadCSVFromAPI(csvData);
      showToast('CSV 파일 다운로드 완료!', 'success');
    } catch (error) {
      console.error('CSV 다운로드 실패:', error);
      // Fallback: 클라이언트에서 직접 생성
      try {
        downloadCSV(csvData);
        showToast('CSV 파일 다운로드 완료!', 'success');
      } catch (fallbackError) {
        console.error('CSV 다운로드 fallback 실패:', fallbackError);
        showToast('CSV 다운로드에 실패했습니다.', 'error');
      }
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="rounded-2xl bg-[#0B1220] border border-white/5 shadow-sm p-5">
      <h3 className="text-sm font-semibold text-slate-300 mb-4">결과 다운로드</h3>
      
      <div className="space-y-2">
        <button
          onClick={handleDownloadCT}
          className="w-full px-4 py-2.5 bg-[#020617] hover:bg-[#1F2937] border border-white/10 text-slate-200 text-sm font-medium rounded-lg transition flex items-center justify-between group"
        >
          <span>전처리 CT 이미지</span>
          <svg className="w-4 h-4 text-slate-400 group-hover:text-[#0066CC] transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        </button>

        <button
          onClick={handleDownloadMask}
          className="w-full px-4 py-2.5 bg-[#020617] hover:bg-[#1F2937] border border-white/10 text-slate-200 text-sm font-medium rounded-lg transition flex items-center justify-between group"
        >
          <span>Segmentation Mask</span>
          <svg className="w-4 h-4 text-slate-400 group-hover:text-[#0066CC] transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        </button>

        <button
          onClick={handleDownloadEditedMask}
          className="w-full px-4 py-2.5 bg-[#020617] hover:bg-[#1F2937] border border-white/10 text-slate-200 text-sm font-medium rounded-lg transition flex items-center justify-between group"
        >
          <span>수정 후 Segmentation Mask</span>
          <svg className="w-4 h-4 text-slate-400 group-hover:text-[#0066CC] transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        </button>

        <button
          onClick={handleDownloadCSV}
          disabled={isDownloading || !volumeMetrics}
          className={`w-full px-4 py-2.5 border text-sm font-medium rounded-lg transition flex items-center justify-between group ${
            isDownloading || !volumeMetrics
              ? 'bg-[#020617]/50 border-white/5 text-slate-500 cursor-not-allowed'
              : 'bg-[#0066CC]/10 hover:bg-[#0066CC]/20 border-[#0066CC]/20 text-[#0066CC]'
          }`}
        >
          <span className="flex items-center gap-2">
            {isDownloading && (
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            )}
            간/비장 CSV 다운로드
          </span>
          <svg className={`w-4 h-4 transition ${isDownloading || !volumeMetrics ? 'text-slate-500' : 'text-[#0066CC]'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        </button>

      </div>

      <p className="mt-4 text-xs text-slate-500 text-center">
        다운로드한 파일은 로컬에 저장됩니다
      </p>

      {/* 토스트 알림 */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 px-4 py-3 rounded-lg shadow-lg z-50 flex items-center gap-2 animate-in slide-in-from-bottom-2 ${
            toast.type === 'success'
              ? 'bg-green-600 text-white'
              : 'bg-red-600 text-white'
          }`}
        >
          {toast.type === 'success' ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
          <span className="text-sm font-medium">{toast.message}</span>
        </div>
      )}
    </div>
  );
}

