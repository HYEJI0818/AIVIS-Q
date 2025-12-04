'use client';

import { useEffect, useRef, useState } from 'react';
import { Niivue } from '@niivue/niivue';
import { useCtSessionStore } from '@/store/useCtSessionStore';
import { ViewOrientation } from '@/lib/ctTypes';

interface SingleCtViewProps {
  id: string;
  title: string;
  orientation: ViewOrientation;
  maskOnly?: boolean; // true일 경우 mask만 표시 (CT 원본 숨김)
}

export default function SingleCtView({ id, title, orientation, maskOnly = false }: SingleCtViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nvRef = useRef<Niivue | null>(null);
  const [currentSlice, setCurrentSlice] = useState(0);
  const [maxSlice, setMaxSlice] = useState(100);
  const [isLoading, setIsLoading] = useState(false);
  const [volumeLoaded, setVolumeLoaded] = useState(false); // 볼륨 로드 완료 상태

  const {
    ctFile,
    ctNvImage,
    liverMask,
    spleenMask,
    maskFiles,
    brightness,
    contrast,
    opacity,
    setCtNvImage,
    setLiverMask,
    setSpleenMask,
  } = useCtSessionStore();

  // 기본 마스크 컬러 (0~255)
  const BASE_MASK_COLORS = {
    liver: { r: 255, g: 68, b: 68 },    // 빨간색 - Liver
    spleen: { r: 68, g: 255, b: 68 },   // 초록색 - Spleen  
    lKidney: { r: 68, g: 68, b: 255 },  // 파란색 - L.Kidney
    rKidney: { r: 255, g: 255, b: 68 }, // 노란색 - R.Kidney
  };

  // Brightness와 Contrast를 적용한 색상 계산 함수
  const applyBrightnessContrast = (
    color: { r: number; g: number; b: number },
    brightness: number,
    contrast: number
  ) => {
    // brightness: 0~100, 50이 기본
    // contrast: 0~100, 50이 기본
    
    // Brightness 조절: -128 ~ +128 범위로 변환
    const brightnessOffset = ((brightness - 50) / 50) * 128;
    
    // Contrast 조절: 0.5 ~ 2.0 배율로 변환
    const contrastFactor = (contrast / 50);
    
    // 각 채널에 대비 적용 후 밝기 적용
    const applyToChannel = (value: number) => {
      // 중심점(128)을 기준으로 대비 적용
      let adjusted = ((value - 128) * contrastFactor) + 128;
      // 밝기 적용
      adjusted = adjusted + brightnessOffset;
      // 0~255 범위로 클램핑
      return Math.max(0, Math.min(255, Math.round(adjusted)));
    };

    return {
      r: applyToChannel(color.r),
      g: applyToChannel(color.g),
      b: applyToChannel(color.b),
    };
  };

  // 현재 brightness/contrast 설정에 따른 컬러맵 생성
  const getAdjustedColormap = (brightness: number, contrast: number) => {
    const liver = applyBrightnessContrast(BASE_MASK_COLORS.liver, brightness, contrast);
    const spleen = applyBrightnessContrast(BASE_MASK_COLORS.spleen, brightness, contrast);
    const lKidney = applyBrightnessContrast(BASE_MASK_COLORS.lKidney, brightness, contrast);
    const rKidney = applyBrightnessContrast(BASE_MASK_COLORS.rKidney, brightness, contrast);

    return {
      R: [0, liver.r, spleen.r, lKidney.r, rKidney.r],
      G: [0, liver.g, spleen.g, lKidney.g, rKidney.g],
      B: [0, liver.b, spleen.b, lKidney.b, rKidney.b],
      labels: ["Background", "Liver", "Spleen", "L.Kidney", "R.Kidney"]
    };
  };

  // Niivue 초기화
  useEffect(() => {
    if (!canvasRef.current) return;

    try {
      const nv = new Niivue({
        dragAndDropEnabled: false,
        backColor: [0.02, 0.06, 0.09, 1], // #020617 in RGBA
        show3Dcrosshair: false,
        crosshairWidth: 0, // 십자선 숨김
        isColorbar: false,
        textHeight: 0.03,
      });

      nv.attachToCanvas(canvasRef.current);
      nvRef.current = nv;

      // Orientation 설정
      if (orientation === 'axial') {
        nv.setSliceType(nv.sliceTypeAxial);
      } else if (orientation === 'coronal') {
        nv.setSliceType(nv.sliceTypeCoronal);
      } else if (orientation === 'sagittal') {
        nv.setSliceType(nv.sliceTypeSagittal);
      } else if (orientation === '3d') {
        nv.setSliceType(nv.sliceTypeRender);
      }

      console.log(`Niivue 초기화 완료: ${title} (${orientation})`);

      // Cleanup
      return () => {
        nvRef.current = null;
      };
    } catch (error) {
      console.error('Niivue 초기화 실패:', error);
    }
  }, [title, orientation]);

  // CT 파일 로드 (NIfTI/DICOM)
  useEffect(() => {
    if (!nvRef.current) return;

    // ctFile이 null이면 모든 볼륨 제거 (초기화)
    if (!ctFile) {
      if (nvRef.current.volumes.length > 0) {
        // 모든 볼륨 제거
        while (nvRef.current.volumes.length > 0) {
          nvRef.current.removeVolume(nvRef.current.volumes[0]);
        }
        nvRef.current.updateGLVolume();
        console.log(`${title}: 볼륨 제거 완료`);
      }
      setIsLoading(false);
      setVolumeLoaded(false); // 볼륨 로드 상태 리셋
      return;
    }

    const loadCTFile = async () => {
      setIsLoading(true);
      setVolumeLoaded(false); // 로드 시작 시 리셋
      try {
        console.log(`${title}: CT 파일 로드 시작 - ${ctFile.name}`);
        const nv = nvRef.current!;

        // 기존 볼륨이 있으면 모두 제거
        while (nv.volumes.length > 0) {
          nv.removeVolume(nv.volumes[0]);
        }

        // CT 볼륨 로드 (maskOnly가 아닐 때만)
        if (!maskOnly) {
          await nv.loadVolumes([{
            url: URL.createObjectURL(ctFile),
            name: ctFile.name
          }]);
        } else {
          // maskOnly일 때도 CT를 로드해야 Drawing이 표시됨
          await nv.loadVolumes([{
            url: URL.createObjectURL(ctFile),
            name: ctFile.name,
            opacity: 0 // CT는 숨김
          }]);
        }

        // Drawing 활성화 및 기본 컬러맵 설정 (초기값 사용, 이후 별도 useEffect에서 업데이트)
        nv.setDrawingEnabled(true);
        const initialColormap = getAdjustedColormap(50, 50); // 기본값으로 초기화
        // @ts-expect-error - Niivue setDrawColormap accepts object but typed as string
        nv.setDrawColormap(initialColormap);
        nv.setDrawOpacity(0.4); // 기본 opacity 40%

        // 마스크를 Drawing 레이어로 로드 (DrawSegmentationModal과 동일한 방식)
        if (maskFiles && maskFiles.length > 0) {
          const maskUrl = URL.createObjectURL(maskFiles[0]);
          try {
            await nv.loadDrawingFromUrl(maskUrl);
            console.log(`${title}: 마스크 Drawing 레이어 로드 완료`);
          } catch (error) {
            console.error(`${title}: 마스크 Drawing 로드 실패:`, error);
          }
        }

        // 슬라이스 범위 업데이트
        // NIfTI dims: dims[0]=차원 개수, dims[1]=X(sagittal), dims[2]=Y(coronal), dims[3]=Z(axial)
        const volumes = nv.volumes;
        if (volumes.length > 0) {
          const volume = volumes[0];
          const dims = volume.dims;
          console.log(`${title}: Volume dims =`, dims); // 디버그: 실제 dims 값 확인
          if (dims && dims.length >= 4) {
            if (orientation === 'axial') {
              // Z dimension (axial slices)
              console.log(`${title}: Axial using dims[3] = ${dims[3]}`);
              setMaxSlice(dims[3] - 1);
              setCurrentSlice(Math.floor(dims[3] / 2));
            } else if (orientation === 'coronal') {
              // Y dimension (coronal slices)
              console.log(`${title}: Coronal using dims[2] = ${dims[2]}`);
              setMaxSlice(dims[2] - 1);
              setCurrentSlice(Math.floor(dims[2] / 2));
            } else if (orientation === 'sagittal') {
              // X dimension (sagittal slices)
              console.log(`${title}: Sagittal using dims[1] = ${dims[1]}`);
              setMaxSlice(dims[1] - 1);
              setCurrentSlice(Math.floor(dims[1] / 2));
            }
          }
          
          setVolumeLoaded(true); // 볼륨 로드 완료!
        }

        console.log(`${title}: 로드 완료 (마스크 ${maskFiles?.length || 0}개 포함, maskOnly: ${maskOnly})`);
      } catch (error) {
        console.error(`${title}: CT 파일 로드 실패:`, error);
        setVolumeLoaded(false);
      } finally {
        setIsLoading(false);
      }
    };

    loadCTFile();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctFile, maskFiles, title, orientation, maskOnly]);

  // Segmentation mask 로드 (레거시: liverMask/spleenMask가 별도로 설정될 때)
  useEffect(() => {
    // maskFiles가 있으면 이미 볼륨 로드에서 처리됨 - 레거시 마스크만 처리
    if (!nvRef.current || !ctFile || !volumeLoaded) return;
    if (maskFiles && maskFiles.length > 0) return; // maskFiles 있으면 스킵
    if (!liverMask && !spleenMask) return; // 레거시 마스크도 없으면 스킵

    const loadLegacyMasks = async () => {
      try {
        const nv = nvRef.current!;
        
        // Drawing 활성화 및 기본 컬러맵 설정
        nv.setDrawingEnabled(true);
        const initialColormap = getAdjustedColormap(50, 50);
        // @ts-expect-error - Niivue setDrawColormap accepts object but typed as string
        nv.setDrawColormap(initialColormap);
        nv.setDrawOpacity(0.4);

        // 첫 번째 마스크를 Drawing 레이어로 로드
        const maskToLoad = liverMask || spleenMask;
        if (maskToLoad) {
          const maskUrl = URL.createObjectURL(maskToLoad);
          await nv.loadDrawingFromUrl(maskUrl);
          console.log(`${title}: 레거시 마스크 Drawing 레이어 로드 완료`);
        }
      } catch (error) {
        console.error(`${title}: 레거시 마스크 로드 실패:`, error);
      }
    };

    loadLegacyMasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liverMask, spleenMask, maskFiles, title, ctFile, volumeLoaded]);

  // Mask 컨트롤 반영 (밝기, 대비, 투명도)
  useEffect(() => {
    if (!nvRef.current || !ctFile || !volumeLoaded) return;

    try {
      const nv = nvRef.current;
      
      // brightness/contrast 적용된 컬러맵 설정
      const adjustedColormap = getAdjustedColormap(brightness, contrast);
      // @ts-expect-error - Niivue setDrawColormap accepts object but typed as string
      nv.setDrawColormap(adjustedColormap);
      
      // Drawing 레이어 투명도 적용
      nv.setDrawOpacity(opacity / 100);
      nv.updateGLVolume();
      console.log(`${title}: 마스크 컨트롤 적용 - brightness: ${brightness}, contrast: ${contrast}, opacity: ${opacity}%`);
      
    } catch (error) {
      console.error(`${title}: 마스크 컨트롤 적용 실패:`, error);
    }
  }, [brightness, contrast, opacity, title, ctFile, volumeLoaded]);

  // Slice 변경 핸들러
  const handleSliceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSlice = parseInt(e.target.value);
    setCurrentSlice(newSlice);

    if (nvRef.current && nvRef.current.volumes.length > 0) {
      const nv = nvRef.current;
      const scene = nv.scene;
      
      // Orientation에 따라 적절한 slice 설정
      if (orientation === 'axial') {
        scene.crosshairPos[2] = newSlice / maxSlice;
      } else if (orientation === 'coronal') {
        scene.crosshairPos[1] = newSlice / maxSlice;
      } else if (orientation === 'sagittal') {
        scene.crosshairPos[0] = newSlice / maxSlice;
      }
      
      nv.updateGLVolume();
    }
  };

  // 확대 버튼 핸들러
  const handleFullscreen = () => {
    console.log(`${title} 확대 요청`);
    // TODO: 모달로 크게 보기 기능 구현
  };

  return (
    <div className="flex flex-col bg-[#020617] rounded-lg border border-white/5 p-3 min-h-0 overflow-hidden">
      {/* 상단: 제목 + 확대 버튼 */}
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-medium text-slate-300">{title}</h3>
        {ctFile && (
          <button
            onClick={handleFullscreen}
            className="p-1.5 hover:bg-white/5 rounded transition"
            title="확대"
          >
            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
          </button>
        )}
      </div>

      {/* 중앙: Canvas */}
      <div className="flex-1 relative bg-black rounded overflow-hidden min-h-0">
        <canvas
          ref={canvasRef}
          id={`canvas-${id}`}
          className="absolute inset-0 w-full h-full"
        />
        
        {/* Placeholder (CT 파일이 없을 때) */}
        {!ctFile && !isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <svg className="mx-auto h-12 w-12 text-slate-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-xs text-slate-500">CT 파일 업로드 대기</p>
            </div>
          </div>
        )}

        {/* 로딩 중 */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0066CC] mx-auto mb-2"></div>
              <p className="text-xs text-slate-300">로딩 중...</p>
            </div>
          </div>
        )}
      </div>

      {/* 하단: Slice 슬라이더 (3D는 숨김 처리하지만 공간은 유지) */}
      <div className="mt-3 h-[1.25rem]">
        {orientation !== '3d' && ctFile && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 w-12">Slice</span>
            <input
              type="range"
              min="0"
              max={maxSlice}
              value={currentSlice}
              onChange={handleSliceChange}
              className="flex-1 h-1.5 bg-[#1F2937] rounded-full appearance-none cursor-pointer 
                [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 
                [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#0066CC]
                [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:rounded-full 
                [&::-moz-range-thumb]:bg-[#0066CC] [&::-moz-range-thumb]:border-0"
            />
            <span className="text-xs text-slate-400 w-16 text-right">
              {currentSlice + 1}/{maxSlice + 1}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

