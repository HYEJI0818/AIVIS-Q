import React from 'react';

interface AppLayoutProps {
  left: React.ReactNode;
  right: React.ReactNode;
}

export default function AppLayout({ left, right }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 flex flex-col">
      {/* 헤더 */}
      <header className="h-14 border-b border-white/5 bg-[#030712] px-6 flex items-center justify-between">
        {/* 좌측: 서비스명 */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#0066CC]/20 flex items-center justify-center">
            <span className="text-[#0066CC] font-bold text-lg">A</span>
          </div>
          <h1 className="text-lg font-semibold">AIVIS-Q Abdomen CT</h1>
        </div>
        
        {/* 우측: 병원명 / 계정 */}
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-400">서울대학교병원</span>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center">
              <span className="text-xs font-medium">관리자</span>
            </div>
          </div>
        </div>
      </header>

      {/* 메인 영역 */}
      <main className="flex-1 flex gap-4 px-6 py-4 min-h-0">
        {/* 좌측 컬럼: 메인 워크스페이스 */}
        <section className="flex-1 flex flex-col gap-4 min-w-0 min-h-0">
          {left}
        </section>

        {/* 우측 컬럼: 사이드패널 */}
        <aside className="w-[320px] shrink-0 flex flex-col gap-4 overflow-y-auto">
          {right}
        </aside>
      </main>
    </div>
  );
}

