'use client';

import { useEffect, useRef, useState } from 'react';
import { Niivue } from '@niivue/niivue';
import { useCtSessionStore } from '@/store/useCtSessionStore';

// Niivue용 마스크 컬러맵
const MASK_COLORMAP = {
  R: [0, 255, 68, 68, 255],
  G: [0, 68, 255, 68, 255],
  B: [0, 68, 68, 255, 68],
  labels: ["Background", "Liver", "Spleen", "L.Kidney", "R.Kidney"]
};

type ViewOrientation = 'axial' | 'sagittal' | 'coronal';

interface ComparisonViewerProps {
  id: string;
  title: string;
  subtitle: string;
  ctFile: File | null;
  maskFiles: File[];
  editedMaskData?: Uint8Array | null;
  useEditedMask: boolean;
  orientation: ViewOrientation;
  initialSlice?: number; // 초기 슬라이스 (수정된 슬라이스로 이동)
}

// 단일 비교 뷰어 컴포넌트
function ComparisonViewer({ 
  id, 
  title, 
  subtitle, 
  ctFile, 
  maskFiles, 
  editedMaskData, 
  useEditedMask,
  orientation,
  initialSlice
}: ComparisonViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nvRef = useRef<Niivue | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentSlice, setCurrentSlice] = useState(0);
  const [maxSlice, setMaxSlice] = useState(100);
  const [volumeLoaded, setVolumeLoaded] = useState(false);
  const orientationRef = useRef(orientation);
  const maxSliceRef = useRef(maxSlice);

  // refs 업데이트
  useEffect(() => {
    orientationRef.current = orientation;
  }, [orientation]);

  useEffect(() => {
    maxSliceRef.current = maxSlice;
  }, [maxSlice]);

  // Niivue 초기화 (ctFile이 있을 때만)
  useEffect(() => {
    if (!canvasRef.current || !ctFile) return;

    try {
      const nv = new Niivue({
        dragAndDropEnabled: false,
        backColor: [0, 0, 0, 1],
        show3Dcrosshair: false,
        crosshairWidth: 0,
        isColorbar: false,
      });

      nv.attachToCanvas(canvasRef.current);
      nvRef.current = nv;

      console.log(`ComparisonViewer ${id}: 초기화 완료`);
    } catch (error) {
      console.error(`ComparisonViewer ${id}: 초기화 실패:`, error);
    }

    return () => {
      nvRef.current = null;
    };
  }, [id, ctFile]);

  // 마우스 휠 이벤트 처리 (슬라이스 변경)
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (!nvRef.current || !nvRef.current.volumes.length) return;

      const nv = nvRef.current;
      const delta = e.deltaY > 0 ? 1 : -1;
      const currentOrientation = orientationRef.current;
      const currentMaxSlice = maxSliceRef.current;

      // 현재 슬라이스 위치 가져오기
      let currentPos = 0;
      if (currentOrientation === 'axial') {
        currentPos = Math.round(nv.scene.crosshairPos[2] * currentMaxSlice);
      } else if (currentOrientation === 'coronal') {
        currentPos = Math.round(nv.scene.crosshairPos[1] * currentMaxSlice);
      } else if (currentOrientation === 'sagittal') {
        currentPos = Math.round(nv.scene.crosshairPos[0] * currentMaxSlice);
      }

      // 새 슬라이스 계산
      const newSlice = Math.max(0, Math.min(currentMaxSlice, currentPos + delta));

      // 슬라이스 설정
      if (currentOrientation === 'axial') {
        nv.scene.crosshairPos[2] = newSlice / currentMaxSlice;
      } else if (currentOrientation === 'coronal') {
        nv.scene.crosshairPos[1] = newSlice / currentMaxSlice;
      } else if (currentOrientation === 'sagittal') {
        nv.scene.crosshairPos[0] = newSlice / currentMaxSlice;
      }

      nv.updateGLVolume();
      setCurrentSlice(newSlice);
    };

    canvas.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      canvas.removeEventListener('wheel', handleWheel);
    };
  }, []);

  // Orientation 변경 처리
  useEffect(() => {
    if (!nvRef.current || !volumeLoaded) return;

    const nv = nvRef.current;
    
    // 방향 설정
    if (orientation === 'axial') {
      nv.setSliceType(nv.sliceTypeAxial);
    } else if (orientation === 'coronal') {
      nv.setSliceType(nv.sliceTypeCoronal);
    } else if (orientation === 'sagittal') {
      nv.setSliceType(nv.sliceTypeSagittal);
    }

    // 슬라이스 범위 업데이트
    if (nv.volumes.length > 0) {
      const dims = nv.volumes[0].dims;
      if (dims && dims.length >= 4) {
        let newMaxSlice = 100;
        if (orientation === 'axial') {
          newMaxSlice = dims[3] - 1;
        } else if (orientation === 'coronal') {
          newMaxSlice = dims[2] - 1;
        } else if (orientation === 'sagittal') {
          newMaxSlice = dims[1] - 1;
        }
        setMaxSlice(newMaxSlice);
        
        // initialSlice가 있으면 해당 슬라이스로 이동, 없으면 중앙
        const targetSlice = initialSlice !== undefined 
          ? Math.min(initialSlice, newMaxSlice) 
          : Math.floor(newMaxSlice / 2);
        setCurrentSlice(targetSlice);
        
        // 슬라이스 위치 설정
        if (orientation === 'axial') {
          nv.scene.crosshairPos[2] = targetSlice / newMaxSlice;
        } else if (orientation === 'coronal') {
          nv.scene.crosshairPos[1] = targetSlice / newMaxSlice;
        } else if (orientation === 'sagittal') {
          nv.scene.crosshairPos[0] = targetSlice / newMaxSlice;
        }
        nv.updateGLVolume();
      }
    }
  }, [orientation, volumeLoaded, initialSlice]);

  // CT 파일 및 마스크 로드
  useEffect(() => {
    if (!nvRef.current || !ctFile) {
      setVolumeLoaded(false);
      return;
    }

    const loadFiles = async () => {
      setIsLoading(true);
      setVolumeLoaded(false);

      try {
        const nv = nvRef.current!;

        // 기존 볼륨 제거
        while (nv.volumes.length > 0) {
          nv.removeVolume(nv.volumes[0]);
        }

        // CT 볼륨 로드
        const ctUrl = URL.createObjectURL(ctFile);
        await nv.loadVolumes([{
          url: ctUrl,
          name: ctFile.name
        }]);

        // Drawing 활성화 및 컬러맵 설정
        nv.setDrawingEnabled(true);
        // @ts-expect-error - Niivue setDrawColormap accepts object but typed as string
        nv.setDrawColormap(MASK_COLORMAP);
        nv.setDrawOpacity(0.5);

        // 방향 설정
        if (orientation === 'axial') {
          nv.setSliceType(nv.sliceTypeAxial);
        } else if (orientation === 'coronal') {
          nv.setSliceType(nv.sliceTypeCoronal);
        } else if (orientation === 'sagittal') {
          nv.setSliceType(nv.sliceTypeSagittal);
        }

        // 마스크 로드
        if (maskFiles && maskFiles.length > 0) {
          const maskUrl = URL.createObjectURL(maskFiles[0]);
          
          try {
            await nv.loadDrawingFromUrl(maskUrl);
            console.log(`ComparisonViewer ${id}: 마스크 로드 완료`);

            // 수정된 마스크 데이터 적용 (오른쪽 뷰어)
            if (useEditedMask && editedMaskData && nv.drawBitmap) {
              nv.drawBitmap.set(editedMaskData);
              nv.refreshDrawing();
              console.log(`ComparisonViewer ${id}: 수정된 마스크 적용 완료`);
            }
          } catch (error) {
            console.error(`ComparisonViewer ${id}: 마스크 로드 실패:`, error);
          }
        }

        // 슬라이스 범위 업데이트
        if (nv.volumes.length > 0) {
          const dims = nv.volumes[0].dims;
          if (dims && dims.length >= 4) {
            let newMaxSlice = 100;
            if (orientation === 'axial') {
              newMaxSlice = dims[3] - 1;
            } else if (orientation === 'coronal') {
              newMaxSlice = dims[2] - 1;
            } else if (orientation === 'sagittal') {
              newMaxSlice = dims[1] - 1;
            }
            setMaxSlice(newMaxSlice);
            
            // initialSlice가 있으면 해당 슬라이스로 이동, 없으면 중앙
            const targetSlice = initialSlice !== undefined 
              ? Math.min(initialSlice, newMaxSlice) 
              : Math.floor(newMaxSlice / 2);
            setCurrentSlice(targetSlice);
            
            // 슬라이스 위치 설정
            if (orientation === 'axial') {
              nv.scene.crosshairPos[2] = targetSlice / newMaxSlice;
            } else if (orientation === 'coronal') {
              nv.scene.crosshairPos[1] = targetSlice / newMaxSlice;
            } else if (orientation === 'sagittal') {
              nv.scene.crosshairPos[0] = targetSlice / newMaxSlice;
            }
            nv.updateGLVolume();
          }
          setVolumeLoaded(true);
        }

        console.log(`ComparisonViewer ${id}: 로드 완료`);
      } catch (error) {
        console.error(`ComparisonViewer ${id}: 파일 로드 실패:`, error);
      } finally {
        setIsLoading(false);
      }
    };

    loadFiles();
  }, [ctFile, maskFiles, editedMaskData, useEditedMask, id, orientation, initialSlice]);

  // 슬라이스 변경
  const handleSliceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSlice = parseInt(e.target.value);
    setCurrentSlice(newSlice);

    if (nvRef.current && nvRef.current.volumes.length > 0) {
      const nv = nvRef.current;
      
      // Orientation에 따라 적절한 축에 슬라이스 설정
      if (orientation === 'axial') {
        nv.scene.crosshairPos[2] = newSlice / maxSlice;
      } else if (orientation === 'coronal') {
        nv.scene.crosshairPos[1] = newSlice / maxSlice;
      } else if (orientation === 'sagittal') {
        nv.scene.crosshairPos[0] = newSlice / maxSlice;
      }
      
      nv.updateGLVolume();
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0">
      {/* 헤더 */}
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-300">{title}</h3>
        <span className="text-xs text-slate-500">{subtitle}</span>
      </div>

      {/* 뷰어 */}
      <div className="flex-1 bg-black rounded-xl border border-white/10 relative overflow-hidden">
        {/* CT 파일이 있을 때만 캔버스 표시 */}
        {ctFile && (
          <canvas
            ref={canvasRef}
            id={`comparison-canvas-${id}`}
            className="absolute inset-0 w-full h-full"
          />
        )}

        {/* 플레이스홀더 */}
        {!ctFile && !isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <svg className="mx-auto h-16 w-16 text-slate-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-sm text-slate-400">CT 파일 없음</p>
            </div>
          </div>
        )}

        {/* 로딩 */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0066CC]"></div>
          </div>
        )}
      </div>

      {/* 슬라이스 슬라이더 */}
      {ctFile && volumeLoaded && (
        <div className="mt-3 flex items-center gap-2">
          <span className="text-xs text-slate-400 w-10">Slice</span>
          <input
            type="range"
            min="0"
            max={maxSlice}
            value={currentSlice}
            onChange={handleSliceChange}
            className="flex-1 h-1.5 bg-[#1F2937] rounded-full appearance-none cursor-pointer 
              [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 
              [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#0066CC]"
          />
          <span className="text-xs text-slate-400 w-14 text-right">
            {currentSlice + 1}/{maxSlice + 1}
          </span>
        </div>
      )}
    </div>
  );
}

