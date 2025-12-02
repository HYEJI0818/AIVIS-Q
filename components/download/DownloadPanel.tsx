'use client';

export default function DownloadPanel() {
  const handleDownload = (type: string) => {
    console.log(`${type} 다운로드 요청`);
    // TODO: 실제 다운로드 API 연동
    // 예: fetch(`/api/download?type=${type}`)
  };

  return (
    <div className="rounded-2xl bg-[#0B1220] border border-white/5 shadow-sm p-5">
      <h3 className="text-sm font-semibold text-slate-300 mb-4">결과 다운로드</h3>
      
      <div className="space-y-2">
        <button
          onClick={() => handleDownload('ct')}
          className="w-full px-4 py-2.5 bg-[#020617] hover:bg-[#1F2937] border border-white/10 text-slate-200 text-sm font-medium rounded-lg transition flex items-center justify-between group"
        >
          <span>전처리 CT 이미지</span>
          <svg className="w-4 h-4 text-slate-400 group-hover:text-[#0066CC] transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        </button>

        <button
          onClick={() => handleDownload('mask')}
          className="w-full px-4 py-2.5 bg-[#020617] hover:bg-[#1F2937] border border-white/10 text-slate-200 text-sm font-medium rounded-lg transition flex items-center justify-between group"
        >
          <span>Segmentation Mask</span>
          <svg className="w-4 h-4 text-slate-400 group-hover:text-[#0066CC] transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        </button>

        <button
          onClick={() => handleDownload('csv')}
          className="w-full px-4 py-2.5 bg-[#020617] hover:bg-[#1F2937] border border-white/10 text-slate-200 text-sm font-medium rounded-lg transition flex items-center justify-between group"
        >
          <span>분석 결과 CSV</span>
          <svg className="w-4 h-4 text-slate-400 group-hover:text-[#0066CC] transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        </button>

        <button
          onClick={() => handleDownload('pdf')}
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

