'use client';

import { useEffect, useRef, useState } from 'react';
import { Niivue } from '@niivue/niivue';
import { useCtSessionStore } from '@/store/useCtSessionStore';
import { ViewOrientation } from '@/lib/ctTypes';

interface SingleCtViewProps {
  id: string;
  title: string;
  orientation: ViewOrientation;
}

export default function SingleCtView({ id, title, orientation }: SingleCtViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nvRef = useRef<Niivue | null>(null);
  const [currentSlice, setCurrentSlice] = useState(0);
  const [maxSlice, setMaxSlice] = useState(100);
  const [isLoading, setIsLoading] = useState(false);

  const {
    ctFile,
    ctNvImage,
    liverMask,
    spleenMask,
    brightness,
    contrast,
    opacity,
    setCtNvImage,
    setLiverMask,
    setSpleenMask,
  } = useCtSessionStore();

  // Niivue 초기화
  useEffect(() => {
    if (!canvasRef.current) return;

    try {
      const nv = new Niivue({
        logging: false,
        dragAndDropEnabled: false,
        backColor: [0.02, 0.06, 0.09, 1], // #020617 in RGBA
        show3Dcrosshair: true,
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
    if (!nvRef.current || !ctFile) return;

    const loadCTFile = async () => {
      setIsLoading(true);
      try {
        console.log(`${title}: CT 파일 로드 시작 - ${ctFile.name}`);

        // File을 ArrayBuffer로 변환
        const arrayBuffer = await ctFile.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);

        // Niivue로 볼륨 로드
        await nvRef.current!.loadFromArrayBuffer(uint8Array, ctFile.name);

        // 슬라이스 범위 업데이트
        const volumes = nvRef.current!.volumes;
        if (volumes.length > 0) {
          const volume = volumes[0];
          if (orientation === 'axial') {
            setMaxSlice(volume.dims[2] - 1);
            setCurrentSlice(Math.floor(volume.dims[2] / 2));
          } else if (orientation === 'coronal') {
            setMaxSlice(volume.dims[1] - 1);
            setCurrentSlice(Math.floor(volume.dims[1] / 2));
          } else if (orientation === 'sagittal') {
            setMaxSlice(volume.dims[0] - 1);
            setCurrentSlice(Math.floor(volume.dims[0] / 2));
          }
        }

        console.log(`${title}: CT 파일 로드 완료`);
      } catch (error) {
        console.error(`${title}: CT 파일 로드 실패:`, error);
      } finally {
        setIsLoading(false);
      }
    };

    loadCTFile();
  }, [ctFile, title, orientation]);

  // Segmentation mask 로드 (간/비장)
  useEffect(() => {
    if (!nvRef.current || nvRef.current.volumes.length === 0) return;

    const loadMasks = async () => {
      try {
        // 기존 오버레이 제거 (첫 번째 볼륨 제외)
        while (nvRef.current!.volumes.length > 1) {
          nvRef.current!.removeVolume(nvRef.current!.volumes[1]);
        }

        // Liver mask 로드
        if (liverMask) {
          const liverArrayBuffer = await liverMask.arrayBuffer();
          const liverUint8 = new Uint8Array(liverArrayBuffer);
          await nvRef.current!.loadFromArrayBuffer(liverUint8, 'liver_mask.nii');
          
          // 간 색상: 초록색 (#22C55E)
          if (nvRef.current!.volumes.length > 1) {
            nvRef.current!.volumes[1].colorMap = 'green';
            nvRef.current!.volumes[1].opacity = opacity / 100;
          }
          console.log(`${title}: Liver mask 로드 완료`);
        }

        // Spleen mask 로드
        if (spleenMask) {
          const spleenArrayBuffer = await spleenMask.arrayBuffer();
          const spleenUint8 = new Uint8Array(spleenArrayBuffer);
          await nvRef.current!.loadFromArrayBuffer(spleenUint8, 'spleen_mask.nii');
          
          // 비장 색상: 빨간색 (#EF4444)
          const maskIndex = liverMask ? 2 : 1;
          if (nvRef.current!.volumes.length > maskIndex) {
            nvRef.current!.volumes[maskIndex].colorMap = 'red';
            nvRef.current!.volumes[maskIndex].opacity = opacity / 100;
          }
          console.log(`${title}: Spleen mask 로드 완료`);
        }

        nvRef.current!.updateGLVolume();
      } catch (error) {
        console.error(`${title}: Segmentation mask 로드 실패:`, error);
      }
    };

    loadMasks();
  }, [liverMask, spleenMask, title, opacity]);

  // Brightness/Contrast/Opacity 반영
  useEffect(() => {
    if (!nvRef.current || nvRef.current.volumes.length === 0) return;

    try {
      const nv = nvRef.current;
      const baseVolume = nv.volumes[0];

      // Brightness & Contrast 적용
      // Niivue의 cal_min, cal_max를 조정하여 윈도우 레벨 변경
      const range = baseVolume.cal_max - baseVolume.cal_min;
      const center = (baseVolume.cal_max + baseVolume.cal_min) / 2;
      
      // Brightness: 중심값 이동 (-50 ~ +50)
      const brightnessOffset = ((brightness - 50) / 50) * range * 0.5;
      
      // Contrast: 범위 조정 (0.5 ~ 2.0)
      const contrastFactor = 0.5 + (contrast / 100) * 1.5;
      const newRange = range / contrastFactor;
      
      baseVolume.cal_min = center + brightnessOffset - newRange / 2;
      baseVolume.cal_max = center + brightnessOffset + newRange / 2;

      // Mask opacity 적용
      for (let i = 1; i < nv.volumes.length; i++) {
        nv.volumes[i].opacity = opacity / 100;
      }

      nv.updateGLVolume();
      
    } catch (error) {
      console.error(`${title}: 뷰 컨트롤 적용 실패:`, error);
    }
  }, [brightness, contrast, opacity, title]);

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
    <div className="flex flex-col h-full bg-[#020617] rounded-lg border border-white/5 p-3">
      {/* 상단: 제목 + 확대 버튼 */}
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-medium text-slate-300">{title}</h3>
        <button
          onClick={handleFullscreen}
          className="p-1.5 hover:bg-white/5 rounded transition"
          title="확대"
        >
          <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
          </svg>
        </button>
      </div>

      {/* 중앙: Canvas */}
      <div className="flex-1 relative bg-black rounded overflow-hidden">
        <canvas
          ref={canvasRef}
          id={`canvas-${id}`}
          className="w-full h-full"
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

      {/* 하단: Slice 슬라이더 (3D 제외) */}
      {orientation !== '3d' && (
        <div className="mt-3">
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
              {currentSlice}/{maxSlice}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