export default function ComparisonModal() {
  const { 
    isComparisonModalOpen, 
    closeComparisonModal, 
    ctFile, 
    maskFiles, 
    editedMaskData,
    editedSliceInfo,
    volumeMetrics 
  } = useCtSessionStore();

  // 현재 orientation에 맞는 수정된 슬라이스 인덱스 가져오기
  const getInitialSlice = (dir: ViewOrientation) => {
    if (!editedSliceInfo) {
      console.log('getInitialSlice: editedSliceInfo is null');
      return undefined;
    }
    let slice: number | undefined;
    if (dir === 'axial') slice = editedSliceInfo.axialSlice;
    else if (dir === 'coronal') slice = editedSliceInfo.coronalSlice;
    else if (dir === 'sagittal') slice = editedSliceInfo.sagittalSlice;
    console.log('getInitialSlice:', { dir, slice, editedSliceInfo });
    return slice;
  };

  // 뷰 방향 상태
  const [orientation, setOrientation] = useState<ViewOrientation>('axial');

  // 수정된 데이터가 있는지 확인
  const hasEditedData = editedMaskData !== null && editedMaskData.length > 0;

  if (!isComparisonModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-[95vw] max-w-6xl h-[85vh] bg-[#0B1220] rounded-2xl border border-white/10 shadow-2xl flex flex-col">
        {/* 헤더 */}
        <div className="flex justify-between items-center p-6 border-b border-white/5">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-semibold text-slate-100">Segmentation 비교</h2>
            
            {/* 방향 전환 버튼 */}
            <div className="flex gap-1 bg-[#020617] rounded-lg p-1">
              {(['axial', 'sagittal', 'coronal'] as const).map((dir) => (
                <button
                  key={dir}
                  onClick={() => setOrientation(dir)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
                    orientation === dir
                      ? 'bg-[#0066CC] text-white'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                  }`}
                >
                  {dir.charAt(0).toUpperCase() + dir.slice(1)}
                </button>
              ))}
            </div>
            
            {!hasEditedData && (
              <span className="px-3 py-1 bg-amber-500/20 text-amber-400 text-xs rounded-full">
                수정된 데이터 없음
              </span>
            )}
          </div>
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
        <div className="flex-1 flex gap-4 p-6 min-h-0">
          {/* 좌측: 원본 */}
          <ComparisonViewer
            id="original"
            title="원본 (AI 추정)"
            subtitle="Original"
            ctFile={ctFile}
            maskFiles={maskFiles}
            editedMaskData={null}
            useEditedMask={false}
            orientation={orientation}
            initialSlice={getInitialSlice(orientation)}
          />

          {/* 중앙: 구분선 */}
          <div className="w-px bg-white/10 flex-shrink-0" />

          {/* 우측: 수정본 */}
          <ComparisonViewer
            id="edited"
            title="수정본 (사용자 수정)"
            subtitle="Edited"
            ctFile={ctFile}
            maskFiles={maskFiles}
            editedMaskData={editedMaskData}
            initialSlice={getInitialSlice(orientation)}
            useEditedMask={true}
            orientation={orientation}
          />
        </div>

        {/* 하단: 차이값 요약 */}
        <div className="p-6 border-t border-white/5">
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-[#020617] rounded-lg p-4 text-center">
              <p className="text-xs text-slate-400 mb-1">간 볼륨</p>
              <p className="text-lg font-semibold text-[#FF4444]">
                {volumeMetrics?.liverVolumeEstimated ? `${volumeMetrics.liverVolumeEstimated.toFixed(1)} cc` : '- cc'}
              </p>
            </div>
            <div className="bg-[#020617] rounded-lg p-4 text-center">
              <p className="text-xs text-slate-400 mb-1">비장 볼륨</p>
              <p className="text-lg font-semibold text-[#44FF44]">
                {volumeMetrics?.spleenVolumeEstimated ? `${volumeMetrics.spleenVolumeEstimated.toFixed(1)} cc` : '- cc'}
              </p>
            </div>
            <div className="bg-[#020617] rounded-lg p-4 text-center">
              <p className="text-xs text-slate-400 mb-1">LSVR</p>
              <p className="text-lg font-semibold text-[#22D3EE]">
                {volumeMetrics?.ratioEstimated ? volumeMetrics.ratioEstimated.toFixed(2) : '-'}
              </p>
            </div>
          </div>
          {!hasEditedData && (
            <p className="text-xs text-amber-400/80 text-center mt-3">
              💡 세그멘테이션 수정 모달에서 마스크를 수정하고 저장하면 비교할 수 있습니다.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
