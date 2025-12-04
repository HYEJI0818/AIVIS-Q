'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useCtSessionStore } from '@/store/useCtSessionStore';

export default function CtUploadPanel() {
  const { ctFile, setCtFile, progress, setProgress, resetSession } = useCtSessionStore();
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [shouldStartInference, setShouldStartInference] = useState(false);

  // 허용된 파일 확장자
  const allowedExtensions = ['.dcm', '.nii', '.nii.gz'];

  // 파일 확장자 체크
  const isValidFile = (filename: string): boolean => {
    const lowerName = filename.toLowerCase();
    console.log('🔍 파일 검증:', { filename, lowerName });
    
    // .nii.gz 먼저 체크 (더 구체적인 패턴 먼저)
    if (lowerName.endsWith('.nii.gz')) {
      console.log('✅ .nii.gz 파일 확인됨');
      return true;
    }
    // .gz로 끝나면서 .nii가 포함된 경우도 허용 (예: file.nii.gz)
    if (lowerName.endsWith('.gz') && lowerName.includes('.nii')) {
      console.log('✅ .nii 포함된 .gz 파일 확인됨');
      return true;
    }
    // .nii 파일 (압축 안 된 것)
    if (lowerName.endsWith('.nii')) {
      console.log('✅ .nii 파일 확인됨');
      return true;
    }
    // .dcm 파일
    if (lowerName.endsWith('.dcm')) {
      console.log('✅ .dcm 파일 확인됨');
      return true;
    }
    
    console.log('❌ 지원하지 않는 파일 형식');
    return false;
  };

  // 프로그레스 시뮬레이션 (각 단계 0.5초)
  const simulateProgress = useCallback((step: 'preprocessing' | 'inference' | 'postprocessing') => {
    return new Promise<void>((resolve) => {
      let current = 0;
      const interval = setInterval(() => {
        current += 10;
        setProgress({ [step]: current });
        
        if (current >= 100) {
          clearInterval(interval);
          resolve();
        }
      }, 50); // 50ms * 10회 = 500ms (0.5초)
    });
  }, [setProgress]);

  // 추론 시작 (mock simulation)
  const startInference = useCallback(async () => {
    if (!ctFile) {
      setError('먼저 파일을 업로드해주세요.');
      return;
    }

    // TODO: 실제 API 연동 필요
    console.log('추론 시작...');

    // 1단계: 전처리
    setProgress({ preprocessing: 0, inference: 0, postprocessing: 0 });
    await simulateProgress('preprocessing');

    // 2단계: nnU-Net 추론
    await simulateProgress('inference');

    // 3단계: 결과 생성
    await simulateProgress('postprocessing');

    console.log('추론 완료!');
    
    // TODO: 결과 데이터 store에 저장
  }, [ctFile, setError, setProgress, simulateProgress]);

  // 파일 업로드 시 자동으로 추론 시작
  useEffect(() => {
    if (ctFile && shouldStartInference) {
      setShouldStartInference(false);
      startInference();
    }
  }, [ctFile, shouldStartInference, startInference]);

  // 파일 처리
  const handleFile = (file: File) => {
    if (!isValidFile(file.name)) {
      setError(`지원하지 않는 파일 형식입니다. (지원: ${allowedExtensions.join(', ')})`);
      return;
    }

    // 파일 크기 체크 (경고만, 차단은 안 함)
    const fileSizeMB = file.size / 1024 / 1024;
    if (fileSizeMB > 50) {
      console.warn(`⚠️ 파일 크기가 ${fileSizeMB.toFixed(2)}MB로 큽니다. Supabase 무료 플랜은 50MB 제한이 있습니다.`);
    }

    setError('');
    setCtFile(file);
    setShouldStartInference(true);
    console.log(`✅ 파일 업로드 완료: ${file.name} (${fileSizeMB.toFixed(2)}MB)`);
  };

  // Drag & Drop 핸들러
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  // 파일 선택 핸들러
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  // 초기화
  const handleReset = () => {
    resetSession();
    setError('');
    setShouldStartInference(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    console.log('세션 초기화 완료');
  };

  // 수동 추론 시작 버튼 핸들러
  const handleManualStart = () => {
    startInference();
  };

  const isCompleted = progress.preprocessing === 100 && progress.inference === 100 && progress.postprocessing === 100;
  const isProcessing = (progress.preprocessing > 0 || progress.inference > 0 || progress.postprocessing > 0) && !isCompleted;

  return (
    <div className="rounded-2xl bg-[#0B1220] border border-white/5 shadow-sm p-5">
      {/* Drag & Drop 영역 */}
      <div
        className={`relative border-2 border-dashed rounded-xl p-8 transition ${
          dragActive
            ? 'border-[#0066CC] bg-[#0066CC]/5'
            : 'border-white/10 bg-[#020617]'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".dcm,.nii,.gz,application/gzip,application/x-gzip"
          onChange={handleFileSelect}
          className="hidden"
          id="file-upload"
        />
        
        <div className="text-center">
          <div className="mb-3">
            <svg className="mx-auto h-12 w-12 text-slate-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
              <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          
          {ctFile ? (
            <div>
              <p className="text-sm font-medium text-[#0066CC] mb-1">
                {ctFile.name}
              </p>
              <p className="text-xs text-slate-400">
                {(ctFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          ) : (
            <div>
              <p className="text-sm text-slate-300 mb-1">
                파일을 드래그하거나 클릭하여 선택
              </p>
              <p className="text-xs text-slate-400">
                DICOM (.dcm), NIfTI (.nii, .nii.gz)
              </p>
            </div>
          )}
          
          <label
            htmlFor="file-upload"
            className="mt-4 inline-block px-4 py-2 bg-[#0066CC]/10 hover:bg-[#0066CC]/20 text-[#0066CC] text-sm font-medium rounded-lg cursor-pointer transition"
          >
            파일 선택
          </label>
        </div>
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div className="mt-3 text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {/* 버튼 */}
      <div className="mt-4 flex gap-3">
        <button
          onClick={handleManualStart}
          disabled={!ctFile || isProcessing || isCompleted}
          className="flex-1 py-2.5 bg-[#0066CC] hover:bg-[#004A99] disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold rounded-lg transition disabled:cursor-not-allowed"
        >
          {isProcessing ? '추론 진행 중...' : isCompleted ? '추론 완료' : '추론 시작'}
        </button>
        
        <button
          onClick={handleReset}
          disabled={isProcessing}
          className="px-6 py-2.5 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-600 text-slate-200 font-medium rounded-lg transition disabled:cursor-not-allowed"
        >
          초기화
        </button>
      </div>

      {/* 진행 상태 */}
      <div className="mt-5 space-y-4">
        {/* 1. 파일 전처리 */}
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-slate-300 font-medium">1. 파일 전처리</span>
            <span className="text-[#0066CC] font-semibold">{progress.preprocessing}%</span>
          </div>
          <div className="h-2 bg-[#111827] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#0066CC] transition-all duration-300"
              style={{ width: `${progress.preprocessing}%` }}
            />
          </div>
        </div>

        {/* 2. nnU-Net 추론 */}
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-slate-300 font-medium">2. nnU-Net 추론</span>
            <span className="text-[#22D3EE] font-semibold">{progress.inference}%</span>
          </div>
          <div className="h-2 bg-[#111827] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#22D3EE] transition-all duration-300"
              style={{ width: `${progress.inference}%` }}
            />
          </div>
        </div>

        {/* 3. 결과 생성 */}
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-slate-300 font-medium">3. 결과 생성</span>
            <span className="text-[#10B981] font-semibold">{progress.postprocessing}%</span>
          </div>
          <div className="h-2 bg-[#111827] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#10B981] transition-all duration-300"
              style={{ width: `${progress.postprocessing}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

