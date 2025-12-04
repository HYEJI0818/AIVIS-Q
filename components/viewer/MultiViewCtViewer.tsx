'use client';

import SingleCtView from './SingleCtView';

export default function MultiViewCtViewer() {
  return (
    <div className="flex-1 rounded-2xl bg-[#0B1220] border border-white/5 shadow-sm p-4 min-h-0 overflow-hidden">
      {/* 2x2 그리드 */}
      <div className="grid grid-cols-2 gap-4 h-full" style={{ gridTemplateRows: '1fr 1fr' }}>
        {/* 3D View */}
        <SingleCtView
          id="3d"
          title="3D View"
          orientation="3d"
        />

        {/* Axial */}
        <SingleCtView
          id="axial"
          title="Axial"
          orientation="axial"
        />

        {/* Coronal */}
        <SingleCtView
          id="coronal"
          title="Coronal"
          orientation="coronal"
        />

        {/* Sagittal */}
        <SingleCtView
          id="sagittal"
          title="Sagittal"
          orientation="sagittal"
        />
      </div>
    </div>
  );
}

