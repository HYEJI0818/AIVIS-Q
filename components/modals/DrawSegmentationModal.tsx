'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Niivue } from '@niivue/niivue';
import { useCtSessionStore } from '@/store/useCtSessionStore';

// ============================================
// 마스크 편집용 레이블
// ============================================
const MASK_LABELS = [
  { id: 1, name: '간 (Liver)', color: '#FF4444', shortName: '간' },
  { id: 2, name: '비장 (Spleen)', color: '#44FF44', shortName: '비장' },
  { id: 3, name: '좌신장 (L.Kidney)', color: '#4444FF', shortName: '좌신장' },
  { id: 4, name: '우신장 (R.Kidney)', color: '#FFFF44', shortName: '우신장' },
];

// Niivue용 커스텀 Drawing 컬러맵
const MASK_DRAW_COLORMAP = {
  R: [0, 255, 68, 68, 255],
  G: [0, 68, 255, 68, 255],
  B: [0, 68, 68, 255, 68],
  labels: ["Background", "Liver", "Spleen", "L.Kidney", "R.Kidney"]
};

export default function DrawSegmentationModal() {
  const { isDrawingModalOpen, closeDrawingModal, ctFile, maskFiles } = useCtSessionStore();
  
  // ============================================
  // 상태
  // ============================================
  const [viewTab, setViewTab] = useState<'axial' | 'coronal' | 'sagittal'>('axial');
  const [sliceIndex, setSliceIndex] = useState(50);
  const [maxSlice, setMaxSlice] = useState(100);
  const [isLoading, setIsLoading] = useState(false);
  const [isNiivueReady, setIsNiivueReady] = useState(false);
  
  // 마스크 편집 상태
  const [maskTool, setMaskTool] = useState<'draw' | 'erase'>('erase');
  const [selectedLabel, setSelectedLabel] = useState(1);
  const [drawOpacity, setDrawOpacity] = useState(80);
  const [isMaskLoaded, setIsMaskLoaded] = useState(false);
  const [maskBrushSize, setMaskBrushSize] = useState(5);
  
  // ============================================
  // Refs
  // ============================================
  const niivueCanvasRef = useRef<HTMLCanvasElement>(null);
  const nvRef = useRef<Niivue | null>(null);
  const maskUrlRef = useRef<string | null>(null);
  const ctUrlRef = useRef<string | null>(null);
  const volumeDimsRef = useRef<number[]>([0, 0, 0, 0]);
  const currentVoxelRef = useRef<number[]>([0, 0, 0]);

  // ============================================
  // Niivue 초기화
  // ============================================
  useEffect(() => {
    if (!niivueCanvasRef.current || !isDrawingModalOpen) return;
    if (nvRef.current) return;

    const initNiivue = async () => {
      try {
        const nv = new Niivue({
          backColor: [0, 0, 0, 1],
          dragAndDropEnabled: false,
          show3Dcrosshair: true,
          isColorbar: false,
        });

        // 마우스 위치 변경 시 voxel 좌표 업데이트
        nv.onLocationChange = (location: any) => {
          if (location && location.vox) {
            currentVoxelRef.current = [
              Math.round(location.vox[0]),
              Math.round(location.vox[1]),
              Math.round(location.vox[2])
            ];
          }
        };

        await nv.attachToCanvas(niivueCanvasRef.current!);
        nvRef.current = nv;
        setIsNiivueReady(true);

        console.log('Niivue 초기화 완료');
      } catch (error) {
        console.error('Niivue 초기화 실패:', error);
      }
    };

    initNiivue();

    return () => {
      if (maskUrlRef.current) {
        URL.revokeObjectURL(maskUrlRef.current);
        maskUrlRef.current = null;
      }
      if (ctUrlRef.current) {
        URL.revokeObjectURL(ctUrlRef.current);
        ctUrlRef.current = null;
      }
      nvRef.current = null;
      setIsNiivueReady(false);
    };
  }, [isDrawingModalOpen]);

  // ============================================
  // 뷰 방향 변경
  // ============================================
  useEffect(() => {
    if (!nvRef.current || !isNiivueReady) return;
    
    const nv = nvRef.current;
    
    if (viewTab === 'axial') {
      nv.setSliceType(nv.sliceTypeAxial);
    } else if (viewTab === 'coronal') {
      nv.setSliceType(nv.sliceTypeCoronal);
    } else if (viewTab === 'sagittal') {
      nv.setSliceType(nv.sliceTypeSagittal);
    }
    
    // 슬라이스 범위 업데이트
    if (nv.volumes.length > 0) {
      const volume = nv.volumes[0];
      const dims = volume.dims;
      if (dims && dims.length >= 4) {
        volumeDimsRef.current = dims;
        if (viewTab === 'axial') {
          setMaxSlice(dims[3] - 1);
          setSliceIndex(Math.floor(dims[3] / 2));
        } else if (viewTab === 'coronal') {
          setMaxSlice(dims[2] - 1);
          setSliceIndex(Math.floor(dims[2] / 2));
        } else if (viewTab === 'sagittal') {
          setMaxSlice(dims[1] - 1);
          setSliceIndex(Math.floor(dims[1] / 2));
        }
      }
    }
  }, [viewTab, isNiivueReady]);

  // ============================================
  // CT 및 마스크 파일 로드
  // ============================================
  useEffect(() => {
    if (!nvRef.current || !ctFile || !isDrawingModalOpen || !isNiivueReady) return;

    const loadFiles = async () => {
      setIsLoading(true);
      setIsMaskLoaded(false);
      try {
        const nv = nvRef.current!;

        // 기존 볼륨 제거
        while (nv.volumes.length > 0) {
          nv.removeVolume(nv.volumes[0]);
        }

        // URL 정리
        if (ctUrlRef.current) {
          URL.revokeObjectURL(ctUrlRef.current);
        }
        ctUrlRef.current = URL.createObjectURL(ctFile);

        // CT 볼륨 로드
        await nv.loadVolumes([{
          url: ctUrlRef.current,
          name: ctFile.name
        }]);

        // Drawing 활성화
        nv.setDrawingEnabled(true);
        nv.setDrawOpacity(drawOpacity / 100);
        // @ts-expect-error - Niivue setDrawColormap accepts object but typed as string
        nv.setDrawColormap(MASK_DRAW_COLORMAP);

        // 마스크를 drawing 레이어로 로드
        if (maskFiles && maskFiles.length > 0) {
          if (maskUrlRef.current) {
            URL.revokeObjectURL(maskUrlRef.current);
          }
          maskUrlRef.current = URL.createObjectURL(maskFiles[0]);
          
          try {
            await nv.loadDrawingFromUrl(maskUrlRef.current);
            setIsMaskLoaded(true);
            console.log('마스크 로드 완료');
            
            if (nv.volumes.length > 0 && nv.volumes[0].dims) {
              volumeDimsRef.current = nv.volumes[0].dims;
            }
          } catch (error) {
            console.error('마스크 로드 실패:', error);
          }
        }

        // 뷰 방향 설정
        if (viewTab === 'axial') {
          nv.setSliceType(nv.sliceTypeAxial);
        } else if (viewTab === 'coronal') {
          nv.setSliceType(nv.sliceTypeCoronal);
        } else if (viewTab === 'sagittal') {
          nv.setSliceType(nv.sliceTypeSagittal);
        }

        // 슬라이스 범위 업데이트
        const volumes = nv.volumes;
        if (volumes.length > 0) {
          const volume = volumes[0];
          const dims = volume.dims;
          if (dims && dims.length >= 4) {
            volumeDimsRef.current = dims;
            if (viewTab === 'axial') {
              setMaxSlice(dims[3] - 1);
              setSliceIndex(Math.floor(dims[3] / 2));
            } else if (viewTab === 'coronal') {
              setMaxSlice(dims[2] - 1);
              setSliceIndex(Math.floor(dims[2] / 2));
            } else if (viewTab === 'sagittal') {
              setMaxSlice(dims[1] - 1);
              setSliceIndex(Math.floor(dims[1] / 2));
            }
          }
        }

        console.log('파일 로드 완료');
      } catch (error) {
        console.error('파일 로드 실패:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadFiles();
  }, [ctFile, maskFiles, isDrawingModalOpen, isNiivueReady, drawOpacity, viewTab]);

  // ============================================
  // 투명도 변경
  // ============================================
  useEffect(() => {
    if (!nvRef.current || !isNiivueReady) return;
    nvRef.current.setDrawOpacity(drawOpacity / 100);
  }, [drawOpacity, isNiivueReady]);

  // ============================================
  // 3D 관통 그리기/지우기 함수
  // ============================================
  const draw3DPenetrate = useCallback(() => {
    if (!nvRef.current || !nvRef.current.drawBitmap) return;
    
    const nv = nvRef.current;
    const drawBitmap = nv.drawBitmap;
    if (!drawBitmap) return;
    
    const dims = volumeDimsRef.current;
    
    if (!dims || dims.length < 4) return;
    
    const voxel = currentVoxelRef.current;
    if (!voxel) return;
    
    const dimX = dims[1];
    const dimY = dims[2];
    const dimZ = dims[3];
    
    const brushRadius = maskBrushSize;
    const penValue = maskTool === 'erase' ? 0 : selectedLabel;
    
    // 뷰에 따라 3D 관통 적용
    if (viewTab === 'axial') {
      const centerX = voxel[0];
      const centerY = voxel[1];
      
      for (let dx = -brushRadius; dx <= brushRadius; dx++) {
        for (let dy = -brushRadius; dy <= brushRadius; dy++) {
          if (dx * dx + dy * dy > brushRadius * brushRadius) continue;
          
          const vx = centerX + dx;
          const vy = centerY + dy;
          
          if (vx < 0 || vx >= dimX || vy < 0 || vy >= dimY) continue;
          
          for (let z = 0; z < dimZ; z++) {
            const idx = vx + vy * dimX + z * dimX * dimY;
            if (idx >= 0 && idx < drawBitmap.length) {
              drawBitmap[idx] = penValue;
            }
          }
        }
      }
    } else if (viewTab === 'coronal') {
      const centerX = voxel[0];
      const centerZ = voxel[2];
      
      for (let dx = -brushRadius; dx <= brushRadius; dx++) {
        for (let dz = -brushRadius; dz <= brushRadius; dz++) {
          if (dx * dx + dz * dz > brushRadius * brushRadius) continue;
          
          const vx = centerX + dx;
          const vz = centerZ + dz;
          
          if (vx < 0 || vx >= dimX || vz < 0 || vz >= dimZ) continue;
          
          for (let y = 0; y < dimY; y++) {
            const idx = vx + y * dimX + vz * dimX * dimY;
            if (idx >= 0 && idx < drawBitmap.length) {
              drawBitmap[idx] = penValue;
            }
          }
        }
      }
    } else if (viewTab === 'sagittal') {
      const centerY = voxel[1];
      const centerZ = voxel[2];
      
      for (let dy = -brushRadius; dy <= brushRadius; dy++) {
        for (let dz = -brushRadius; dz <= brushRadius; dz++) {
          if (dy * dy + dz * dz > brushRadius * brushRadius) continue;
          
          const vy = centerY + dy;
          const vz = centerZ + dz;
          
          if (vy < 0 || vy >= dimY || vz < 0 || vz >= dimZ) continue;
          
          for (let x = 0; x < dimX; x++) {
            const idx = x + vy * dimX + vz * dimX * dimY;
            if (idx >= 0 && idx < drawBitmap.length) {
              drawBitmap[idx] = penValue;
            }
          }
        }
      }
    }
    
    nv.refreshDrawing();
  }, [viewTab, maskTool, selectedLabel, maskBrushSize]);

  // ============================================
  // 마우스 이벤트 (Niivue 캔버스에 직접 연결)
  // ============================================
  useEffect(() => {
    if (!niivueCanvasRef.current || !isDrawingModalOpen) return;
    
    const canvas = niivueCanvasRef.current;
    let isDrawingLocal = false;
    
    const handleMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      isDrawingLocal = true;
      setTimeout(() => {
        if (isDrawingLocal) draw3DPenetrate();
      }, 10);
    };
    
    const handleMouseMove = () => {
      if (!isDrawingLocal) return;
      draw3DPenetrate();
    };
    
    const handleMouseUp = () => {
      isDrawingLocal = false;
    };
    
    const handleMouseLeave = () => {
      isDrawingLocal = false;
    };
    
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('mouseleave', handleMouseLeave);
    
    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [isDrawingModalOpen, draw3DPenetrate]);

  // ============================================
  // 슬라이스 변경
  // ============================================
  const handleSliceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSlice = parseInt(e.target.value);
    setSliceIndex(newSlice);

    if (nvRef.current && nvRef.current.volumes.length > 0) {
      const nv = nvRef.current;
      const scene = nv.scene;
      
      if (viewTab === 'axial') {
        scene.crosshairPos[2] = newSlice / maxSlice;
      } else if (viewTab === 'coronal') {
        scene.crosshairPos[1] = newSlice / maxSlice;
      } else if (viewTab === 'sagittal') {
        scene.crosshairPos[0] = newSlice / maxSlice;
      }
      
      nv.refreshDrawing();
      nv.updateGLVolume();
    }
  };

  // ============================================
  // Undo
  // ============================================
  const handleUndo = () => {
    if (!nvRef.current) return;
    nvRef.current.drawUndo();
  };

  // ============================================
  // 원본 복구
  // ============================================
  const handleResetMask = async () => {
    if (!nvRef.current || !maskFiles || maskFiles.length === 0) return;
    
    const confirmed = confirm('원본 마스크로 복구하시겠습니까? 모든 수정 내용이 사라집니다.');
    if (!confirmed) return;
    
    try {
      if (maskUrlRef.current) {
        URL.revokeObjectURL(maskUrlRef.current);
      }
      maskUrlRef.current = URL.createObjectURL(maskFiles[0]);
      
      await nvRef.current.loadDrawingFromUrl(maskUrlRef.current);
      nvRef.current.refreshDrawing();
      console.log('마스크 원본 복구 완료');
    } catch (error) {
      console.error('마스크 복구 실패:', error);
    }
  };

  // ============================================
  // NIfTI 저장
  // ============================================
  const handleSaveMask = async () => {
    if (!nvRef.current) return;
    
    try {
      const nv = nvRef.current;
      
      // @ts-expect-error - Niivue saveImage typing issue
      nv.saveImage({ 
        filename: `edited_mask_${Date.now()}.nii`, 
        isSaveDrawing: true 
      });
      
      alert('수정된 마스크가 저장되었습니다!');
      closeDrawingModal();
    } catch (error) {
      console.error('마스크 저장 실패:', error);
      alert('마스크 저장에 실패했습니다.');
    }
  };

  if (!isDrawingModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-[90vw] max-w-[1400px] h-[85vh] bg-[#0B1220] rounded-2xl border border-white/10 shadow-2xl flex flex-col">
        {/* 헤더 */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-white/5">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-semibold text-slate-100">🎯 3D 관통 편집</h2>
            
            {isMaskLoaded && (
              <span className="px-3 py-1 bg-green-500/20 text-green-400 text-xs rounded-full font-medium">
                마스크 로드됨
              </span>
            )}
          </div>
          
          <button
            onClick={closeDrawingModal}
            className="p-2 hover:bg-white/5 rounded-lg transition"
          >
            <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 상단 컨트롤 바 */}
        <div className="px-6 py-3 border-b border-white/5 flex items-center gap-4 flex-wrap">
          {/* 뷰어 탭 */}
          <div className="flex gap-2">
            {(['axial', 'coronal', 'sagittal'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setViewTab(tab)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                  viewTab === tab
                    ? 'bg-[#0066CC] text-white'
                    : 'bg-[#020617] text-slate-400 hover:bg-[#1F2937] border border-white/10'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          <div className="h-6 w-px bg-white/10" />

          {/* 레이블 선택 */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-400">레이블:</span>
            <div className="flex gap-1">
              {MASK_LABELS.map((label) => (
                <button
                  key={label.id}
                  onClick={() => {
                    setSelectedLabel(label.id);
                    setMaskTool('draw');
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                    selectedLabel === label.id && maskTool !== 'erase'
                      ? 'ring-2 ring-white ring-offset-1 ring-offset-[#0B1220]'
                      : 'hover:opacity-80'
                  }`}
                  style={{ 
                    backgroundColor: label.color + '40',
                    color: label.color,
                    borderLeft: `3px solid ${label.color}`
                  }}
                >
                  {label.shortName}
                </button>
              ))}
            </div>
          </div>

          <div className="h-6 w-px bg-white/10" />

          {/* 도구 선택 */}
          <div className="flex gap-2">
            <button
              onClick={() => setMaskTool('draw')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                maskTool === 'draw' ? 'text-white' : 'bg-[#020617] text-slate-400 hover:bg-[#1F2937] border border-white/10'
              }`}
              style={maskTool === 'draw' ? { backgroundColor: MASK_LABELS.find(l => l.id === selectedLabel)?.color } : {}}
            >
              ✏️ 그리기
            </button>
            <button
              onClick={() => setMaskTool('erase')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                maskTool === 'erase' ? 'bg-red-500 text-white' : 'bg-[#020617] text-slate-400 hover:bg-[#1F2937] border border-white/10'
              }`}
            >
              🗑️ 지우기
            </button>
            <button 
              onClick={handleUndo} 
              className="px-3 py-1.5 rounded-lg text-sm bg-[#020617] text-slate-400 hover:bg-[#1F2937] border border-white/10"
            >
              ↩️ Undo
            </button>
          </div>

          <div className="h-6 w-px bg-white/10" />

          {/* 브러시 크기 */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">브러시:</span>
            <input
              type="range"
              min="1"
              max="20"
              value={maskBrushSize}
              onChange={(e) => setMaskBrushSize(parseInt(e.target.value))}
              className="w-20 h-1.5 rounded-full appearance-none cursor-pointer bg-slate-700"
            />
            <span className="text-xs text-slate-300 w-6">{maskBrushSize}</span>
          </div>

          <div className="h-6 w-px bg-white/10" />

          {/* 투명도 */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">투명도:</span>
            <input
              type="range"
              min="20"
              max="100"
              value={drawOpacity}
              onChange={(e) => setDrawOpacity(parseInt(e.target.value))}
              className="w-20 h-1.5 rounded-full appearance-none cursor-pointer bg-slate-700"
            />
            <span className="text-xs text-slate-300 w-8">{drawOpacity}%</span>
          </div>

          <div className="flex-1" />

          {/* 액션 버튼 */}
          {maskFiles && maskFiles.length > 0 && (
            <button 
              onClick={handleResetMask} 
              className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg transition"
            >
              원본 복구
            </button>
          )}
          <button 
            onClick={handleSaveMask} 
            className="px-5 py-1.5 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold rounded-lg transition hover:opacity-90"
          >
            💾 저장 (.nii)
          </button>
        </div>

        {/* 본문: 뷰어 영역 */}
        <div className="flex-1 p-6 overflow-hidden flex flex-col">
          <div className="flex-1 bg-black rounded-xl border border-white/10 relative mb-4 overflow-hidden">
            <canvas 
              ref={niivueCanvasRef} 
              className="w-full h-full absolute inset-0" 
              style={{ cursor: 'crosshair' }}
            />

            {!ctFile && !isLoading && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <p className="text-sm text-slate-400">CT 파일 업로드 대기</p>
              </div>
            )}

            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 pointer-events-none">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0066CC]"></div>
              </div>
            )}

            {/* 현재 모드 표시 */}
            <div className="absolute top-4 left-4 bg-black/70 px-3 py-2 rounded-lg pointer-events-none">
              <p className="text-xs text-cyan-400">
                {maskTool === 'erase' 
                  ? '🗑️ 3D 관통 지우기' 
                  : `✏️ 3D 관통 그리기 (${MASK_LABELS.find(l => l.id === selectedLabel)?.shortName})`}
              </p>
            </div>

            {/* 안내 메시지 */}
            <div className="absolute bottom-4 right-4 bg-black/70 px-3 py-2 rounded-lg pointer-events-none">
              <p className="text-xs text-green-400">🔥 모든 슬라이스에 적용됩니다!</p>
            </div>
          </div>

          {/* 슬라이스 슬라이더 */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-medium text-slate-300">슬라이스</label>
                <span className="text-sm text-[#0066CC] font-semibold">{sliceIndex} / {maxSlice}</span>
              </div>
              <input
                type="range"
                min="0"
                max={maxSlice}
                value={sliceIndex}
                onChange={handleSliceChange}
                className="w-full h-2 bg-[#1F2937] rounded-full appearance-none cursor-pointer"
              />
            </div>
            <div className="bg-slate-800/50 rounded-lg p-3 flex items-center">
              <p className="text-xs text-slate-400">
                💡 팁: 마우스로 클릭하거나 드래그하면 모든 슬라이스에 동시에 적용됩니다.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
