'use client';

import { useState } from 'react';
import { useCtSessionStore } from '@/store/useCtSessionStore';

export default function DrawSegmentationModal() {
  const { isDrawingModalOpen, closeDrawingModal } = useCtSessionStore();
  const [activeTab, setActiveTab] = useState<'3d' | 'axial' | 'coronal' | 'sagittal'>('axial');
  const [tool, setTool] = useState<'draw' | 'erase'>('draw');
  const [brushSize, setBrushSize] = useState(5);
  const [opacity, setOpacity] = useState(40);

  if (!isDrawingModalOpen) return null;

  const handleSave = () => {
    console.log('Segmentation 수정 저장');
    // TODO: 실제 픽셀 단위 수정 데이터 저장 및 볼륨 재계산
    closeDrawingModal();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-[90vw] max-w-6xl h-[85vh] bg-[#0B1220] rounded-2xl border border-white/10 shadow-2xl flex flex-col">
        {/* 헤더 */}
        <div className="flex justify-between items-center p-6 border-b border-white/5">
          <h2 className="text-xl font-semibold text-slate-100">Segmentation 수정</h2>
          <button
            onClick={closeDrawingModal}
            className="p-2 hover:bg-white/5 rounded-lg transition"
          >
            <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 본문 */}
        <div className="flex-1 flex gap-4 p-6 overflow-hidden">
          {/* 좌측: 뷰어 */}
          <div className="flex-1 flex flex-col">
            {/* 탭 */}
            <div className="flex gap-2 mb-4">
              {(['axial', 'coronal', 'sagittal', '3d'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    activeTab === tab
                      ? 'bg-[#0066CC] text-white'
                      : 'bg-[#020617] text-slate-400 hover:bg-[#1F2937]'
                  }`}
                >
                  {tab.toUpperCase()}
                </button>
              ))}
            </div>

            {/* 뷰어 캔버스 */}
            <div className="flex-1 bg-black rounded-xl border border-white/10 flex items-center justify-center">
              {/* TODO: 실제 Niivue 또는 draw 캔버스 */}
              <div className="text-center">
                <svg className="mx-auto h-16 w-16 text-slate-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                <p className="text-sm text-slate-400">Draw/Erase 뷰어 ({activeTab.toUpperCase()})</p>
                <p className="text-xs text-slate-600 mt-2">TODO: Niivue에 draw 기능 연동</p>
              </div>
            </div>
          </div>

          {/* 우측: 컨트롤 */}
          <div className="w-80 bg-[#020617] rounded-xl border border-white/5 p-5 space-y-5">
            {/* 툴 선택 */}
            <div>
              <h3 className="text-sm font-medium text-slate-300 mb-3">툴 선택</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => setTool('draw')}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition ${
                    tool === 'draw'
                      ? 'bg-[#0066CC] text-white'
                      : 'bg-[#0B1220] text-slate-400 border border-white/10 hover:bg-[#1F2937]'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                    <span>그리기</span>
                  </div>
                </button>
                <button
                  onClick={() => setTool('erase')}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition ${
                    tool === 'erase'
                      ? 'bg-[#0066CC] text-white'
                      : 'bg-[#0B1220] text-slate-400 border border-white/10 hover:bg-[#1F2937]'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    <span>지우기</span>
                  </div>
                </button>
              </div>
            </div>

            {/* 브러시 크기 */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-medium text-slate-300">브러시 크기</label>
                <span className="text-sm text-[#0066CC]">{brushSize}</span>
              </div>
              <input
                type="range"
                min="1"
                max="20"
                value={brushSize}
                onChange={(e) => setBrushSize(parseInt(e.target.value))}
                className="w-full h-2 bg-[#1F2937] rounded-full appearance-none cursor-pointer
                  [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 
                  [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#0066CC]
                  [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full 
                  [&::-moz-range-thumb]:bg-[#0066CC] [&::-moz-range-thumb]:border-0"
              />
            </div>

            {/* 투명도 */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-medium text-slate-300">투명도</label>
                <span className="text-sm text-[#22D3EE]">{opacity}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={opacity}
                onChange={(e) => setOpacity(parseInt(e.target.value))}
                className="w-full h-2 bg-[#1F2937] rounded-full appearance-none cursor-pointer
                  [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 
                  [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#0066CC]
                  [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full 
                  [&::-moz-range-thumb]:bg-[#0066CC] [&::-moz-range-thumb]:border-0"
              />
            </div>

            {/* 레전드 */}
            <div className="pt-3 border-t border-white/10">
              <p className="text-xs font-medium text-slate-400 mb-2">Segmentation 색상</p>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#22C55E]" />
                  <span className="text-xs text-slate-300">간 (Liver)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#EF4444]" />
                  <span className="text-xs text-slate-300">비장 (Spleen)</span>
                </div>
              </div>
            </div>

            {/* 저장 버튼 */}
            <div className="pt-4 border-t border-white/10">
              <button
                onClick={handleSave}
                className="w-full py-3 bg-[#0066CC] hover:bg-[#004A99] text-white font-semibold rounded-lg transition"
              >
                저장
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

