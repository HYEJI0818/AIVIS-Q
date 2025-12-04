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
  
  // 마스크 볼륨의 원본 cal_min/cal_max 저장 (밝기/대비 계산 기준)
  const maskOriginalCalRef = useRef<Map<number, { calMin: number; calMax: number }>>(new Map());

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

  // 마스크용 컬러맵 배열 (순차적으로 사용)
  const maskColorMaps = [
    'red',      // 빨강
    'green',    // 초록
    'blue',     // 파랑
    'yellow',   // 노랑
    'cyan',     // 청록
    'hot',      // 핫
    'winter',   // 윈터
    'cool',     // 쿨
  ];

  // 마스크 파일명에서 색상 결정
  const getColorMapForMask = (filename: string, index: number): string => {
    const lowerName = filename.toLowerCase();
    
    // 간(liver) → 빨간색
    if (lowerName.includes('liver')) {
      return 'red';
    }
    // 비장(spleen) → 초록색
    if (lowerName.includes('spleen')) {
      return 'green';
    }
    // 그 외는 순차적 컬러맵
    return maskColorMaps[index % maskColorMaps.length];
  };

  // 다중 레이블 마스크용 커스텀 LUT 생성
  // 0=배경(투명), 1=간(빨강), 2=비장(초록), 3이상=순차 색상
  const createMultiLabelLut = (): Uint8ClampedArray => {
    // Niivue LUT는 256 * 4 (RGBA) 크기의 Uint8ClampedArray
    const lut = new Uint8ClampedArray(256 * 4);
    
    // 레이블별 색상 정의 (RGBA, 0-255)
    const labelColors: [number, number, number, number][] = [
      [0, 0, 0, 0],         // 0: 배경 - 완전 투명
      [255, 80, 80, 200],   // 1: 간 - 빨간색
      [80, 255, 80, 200],   // 2: 비장 - 초록색
      [80, 80, 255, 200],   // 3: 파란색
      [255, 255, 80, 200],  // 4: 노란색
      [255, 80, 255, 200],  // 5: 마젠타
      [80, 255, 255, 200],  // 6: 시안
      [255, 165, 0, 200],   // 7: 오렌지
    ];

    for (let i = 0; i < 256; i++) {
      const offset = i * 4;
      if (i < labelColors.length) {
        lut[offset] = labelColors[i][0];     // R
        lut[offset + 1] = labelColors[i][1]; // G
        lut[offset + 2] = labelColors[i][2]; // B
        lut[offset + 3] = labelColors[i][3]; // A
      } else {
        // 8 이상은 순차 색상
        lut[offset] = (i * 37) % 256;
        lut[offset + 1] = (i * 73) % 256;
        lut[offset + 2] = (i * 113) % 256;
        lut[offset + 3] = 200;
      }
    }
    return lut;
  };

  // Niivue 초기화
  useEffect(() => {
    if (!canvasRef.current) return;

    try {
      const nv = new Niivue({
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

        // 기존 볼륨이 있으면 모두 제거
        while (nvRef.current!.volumes.length > 0) {
          nvRef.current!.removeVolume(nvRef.current!.volumes[0]);
        }

        // 로드할 볼륨 목록 구성
        const volumesToLoad: any[] = [];

        // maskOnly가 아닐 때만 CT 볼륨 추가
        if (!maskOnly) {
          volumesToLoad.push({
            url: URL.createObjectURL(ctFile),
            name: ctFile.name
          });
        }

        // 마스크 파일들 로드 (다중 레이블 마스크 지원)
        // 'actc' colormap은 세그멘테이션 레이블용 컬러맵
        if (maskFiles && maskFiles.length > 0) {
          maskFiles.forEach((maskFile) => {
            volumesToLoad.push({
              url: URL.createObjectURL(maskFile),
              name: maskFile.name,
              colormap: 'actc', // Anatomical CT colormap - 다중 레이블용
              opacity: maskOnly ? 1 : 0.4, // 초기값 40%, 이후 컨트롤러에서 조절
            });
            console.log(`${title}: 다중 레이블 마스크 추가 - ${maskFile.name}`);
          });
        }

        // 로드할 볼륨이 없으면 스킵 (maskOnly인데 마스크가 없는 경우)
        if (volumesToLoad.length === 0) {
          console.log(`${title}: 로드할 볼륨 없음`);
          setIsLoading(false);
          return;
        }

        // Niivue로 볼륨 + 마스크 함께 로드
        await nvRef.current!.loadVolumes(volumesToLoad);
        console.log(`${title}: 볼륨 로드 완료, 마스크 ${maskFiles?.length || 0}개 포함, maskOnly: ${maskOnly}`);

        // 슬라이스 범위 업데이트
        const volumes = nvRef.current!.volumes;
        if (volumes.length > 0) {
          const volume = volumes[0];
          const dims = volume.dims;
          if (dims && dims.length >= 3) {
            if (orientation === 'axial') {
              setMaxSlice(dims[2] - 1);
              setCurrentSlice(Math.floor(dims[2] / 2));
            } else if (orientation === 'coronal') {
              setMaxSlice(dims[1] - 1);
              setCurrentSlice(Math.floor(dims[1] / 2));
            } else if (orientation === 'sagittal') {
              setMaxSlice(dims[0] - 1);
              setCurrentSlice(Math.floor(dims[0] / 2));
            }
          }
          
          // 마스크 볼륨의 원본 cal_min/cal_max 저장
          maskOriginalCalRef.current.clear();
          const maskStartIndex = maskOnly ? 0 : 1;
          for (let i = maskStartIndex; i < volumes.length; i++) {
            maskOriginalCalRef.current.set(i, {
              calMin: volumes[i].cal_min ?? 0,
              calMax: volumes[i].cal_max ?? 1
            });
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
  }, [ctFile, maskFiles, title, orientation, maskOnly]);

  // Segmentation mask 로드 (레거시: liverMask/spleenMask가 별도로 설정될 때)
  useEffect(() => {
    // maskFiles가 있으면 이미 볼륨 로드에서 처리됨 - 레거시 마스크만 처리
    if (!nvRef.current || !ctFile || !volumeLoaded) return;
    if (maskFiles && maskFiles.length > 0) return; // maskFiles 있으면 스킵
    if (!liverMask && !spleenMask) return; // 레거시 마스크도 없으면 스킵

    const loadLegacyMasks = async () => {
      try {
        const volumesToLoad: any[] = [];

        if (liverMask) {
          volumesToLoad.push({
            url: URL.createObjectURL(liverMask),
            name: 'liver_mask.nii.gz',
            colorMap: 'red',  // 간 → 빨간색
            opacity: 0.4, // 초기값 40%, 이후 컨트롤러에서 조절
          });
        }

        if (spleenMask) {
          volumesToLoad.push({
            url: URL.createObjectURL(spleenMask),
            name: 'spleen_mask.nii.gz',
            colorMap: 'green',  // 비장 → 초록색
            opacity: 0.4, // 초기값 40%, 이후 컨트롤러에서 조절
          });
        }

        if (volumesToLoad.length > 0) {
          // 기존 볼륨 유지하면서 마스크 추가
          for (const vol of volumesToLoad) {
            await nvRef.current!.addVolumeFromUrl(vol);
          }
          console.log(`${title}: 레거시 마스크 로드 완료`);
        }
      } catch (error) {
        console.error(`${title}: 레거시 마스크 로드 실패:`, error);
      }
    };

    loadLegacyMasks();
  }, [liverMask, spleenMask, maskFiles, title, ctFile, volumeLoaded]);

  // Mask 밝기/대비/투명도 반영 (마스크에만 적용, CT 볼륨은 변경 안함)
  useEffect(() => {
    if (!nvRef.current || !ctFile || !volumeLoaded) return;
    if (nvRef.current.volumes.length === 0) return;

    try {
      const nv = nvRef.current;
      
      // maskOnly면 index 0부터, 아니면 index 1부터 마스크
      const maskStartIndex = maskOnly ? 0 : 1;
      
      // 마스크 볼륨이 없으면 스킵
      if (maskStartIndex >= nv.volumes.length) return;

      // 마스크 볼륨에만 밝기/대비/투명도 적용
      for (let i = maskStartIndex; i < nv.volumes.length; i++) {
        const maskVolume = nv.volumes[i];
        
        // Opacity 적용 (마스크에만)
        maskVolume.opacity = opacity / 100;
        
        // 원본 cal 값 가져오기 (저장된 값이 없으면 스킵)
        const originalCal = maskOriginalCalRef.current.get(i);
        if (originalCal) {
          const { calMin, calMax } = originalCal;
          const range = calMax - calMin;
          const center = (calMax + calMin) / 2;
          
          // Brightness: 중심값 이동 (-50 ~ +50)
          const brightnessOffset = ((brightness - 50) / 50) * range * 0.5;
          
          // Contrast: 범위 조정 (0.5 ~ 2.0)
          const contrastFactor = 0.5 + (contrast / 100) * 1.5;
          const newRange = range / contrastFactor;
          
          maskVolume.cal_min = center + brightnessOffset - newRange / 2;
          maskVolume.cal_max = center + brightnessOffset + newRange / 2;
        }
      }

      nv.updateGLVolume();
      console.log(`${title}: 마스크 컨트롤 적용 - opacity: ${opacity}%, brightness: ${brightness}, contrast: ${contrast}`);
      
    } catch (error) {
      console.error(`${title}: 마스크 컨트롤 적용 실패:`, error);
    }
  }, [brightness, contrast, opacity, title, ctFile, maskOnly, volumeLoaded]);

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
              {currentSlice}/{maxSlice}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

