'use client';

import { useCtSessionStore } from '@/store/useCtSessionStore';

export default function ViewControls() {
  const { brightness, contrast, opacity, setViewControls } = useCtSessionStore();

  return (
    <div className="rounded-2xl bg-[#0B1220] border border-white/5 shadow-sm p-5">
      <h2 className="text-lg font-semibold mb-4">뷰 컨트롤</h2>

      <div className="space-y-5">
        {/* Brightness 슬라이더 */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm font-medium text-slate-300">
              밝기 (Brightness)
            </label>
            <span className="text-sm text-[#0066CC] font-medium">
              {brightness}
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={brightness}
            onChange={(e) => setViewControls({ brightness: parseInt(e.target.value) })}
            className="w-full h-2 bg-[#1F2937] rounded-full appearance-none cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 
              [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#0066CC]
              [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full 
              [&::-moz-range-thumb]:bg-[#0066CC] [&::-moz-range-thumb]:border-0"
          />
          <div className="flex justify-between mt-1">
            <span className="text-xs text-slate-500">어둡게</span>
            <span className="text-xs text-slate-500">밝게</span>
          </div>
        </div>

        {/* Contrast 슬라이더 */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm font-medium text-slate-300">
              대비 (Contrast)
            </label>
            <span className="text-sm text-[#0066CC] font-medium">
              {contrast}
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={contrast}
            onChange={(e) => setViewControls({ contrast: parseInt(e.target.value) })}
            className="w-full h-2 bg-[#1F2937] rounded-full appearance-none cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 
              [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#0066CC]
              [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full 
              [&::-moz-range-thumb]:bg-[#0066CC] [&::-moz-range-thumb]:border-0"
          />
          <div className="flex justify-between mt-1">
            <span className="text-xs text-slate-500">낮음</span>
            <span className="text-xs text-slate-500">높음</span>
          </div>
        </div>

        {/* Opacity 슬라이더 */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm font-medium text-slate-300">
              마스크 투명도 (Opacity)
            </label>
            <span className="text-sm text-[#0066CC] font-medium">
              {opacity}%
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={opacity}
            onChange={(e) => setViewControls({ opacity: parseInt(e.target.value) })}
            className="w-full h-2 bg-[#1F2937] rounded-full appearance-none cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 
              [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#0066CC]
              [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full 
              [&::-moz-range-thumb]:bg-[#0066CC] [&::-moz-range-thumb]:border-0"
          />
          <div className="flex justify-between mt-1">
            <span className="text-xs text-slate-500">투명</span>
            <span className="text-xs text-slate-500">불투명</span>
          </div>
        </div>

        {/* 레전드 */}
        <div className="pt-3 border-t border-white/5">
          <p className="text-xs font-medium text-slate-400 mb-2">Segmentation 색상</p>
          <div className="flex gap-4">
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
      </div>
    </div>
  );
}

