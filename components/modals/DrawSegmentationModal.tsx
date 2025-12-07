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
];

// Niivue용 커스텀 Drawing 컬러맵
const MASK_DRAW_COLORMAP = {
  R: [0, 255, 68, 68, 255],
  G: [0, 68, 255, 68, 255],
  B: [0, 68, 68, 255, 68],
  labels: ["Background", "Liver", "Spleen", "L.Kidney", "R.Kidney"]
};

export default function DrawSegmentationModal() {
  const { isDrawingModalOpen, closeDrawingModal, ctFile, maskFiles, editedMaskData, setEditedMaskData, setEditedSliceInfo } = useCtSessionStore();
  
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
  const [maskBrushSize, setMaskBrushSize] = useState(2);
  
  // ============================================
  // Refs
  // ============================================
  const niivueCanvasRef = useRef<HTMLCanvasElement>(null);
  const nvRef = useRef<Niivue | null>(null);
  const maskUrlRef = useRef<string | null>(null);
  const ctUrlRef = useRef<string | null>(null);
  const volumeDimsRef = useRef<number[]>([0, 0, 0, 0]);
  const currentVoxelRef = useRef<number[]>([0, 0, 0]);
  const prevVoxelRef = useRef<number[] | null>(null); // 이전 voxel 위치 (보간용)

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
          show3Dcrosshair: false,
          crosshairWidth: 0, // 십자선 숨김
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

        // Drawing 비활성화 (커스텀 drawOnCurrentSlice 함수로 직접 그리기 위해)
        // Niivue 내장 드로잉을 활성화하면 빨간 선이 동시에 그어지는 문제 발생
        nv.setDrawingEnabled(false);
        nv.setDrawOpacity(drawOpacity / 100);
        // @ts-expect-error - Niivue setDrawColormap accepts object but typed as string
        nv.setDrawColormap(MASK_DRAW_COLORMAP);

        // 마스크를 drawing 레이어로 로드
        // 1. 먼저 원본 마스크 로드
        // 2. editedMaskData가 있으면 drawBitmap에 적용
        if (maskUrlRef.current) {
          URL.revokeObjectURL(maskUrlRef.current);
        }
        
        if (maskFiles && maskFiles.length > 0) {
          maskUrlRef.current = URL.createObjectURL(maskFiles[0]);
          
          try {
            await nv.loadDrawingFromUrl(maskUrlRef.current);
            console.log('원본 마스크 로드 완료');
            
            // 수정된 데이터가 있으면 drawBitmap에 적용
            if (editedMaskData && nv.drawBitmap) {
              nv.drawBitmap.set(editedMaskData);
              nv.refreshDrawing();
              console.log('수정된 마스크 데이터 적용 완료');
            }
            
            setIsMaskLoaded(true);
            
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctFile, maskFiles, isDrawingModalOpen, isNiivueReady]);

  // ============================================
  // 투명도 변경
  // ============================================
  useEffect(() => {
    if (!nvRef.current || !isNiivueReady) return;
    nvRef.current.setDrawOpacity(drawOpacity / 100);
  }, [drawOpacity, isNiivueReady]);

  // ============================================
  // 특정 위치에 브러시 적용 (내부 함수)
  // ============================================
  const applyBrushAt = useCallback((
    drawBitmap: Uint8Array,
    voxel: number[],
    dims: number[],
    brushRadius: number,
    penValue: number,
    isErasing: boolean,
    targetLabel: number // 지우기 모드에서 이 레이블만 지움
  ) => {
    const dimX = dims[1];
    const dimY = dims[2];
    const dimZ = dims[3];
    
    // 뷰에 따라 현재 슬라이스에만 적용
    if (viewTab === 'axial') {
      const centerX = voxel[0];
      const centerY = voxel[1];
      const currentZ = voxel[2];
      
      for (let dx = -brushRadius; dx <= brushRadius; dx++) {
        for (let dy = -brushRadius; dy <= brushRadius; dy++) {
          if (dx * dx + dy * dy > brushRadius * brushRadius) continue;
          
          const vx = centerX + dx;
          const vy = centerY + dy;
          
          if (vx < 0 || vx >= dimX || vy < 0 || vy >= dimY) continue;
          if (currentZ < 0 || currentZ >= dimZ) continue;
          
          const idx = vx + vy * dimX + currentZ * dimX * dimY;
          if (idx >= 0 && idx < drawBitmap.length) {
            // 지우기 모드: 선택된 레이블만 지움
            if (isErasing) {
              if (drawBitmap[idx] === targetLabel) {
                drawBitmap[idx] = 0;
              }
            } else {
              drawBitmap[idx] = penValue;
            }
          }
        }
      }
    } else if (viewTab === 'coronal') {
      const centerX = voxel[0];
      const centerZ = voxel[2];
      const currentY = voxel[1];
      
      for (let dx = -brushRadius; dx <= brushRadius; dx++) {
        for (let dz = -brushRadius; dz <= brushRadius; dz++) {
          if (dx * dx + dz * dz > brushRadius * brushRadius) continue;
          
          const vx = centerX + dx;
          const vz = centerZ + dz;
          
          if (vx < 0 || vx >= dimX || vz < 0 || vz >= dimZ) continue;
          if (currentY < 0 || currentY >= dimY) continue;
          
          const idx = vx + currentY * dimX + vz * dimX * dimY;
          if (idx >= 0 && idx < drawBitmap.length) {
            // 지우기 모드: 선택된 레이블만 지움
            if (isErasing) {
              if (drawBitmap[idx] === targetLabel) {
                drawBitmap[idx] = 0;
              }
            } else {
              drawBitmap[idx] = penValue;
            }
          }
        }
      }
    } else if (viewTab === 'sagittal') {
      const centerY = voxel[1];
      const centerZ = voxel[2];
      const currentX = voxel[0];
      
      for (let dy = -brushRadius; dy <= brushRadius; dy++) {
        for (let dz = -brushRadius; dz <= brushRadius; dz++) {
          if (dy * dy + dz * dz > brushRadius * brushRadius) continue;
          
          const vy = centerY + dy;
          const vz = centerZ + dz;
          
          if (vy < 0 || vy >= dimY || vz < 0 || vz >= dimZ) continue;
          if (currentX < 0 || currentX >= dimX) continue;
          
          const idx = currentX + vy * dimX + vz * dimX * dimY;
          if (idx >= 0 && idx < drawBitmap.length) {
            // 지우기 모드: 선택된 레이블만 지움
            if (isErasing) {
              if (drawBitmap[idx] === targetLabel) {
                drawBitmap[idx] = 0;
              }
            } else {
              drawBitmap[idx] = penValue;
            }
          }
        }
      }
    }
  }, [viewTab]);

  // ============================================
  // 현재 슬라이스에만 그리기/지우기 함수 (보간 지원)
  // ============================================
  const drawOnCurrentSlice = useCallback((isFirstStroke: boolean = false) => {
    if (!nvRef.current || !nvRef.current.drawBitmap) return;
    
    const nv = nvRef.current;
    const drawBitmap = nv.drawBitmap;
    if (!drawBitmap) return;
    
    const dims = volumeDimsRef.current;
    if (!dims || dims.length < 4) return;
    
    const currentVoxel = [...currentVoxelRef.current];
    if (!currentVoxel) return;
    
    const brushRadius = maskBrushSize;
    const isErasing = maskTool === 'erase';
    const penValue = isErasing ? 0 : selectedLabel;
    
    // 첫 스트로크이거나 이전 위치가 없으면 현재 위치에만 적용
    if (isFirstStroke || !prevVoxelRef.current) {
      applyBrushAt(drawBitmap, currentVoxel, dims, brushRadius, penValue, isErasing, selectedLabel);
      prevVoxelRef.current = currentVoxel;
      nv.refreshDrawing();
      return;
    }
    
    const prevVoxel = prevVoxelRef.current;
    
    // 뷰에 따라 보간할 축 결정
    let axis1: number, axis2: number;
    if (viewTab === 'axial') {
      axis1 = 0; axis2 = 1; // x, y
    } else if (viewTab === 'coronal') {
      axis1 = 0; axis2 = 2; // x, z
    } else {
      axis1 = 1; axis2 = 2; // y, z
    }
    
    // 두 점 사이의 거리 계산
    const dx = currentVoxel[axis1] - prevVoxel[axis1];
    const dy = currentVoxel[axis2] - prevVoxel[axis2];
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // 보간 스텝 수 (최소 1)
    const steps = Math.max(1, Math.ceil(distance));
    
    // 선형 보간하여 모든 중간 점에 브러시 적용
    for (let i = 0; i <= steps; i++) {
      const t = steps === 0 ? 1 : i / steps;
      const interpVoxel = [
        Math.round(prevVoxel[0] + (currentVoxel[0] - prevVoxel[0]) * t),
        Math.round(prevVoxel[1] + (currentVoxel[1] - prevVoxel[1]) * t),
        Math.round(prevVoxel[2] + (currentVoxel[2] - prevVoxel[2]) * t)
      ];
      
      applyBrushAt(drawBitmap, interpVoxel, dims, brushRadius, penValue, isErasing, selectedLabel);
    }
    
    prevVoxelRef.current = currentVoxel;
    nv.refreshDrawing();
  }, [viewTab, maskTool, selectedLabel, maskBrushSize, applyBrushAt]);

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
      prevVoxelRef.current = null; // 새 스트로크 시작 시 이전 위치 초기화
      setTimeout(() => {
        if (isDrawingLocal) drawOnCurrentSlice(true); // 첫 스트로크 표시
      }, 10);
    };
    
    const handleMouseMove = () => {
      if (!isDrawingLocal) return;
      drawOnCurrentSlice(false); // 연속 스트로크
    };
    
    const handleMouseUp = () => {
      isDrawingLocal = false;
      prevVoxelRef.current = null; // 스트로크 종료 시 이전 위치 초기화
    };
    
    const handleMouseLeave = () => {
      isDrawingLocal = false;
      prevVoxelRef.current = null; // 캔버스 이탈 시 이전 위치 초기화
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
  }, [isDrawingModalOpen, drawOnCurrentSlice]);

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
  // 상태 저장 (Store에 drawBitmap 복사해서 저장)
  // ============================================
  const handleSaveToStore = () => {
    if (!nvRef.current || !nvRef.current.drawBitmap) {
      alert('저장할 마스크가 없습니다.');
      return;
    }
    
    try {
      const nv = nvRef.current;
      
      // drawBitmap을 복사해서 저장 (Niivue 방식)
      const copiedData = new Uint8Array(nv.drawBitmap);
      setEditedMaskData(copiedData);
      
      // 마지막으로 수정한 voxel의 3D 좌표를 사용하여 모든 뷰의 슬라이스 계산
      // currentVoxelRef: [x(sagittal), y(coronal), z(axial)]
      const lastVoxel = currentVoxelRef.current;
      const sagittalSlice = lastVoxel[0]; // X 좌표
      const coronalSlice = lastVoxel[1];  // Y 좌표
      const axialSlice = lastVoxel[2];    // Z 좌표
      
      setEditedSliceInfo({
        axialSlice,
        coronalSlice,
        sagittalSlice
      });
      
      console.log('수정된 마스크가 Store에 저장되었습니다. 크기:', copiedData.length, 
        'voxel:', lastVoxel, 'axial:', axialSlice, 'coronal:', coronalSlice, 'sagittal:', sagittalSlice);
      alert('수정된 마스크가 저장되었습니다!');
    } catch (error) {
      console.error('마스크 저장 실패:', error);
      alert('마스크 저장에 실패했습니다.');
    }
  };

  // ============================================
  // NIfTI 파일 다운로드 (기존 기능 유지)
  // ============================================
  const handleDownloadMask = async () => {
    if (!nvRef.current) return;
    
    try {
      const nv = nvRef.current;
      
      // @ts-expect-error - Niivue saveImage typing issue
      nv.saveImage({ 
        filename: `edited_mask_${Date.now()}.nii`, 
        isSaveDrawing: true 
      });
      
      console.log('마스크 파일 다운로드 완료');
    } catch (error) {
      console.error('마스크 다운로드 실패:', error);
      alert('마스크 다운로드에 실패했습니다.');
    }
  };

  if (!isDrawingModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-[90vw] max-w-[1400px] h-[85vh] bg-[#0B1220] rounded-2xl border border-white/10 shadow-2xl flex flex-col">
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
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    selectedLabel === label.id 
                      ? 'ring-2 ring-white ring-offset-1 ring-offset-[#0B1220] scale-105' 
                      : 'opacity-50 hover:opacity-80'
                  }`}
                  style={{ 
                    backgroundColor: label.color + (selectedLabel === label.id ? '80' : '30'),
                    color: label.color,
                    border: `2px solid ${label.color}`
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
                maskTool === 'draw' ? 'bg-[#0066CC] text-white' : 'bg-[#020617] text-slate-400 hover:bg-[#1F2937] border border-white/10'
              }`}
            >
              그리기
            </button>
            <button
              onClick={() => setMaskTool('erase')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                maskTool === 'erase' ? 'bg-[#0066CC] text-white' : 'bg-[#020617] text-slate-400 hover:bg-[#1F2937] border border-white/10'
              }`}
            >
              지우기
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
              min="0"
              max="15"
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

          {/* 저장 버튼 */}
          <button
            onClick={handleSaveToStore}
            disabled={!isMaskLoaded}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition flex items-center gap-2 ${
              isMaskLoaded
                ? 'bg-[#22C55E] hover:bg-[#16A34A] text-white'
                : 'bg-slate-700 text-slate-500 cursor-not-allowed'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            저장
          </button>

          {/* 닫기 버튼 */}
          <button
            onClick={closeDrawingModal}
            className="p-2 hover:bg-white/5 rounded-lg transition"
          >
            <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
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

          </div>

          {/* 슬라이스 슬라이더 */}
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
        </div>
      </div>
    </div>
  );
}
