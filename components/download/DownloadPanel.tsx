'use client';

import * as nifti from 'nifti-reader-js';
import { useCtSessionStore } from '@/store/useCtSessionStore';

export default function DownloadPanel() {
  const { ctFile, maskFiles, editedMaskData } = useCtSessionStore();
  const hasEditedMask = !!editedMaskData;

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

  // CSV 다운로드 (TODO: 실제 구현 필요)
  const handleDownloadCSV = () => {
    console.log('CSV 다운로드 요청');
    alert('CSV 다운로드 기능은 준비 중입니다.');
  };

  // PDF 다운로드 (TODO: 실제 구현 필요)
  const handleDownloadPDF = () => {
    console.log('PDF 다운로드 요청');
    alert('PDF 다운로드 기능은 준비 중입니다.');
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
          className="w-full px-4 py-2.5 bg-[#020617] hover:bg-[#1F2937] border border-white/10 text-slate-200 text-sm font-medium rounded-lg transition flex items-center justify-between group"
        >
          <span>분석 결과 CSV</span>
          <svg className="w-4 h-4 text-slate-400 group-hover:text-[#0066CC] transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        </button>

        <button
          onClick={handleDownloadPDF}
          className="w-full px-4 py-2.5 bg-[#0066CC]/10 hover:bg-[#0066CC]/20 border border-[#0066CC]/20 text-[#0066CC] text-sm font-semibold rounded-lg transition flex items-center justify-between"
        >
          <span>PDF 리포트</span>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        </button>
      </div>

      <p className="mt-4 text-xs text-slate-500 text-center">
        다운로드한 파일은 로컬에 저장됩니다
      </p>
    </div>
  );
}

