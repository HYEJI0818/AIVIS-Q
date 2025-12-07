'use client';

import { useCtSessionStore } from '@/store/useCtSessionStore';

export default function VolumeMetricsCard() {
  const { volumeMetrics, maskViewMode, editedMaskData, setMaskViewMode } = useCtSessionStore();

  // 추정 칸 클릭 → 원본 마스크 보기
  const handleOriginalClick = () => {
    setMaskViewMode('original');
  };

  // 수정 칸 클릭 → 수정된 마스크 보기
  const handleEditedClick = () => {
    if (editedMaskData) {
      setMaskViewMode('edited');
    }
  };

  const isOriginalActive = maskViewMode === 'original';
  const isEditedActive = maskViewMode === 'edited';
  const hasEditedMask = !!editedMaskData;

  if (!volumeMetrics) {
    return (
      <div className="rounded-2xl bg-[#0B1220] border border-white/5 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-slate-300 mb-3">Volume analysis result</h3>
        <div className="text-center py-8">
          <svg className="mx-auto h-10 w-10 text-slate-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <p className="text-sm text-slate-500">분석 결과가 없습니다</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-[#0B1220] border border-white/5 shadow-sm p-5">
      <h3 className="text-sm font-semibold text-slate-300 mb-4">Volume analysis result</h3>

      {/* 2열 그리드: 왼쪽 추정, 오른쪽 수정 */}
      <div className="space-y-3">
        {/* 간 볼륨 */}
        <div className="grid grid-cols-2 gap-2">
          {/* 간 볼륨(추정) */}
          <button
            onClick={handleOriginalClick}
            className={`bg-white/5 rounded-lg p-3 text-left transition-all ${
              isOriginalActive 
                ? 'ring-2 ring-[#0066CC] ring-offset-1 ring-offset-[#0B1220]' 
                : 'hover:bg-white/10'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full bg-[#22C55E]" />
              <span className="text-xs font-medium text-slate-400">간 볼륨(추정)</span>
            </div>
            <span className="text-sm font-medium text-slate-100">
              {volumeMetrics.liverVolumeEstimated !== null
                ? `${volumeMetrics.liverVolumeEstimated.toFixed(1)} cc`
                : '-'}
            </span>
          </button>

          {/* 간 볼륨(수정) */}
          <button
            onClick={handleEditedClick}
            disabled={!hasEditedMask}
            className={`bg-white/5 rounded-lg p-3 text-left transition-all ${
              isEditedActive 
                ? 'ring-2 ring-[#22C55E] ring-offset-1 ring-offset-[#0B1220]' 
                : hasEditedMask 
                  ? 'hover:bg-white/10 cursor-pointer' 
                  : 'opacity-50 cursor-not-allowed'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full bg-[#22C55E]" />
              <span className="text-xs font-medium text-slate-400">간 볼륨(수정)</span>
              {hasEditedMask && <span className="text-[10px] text-[#22C55E]">✓</span>}
            </div>
            <span className="text-sm font-medium text-slate-100">
              {volumeMetrics.liverVolumeEdited !== null
                ? `${volumeMetrics.liverVolumeEdited.toFixed(1)} cc`
                : '-'}
            </span>
          </button>
        </div>

        {/* 비장 볼륨 */}
        <div className="grid grid-cols-2 gap-2">
          {/* 비장 볼륨(추정) */}
          <button
            onClick={handleOriginalClick}
            className={`bg-white/5 rounded-lg p-3 text-left transition-all ${
              isOriginalActive 
                ? 'ring-2 ring-[#0066CC] ring-offset-1 ring-offset-[#0B1220]' 
                : 'hover:bg-white/10'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full bg-[#EF4444]" />
              <span className="text-xs font-medium text-slate-400">비장 볼륨(추정)</span>
            </div>
            <span className="text-sm font-medium text-slate-100">
              {volumeMetrics.spleenVolumeEstimated !== null
                ? `${volumeMetrics.spleenVolumeEstimated.toFixed(1)} cc`
                : '-'}
            </span>
          </button>

          {/* 비장 볼륨(수정) */}
          <button
            onClick={handleEditedClick}
            disabled={!hasEditedMask}
            className={`bg-white/5 rounded-lg p-3 text-left transition-all ${
              isEditedActive 
                ? 'ring-2 ring-[#22C55E] ring-offset-1 ring-offset-[#0B1220]' 
                : hasEditedMask 
                  ? 'hover:bg-white/10 cursor-pointer' 
                  : 'opacity-50 cursor-not-allowed'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full bg-[#EF4444]" />
              <span className="text-xs font-medium text-slate-400">비장 볼륨(수정)</span>
              {hasEditedMask && <span className="text-[10px] text-[#22C55E]">✓</span>}
            </div>
            <span className="text-sm font-medium text-slate-100">
              {volumeMetrics.spleenVolumeEdited !== null
                ? `${volumeMetrics.spleenVolumeEdited.toFixed(1)} cc`
                : '-'}
            </span>
          </button>
        </div>

        {/* 간/비장 비율 */}
        <div className="grid grid-cols-2 gap-2">
          {/* 간/비장 비율(추정) */}
          <button
            onClick={handleOriginalClick}
            className={`bg-white/5 rounded-lg p-3 text-left transition-all ${
              isOriginalActive 
                ? 'ring-2 ring-[#0066CC] ring-offset-1 ring-offset-[#0B1220]' 
                : 'hover:bg-white/10'
            }`}
          >
            <span className="text-xs font-medium text-slate-400 block mb-1">간/비장 비율(추정)</span>
            <span className="text-sm font-medium text-slate-100">
              {volumeMetrics.ratioEstimated !== null
                ? volumeMetrics.ratioEstimated.toFixed(2)
                : '-'}
            </span>
          </button>

          {/* 간/비장 비율(수정) */}
          <button
            onClick={handleEditedClick}
            disabled={!hasEditedMask}
            className={`bg-white/5 rounded-lg p-3 text-left transition-all ${
              isEditedActive 
                ? 'ring-2 ring-[#22C55E] ring-offset-1 ring-offset-[#0B1220]' 
                : hasEditedMask 
                  ? 'hover:bg-white/10 cursor-pointer' 
                  : 'opacity-50 cursor-not-allowed'
            }`}
          >
            <span className="text-xs font-medium text-slate-400 block mb-1">간/비장 비율(수정)</span>
            <span className="text-sm font-medium text-slate-100">
              {volumeMetrics.ratioEdited !== null
                ? volumeMetrics.ratioEdited.toFixed(2)
                : '-'}
            </span>
          </button>
        </div>
      </div>

      {/* 추가 액션 버튼 */}
      <div className="mt-4 pt-4 border-t border-white/5">
        <button
          onClick={() => {
            const { openComparisonModal } = useCtSessionStore.getState();
            openComparisonModal();
          }}
          className="w-full px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-medium rounded-lg transition"
        >
          비교하기
        </button>
      </div>
    </div>
  );
}

