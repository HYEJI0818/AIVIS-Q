'use client';

import { useCtSessionStore } from '@/store/useCtSessionStore';

export default function VolumeMetricsCard() {
  const { volumeMetrics } = useCtSessionStore();

  if (!volumeMetrics) {
    return (
      <div className="rounded-2xl bg-[#0B1220] border border-white/5 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-slate-300 mb-3">볼륨 분석 결과</h3>
        <div className="text-center py-8">
          <svg className="mx-auto h-10 w-10 text-slate-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <p className="text-sm text-slate-500">분석 결과가 없습니다</p>
        </div>
      </div>
    );
  }

  // Δ값 계산 헬퍼
  const calculateDelta = (estimated: number | null, edited: number | null): string => {
    if (estimated === null || edited === null) return '-';
    const delta = edited - estimated;
    const sign = delta >= 0 ? '+' : '';
    return `${sign}${delta.toFixed(1)}`;
  };

  return (
    <div className="rounded-2xl bg-[#0B1220] border border-white/5 shadow-sm p-5">
      <h3 className="text-sm font-semibold text-slate-300 mb-4">볼륨 분석 결과</h3>

      {/* AI 추정값 */}
      <div className="mb-4">
        <h4 className="text-xs font-medium text-slate-400 mb-2">AI 추정값</h4>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#22C55E]" />
              <span className="text-sm text-slate-300">간 볼륨</span>
            </div>
            <span className="text-sm font-medium text-slate-100">
              {volumeMetrics.liverVolumeEstimated !== null
                ? `${volumeMetrics.liverVolumeEstimated.toFixed(1)} cc`
                : '-'}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#EF4444]" />
              <span className="text-sm text-slate-300">비장 볼륨</span>
            </div>
            <span className="text-sm font-medium text-slate-100">
              {volumeMetrics.spleenVolumeEstimated !== null
                ? `${volumeMetrics.spleenVolumeEstimated.toFixed(1)} cc`
                : '-'}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-300">간/비장 비율 (LSVR)</span>
            <span className="text-sm font-medium text-slate-100">
              {volumeMetrics.ratioEstimated !== null
                ? volumeMetrics.ratioEstimated.toFixed(2)
                : '-'}
            </span>
          </div>
        </div>
      </div>

      {/* 수정값 */}
      {(volumeMetrics.liverVolumeEdited !== null || volumeMetrics.spleenVolumeEdited !== null) && (
        <div className="pt-4 border-t border-white/5">
          <h4 className="text-xs font-medium text-slate-400 mb-2">수정값</h4>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#22C55E]" />
                <span className="text-sm text-slate-300">간 볼륨</span>
              </div>
              <div className="text-right">
                <span className="text-sm font-medium text-slate-100">
                  {volumeMetrics.liverVolumeEdited !== null
                    ? `${volumeMetrics.liverVolumeEdited.toFixed(1)} cc`
                    : '-'}
                </span>
                <span className="text-xs text-[#0066CC] ml-2">
                  {calculateDelta(volumeMetrics.liverVolumeEstimated, volumeMetrics.liverVolumeEdited)}
                </span>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#EF4444]" />
                <span className="text-sm text-slate-300">비장 볼륨</span>
              </div>
              <div className="text-right">
                <span className="text-sm font-medium text-slate-100">
                  {volumeMetrics.spleenVolumeEdited !== null
                    ? `${volumeMetrics.spleenVolumeEdited.toFixed(1)} cc`
                    : '-'}
                </span>
                <span className="text-xs text-[#0066CC] ml-2">
                  {calculateDelta(volumeMetrics.spleenVolumeEstimated, volumeMetrics.spleenVolumeEdited)}
                </span>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-300">간/비장 비율 (LSVR)</span>
              <div className="text-right">
                <span className="text-sm font-medium text-slate-100">
                  {volumeMetrics.ratioEdited !== null
                    ? volumeMetrics.ratioEdited.toFixed(2)
                    : '-'}
                </span>
                <span className="text-xs text-[#0066CC] ml-2">
                  {calculateDelta(volumeMetrics.ratioEstimated, volumeMetrics.ratioEdited)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 추가 액션 버튼 */}
      <div className="mt-4 pt-4 border-t border-white/5 flex gap-2">
        <button
          onClick={() => {
            const { openDrawingModal } = useCtSessionStore.getState();
            openDrawingModal();
          }}
          className="flex-1 px-3 py-2 bg-[#0066CC]/10 hover:bg-[#0066CC]/20 text-[#0066CC] text-xs font-medium rounded-lg transition"
        >
          수정하기
        </button>
        <button
          onClick={() => {
            const { openComparisonModal } = useCtSessionStore.getState();
            openComparisonModal();
          }}
          className="flex-1 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-medium rounded-lg transition"
        >
          비교하기
        </button>
      </div>
    </div>
  );
}

