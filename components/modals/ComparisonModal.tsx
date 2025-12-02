'use client';

import { useCtSessionStore } from '@/store/useCtSessionStore';

export default function ComparisonModal() {
  const { isComparisonModalOpen, closeComparisonModal } = useCtSessionStore();

  if (!isComparisonModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-[90vw] max-w-5xl h-[80vh] bg-[#0B1220] rounded-2xl border border-white/10 shadow-2xl flex flex-col">
        {/* 헤더 */}
        <div className="flex justify-between items-center p-6 border-b border-white/5">
          <h2 className="text-xl font-semibold text-slate-100">Segmentation 비교</h2>
          <button
            onClick={closeComparisonModal}
            className="p-2 hover:bg-white/5 rounded-lg transition"
          >
            <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 본문: 좌우 비교 */}
        <div className="flex-1 flex gap-4 p-6">
          {/* 좌측: 원본 */}
          <div className="flex-1 flex flex-col">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-300">원본 (AI 추정)</h3>
              <span className="text-xs text-slate-500">Original</span>
            </div>
            <div className="flex-1 bg-black rounded-xl border border-white/10 flex items-center justify-center">
              {/* TODO: 원본 segmentation 표시 */}
              <div className="text-center">
                <svg className="mx-auto h-16 w-16 text-slate-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-sm text-slate-400">원본 Segmentation</p>
                <p className="text-xs text-slate-600 mt-1">TODO: Niivue 뷰어 연동</p>
              </div>
            </div>
          </div>

          {/* 중앙: 구분선 */}
          <div className="w-px bg-white/10" />

          {/* 우측: 수정본 */}
          <div className="flex-1 flex flex-col">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-300">수정본 (사용자 수정)</h3>
              <span className="text-xs text-slate-500">Edited</span>
            </div>
            <div className="flex-1 bg-black rounded-xl border border-white/10 flex items-center justify-center">
              {/* TODO: 수정된 segmentation 표시 */}
              <div className="text-center">
                <svg className="mx-auto h-16 w-16 text-slate-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                <p className="text-sm text-slate-400">수정된 Segmentation</p>
                <p className="text-xs text-slate-600 mt-1">TODO: Niivue 뷰어 연동</p>
              </div>
            </div>
          </div>
        </div>

        {/* 하단: 차이값 요약 */}
        <div className="p-6 border-t border-white/5">
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-[#020617] rounded-lg p-4 text-center">
              <p className="text-xs text-slate-400 mb-1">간 볼륨 차이</p>
              <p className="text-lg font-semibold text-[#0066CC]">+5.2 cc</p>
            </div>
            <div className="bg-[#020617] rounded-lg p-4 text-center">
              <p className="text-xs text-slate-400 mb-1">비장 볼륨 차이</p>
              <p className="text-lg font-semibold text-[#22D3EE]">-2.1 cc</p>
            </div>
            <div className="bg-[#020617] rounded-lg p-4 text-center">
              <p className="text-xs text-slate-400 mb-1">LSVR 차이</p>
              <p className="text-lg font-semibold text-[#22D3EE]">+0.15</p>
            </div>
          </div>
          <p className="text-xs text-slate-500 text-center mt-3">
            TODO: 실제 계산된 차이값 표시
          </p>
        </div>
      </div>
    </div>
  );
}

