'use client';

import SingleCtView from './SingleCtView';

export default function MultiViewCtViewer() {
  return (
    <div className="flex-1 rounded-2xl bg-[#0B1220] border border-white/5 shadow-sm p-4 min-h-0">
      <h2 className="text-lg font-semibold mb-4">CT 뷰어 (4분할)</h2>
      
      {/* 2x2 그리드 */}
      <div className="grid grid-cols-2 gap-4" style={{ height: 'calc(100% - 3rem)' }}>
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

        {/* 3D View */}
        <SingleCtView
          id="3d"
          title="3D View"
          orientation="3d"
        />
      </div>
    </div>
  );
}

