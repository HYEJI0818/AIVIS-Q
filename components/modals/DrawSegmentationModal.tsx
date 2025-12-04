'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Niivue } from '@niivue/niivue';
import { useCtSessionStore } from '@/store/useCtSessionStore';

// ============================================
// 형광펜 모드용 색상
// ============================================
const HIGHLIGHTER_COLORS = [
  { name: '빨강', color: '#FF4444' },
  { name: '파랑', color: '#4488FF' },
];

// ============================================
// 마스크 편집 모드용 레이블
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
  const { isDrawingModalOpen, closeDrawingModal, ctFile, maskFiles, opacity } = useCtSessionStore();
  
  // ============================================
  // 공통 상태
  // ============================================
  const [editMode, setEditMode] = useState<'highlighter' | 'mask'>('highlighter');
  const [viewTab, setViewTab] = useState<'axial' | 'coronal' | 'sagittal'>('coronal');
  const [sliceIndex, setSliceIndex] = useState(50);
  const [maxSlice, setMaxSlice] = useState(100);
  const [isLoading, setIsLoading] = useState(false);
  const [isNiivueReady, setIsNiivueReady] = useState(false);
  
  // ============================================
  // 형광펜 모드 상태
  // ============================================
  const [hlTool, setHlTool] = useState<'pen' | 'highlighter' | 'eraser'>('highlighter');
  const [brushSize, setBrushSize] = useState(3);
  const [highlighterSize, setHighlighterSize] = useState(20);
  const [highlighterOpacity, setHighlighterOpacity] = useState(50);
  const [highlighterColorIndex, setHighlighterColorIndex] = useState(0);
  const [isDrawing, setIsDrawing] = useState(false);
  
  // ============================================
  // 마스크 편집 모드 상태
  // ============================================
  const [maskTool, setMaskTool] = useState<'draw' | 'erase'>('draw');
  const [selectedLabel, setSelectedLabel] = useState(1);
  const [drawOpacity, setDrawOpacity] = useState(80);
  const [isMaskLoaded, setIsMaskLoaded] = useState(false);
  const [isMaskDrawing, setIsMaskDrawing] = useState(false);
  const [maskBrushSize, setMaskBrushSize] = useState(5);
  
  // ============================================
  // Refs
  // ============================================
  const niivueCanvasRef = useRef<HTMLCanvasElement>(null);
  const drawingCanvasRef = useRef<HTMLCanvasElement>(null);
  const maskOverlayCanvasRef = useRef<HTMLCanvasElement>(null); // 마스크 편집용 overlay
  const nvRef = useRef<Niivue | null>(null);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);
  const maskUrlRef = useRef<string | null>(null);
  const ctUrlRef = useRef<string | null>(null);
  const volumeDimsRef = useRef<number[]>([0, 0, 0, 0]);
  const currentVoxelRef = useRef<number[]>([0, 0, 0]); // Niivue가 알려주는 현재 voxel 좌표

  // ============================================
  // 형광펜 모드: Drawing Canvas 초기화 및 리사이즈
  // ============================================
  useEffect(() => {
    if (!drawingCanvasRef.current || !niivueCanvasRef.current || !isDrawingModalOpen) return;
    if (editMode !== 'highlighter') return;
    
    const resizeCanvas = () => {
      const niivueCanvas = niivueCanvasRef.current;
      const drawingCanvas = drawingCanvasRef.current;
      if (!niivueCanvas || !drawingCanvas) return;
      
      const rect = niivueCanvas.getBoundingClientRect();
      drawingCanvas.width = rect.width;
      drawingCanvas.height = rect.height;
    };
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [isDrawingModalOpen, viewTab, editMode]);

  // ============================================
  // 마스크 편집 모드: Overlay Canvas 초기화
  // ============================================
  useEffect(() => {
    if (!maskOverlayCanvasRef.current || !niivueCanvasRef.current || !isDrawingModalOpen) return;
    if (editMode !== 'mask') return;
    
    const resizeCanvas = () => {
      const niivueCanvas = niivueCanvasRef.current;
      const overlayCanvas = maskOverlayCanvasRef.current;
      if (!niivueCanvas || !overlayCanvas) return;
      
      const rect = niivueCanvas.getBoundingClientRect();
      overlayCanvas.width = rect.width;
      overlayCanvas.height = rect.height;
    };
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [isDrawingModalOpen, viewTab, editMode]);

  // ============================================
  // Niivue 초기화 (한 번만!)
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

        console.log('Niivue 초기화 완료 (한 번만)');
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
  // 뷰 방향 변경 (Niivue 재초기화 없이!)
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
    
    console.log(`뷰 방향 변경: ${viewTab}`);
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

        if (editMode === 'highlighter') {
          // 형광펜 모드: CT + 마스크를 볼륨으로 로드
          const volumesToLoad: any[] = [{
            url: ctUrlRef.current,
            name: ctFile.name
          }];

          if (maskFiles && maskFiles.length > 0) {
            maskFiles.forEach((maskFile) => {
              volumesToLoad.push({
                url: URL.createObjectURL(maskFile),
                name: maskFile.name,
                colormap: 'actc',
                opacity: opacity / 100,
              });
            });
          }

          await nv.loadVolumes(volumesToLoad);
          nv.setDrawingEnabled(false);
          
        } else {
          // ============================================
          // 마스크 편집 모드 (3D 관통 지원)
          // ============================================
          
          // 1. CT 볼륨만 로드
          await nv.loadVolumes([{
            url: ctUrlRef.current,
            name: ctFile.name
          }]);

          // 2. Drawing 활성화 (Niivue 기본 drawing은 비활성화, 직접 처리)
          nv.setDrawingEnabled(true);
          nv.setDrawOpacity(drawOpacity / 100);
          nv.setDrawColormap(MASK_DRAW_COLORMAP);

          // 3. 마스크를 drawing 레이어로 로드
          if (maskFiles && maskFiles.length > 0) {
            if (maskUrlRef.current) {
              URL.revokeObjectURL(maskUrlRef.current);
            }
            maskUrlRef.current = URL.createObjectURL(maskFiles[0]);
            
            try {
              await nv.loadDrawingFromUrl(maskUrlRef.current);
              setIsMaskLoaded(true);
              console.log('마스크 drawing 레이어 로드 완료');
              
              // 볼륨 차원 저장
              if (nv.volumes.length > 0) {
                volumeDimsRef.current = nv.volumes[0].dims;
                console.log('볼륨 차원:', volumeDimsRef.current);
              }
            } catch (error) {
              console.error('마스크 로드 실패:', error);
            }
          }
          
          console.log('마스크 편집 모드 설정 완료 (3D 관통 지원)');
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

        console.log(`파일 로드 완료 (모드: ${editMode})`);
      } catch (error) {
        console.error('파일 로드 실패:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadFiles();
  }, [ctFile, maskFiles, isDrawingModalOpen, editMode, opacity, isNiivueReady]);

  // ============================================
  // 마스크 편집 모드: 투명도 변경
  // ============================================
  useEffect(() => {
    if (!nvRef.current || editMode !== 'mask' || !isNiivueReady) return;
    nvRef.current.setDrawOpacity(drawOpacity / 100);
  }, [drawOpacity, editMode, isNiivueReady]);

  // ============================================
  // 3D 관통 그리기/지우기 함수 (Niivue의 voxel 좌표 직접 사용)
  // ============================================
  const draw3DPenetrate = useCallback(() => {
    if (!nvRef.current || !nvRef.current.drawBitmap) return;
    
    const nv = nvRef.current;
    const dims = volumeDimsRef.current;
    
    if (!dims || dims.length < 4) return;
    
    // Niivue가 알려준 현재 voxel 좌표 사용
    const voxel = currentVoxelRef.current;
    if (!voxel) return;
    
    // 볼륨 차원
    const dimX = dims[1];
    const dimY = dims[2];
    const dimZ = dims[3];
    
    // 브러시 크기 (voxel 단위)
    const brushRadius = maskBrushSize;
    
    // 그릴 값 (0=지우기, 1~4=레이블)
    const penValue = maskTool === 'erase' ? 0 : selectedLabel;
    
    console.log(`3D 관통: voxel(${voxel[0]}, ${voxel[1]}, ${voxel[2]}) [${viewTab}] penValue=${penValue}`);
    
    // 뷰에 따라 3D 관통 적용
    if (viewTab === 'axial') {
      // Axial: Z축 방향으로 관통
      const centerX = voxel[0];
      const centerY = voxel[1];
      
      for (let dx = -brushRadius; dx <= brushRadius; dx++) {
        for (let dy = -brushRadius; dy <= brushRadius; dy++) {
          if (dx * dx + dy * dy > brushRadius * brushRadius) continue;
          
          const vx = centerX + dx;
          const vy = centerY + dy;
          
          if (vx < 0 || vx >= dimX || vy < 0 || vy >= dimY) continue;
          
          // 모든 Z에 대해 적용
          for (let z = 0; z < dimZ; z++) {
            const idx = vx + vy * dimX + z * dimX * dimY;
            if (idx >= 0 && idx < nv.drawBitmap.length) {
              nv.drawBitmap[idx] = penValue;
            }
          }
        }
      }
    } else if (viewTab === 'coronal') {
      // Coronal: Y축 방향으로 관통
      const centerX = voxel[0];
      const centerZ = voxel[2];
      
      for (let dx = -brushRadius; dx <= brushRadius; dx++) {
        for (let dz = -brushRadius; dz <= brushRadius; dz++) {
          if (dx * dx + dz * dz > brushRadius * brushRadius) continue;
          
          const vx = centerX + dx;
          const vz = centerZ + dz;
          
          if (vx < 0 || vx >= dimX || vz < 0 || vz >= dimZ) continue;
          
          // 모든 Y에 대해 적용
          for (let y = 0; y < dimY; y++) {
            const idx = vx + y * dimX + vz * dimX * dimY;
            if (idx >= 0 && idx < nv.drawBitmap.length) {
              nv.drawBitmap[idx] = penValue;
            }
          }
        }
      }
    } else if (viewTab === 'sagittal') {
      // Sagittal: X축 방향으로 관통
      const centerY = voxel[1];
      const centerZ = voxel[2];
      
      for (let dy = -brushRadius; dy <= brushRadius; dy++) {
        for (let dz = -brushRadius; dz <= brushRadius; dz++) {
          if (dy * dy + dz * dz > brushRadius * brushRadius) continue;
          
          const vy = centerY + dy;
          const vz = centerZ + dz;
          
          if (vy < 0 || vy >= dimY || vz < 0 || vz >= dimZ) continue;
          
          // 모든 X에 대해 적용
          for (let x = 0; x < dimX; x++) {
            const idx = x + vy * dimX + vz * dimX * dimY;
            if (idx >= 0 && idx < nv.drawBitmap.length) {
              nv.drawBitmap[idx] = penValue;
            }
          }
        }
      }
    }
    
    // Drawing 업데이트
    nv.refreshDrawing();
  }, [viewTab, maskTool, selectedLabel, maskBrushSize]);

  // ============================================
  // 마스크 편집 모드: Niivue 캔버스에 직접 이벤트 연결
  // ============================================
  useEffect(() => {
    if (!niivueCanvasRef.current || !isDrawingModalOpen || editMode !== 'mask') return;
    
    const canvas = niivueCanvasRef.current;
    let isDrawingLocal = false;
    
    const handleMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return; // 왼쪽 클릭만
      isDrawingLocal = true;
      // 약간의 딜레이 후 그리기 (onLocationChange가 먼저 호출되도록)
      setTimeout(() => {
        if (isDrawingLocal) draw3DPenetrate();
      }, 10);
    };
    
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDrawingLocal) return;
      // onLocationChange가 이미 voxel 좌표를 업데이트했으므로 바로 그리기
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
  }, [isDrawingModalOpen, editMode, draw3DPenetrate]);

  // 기존 오버레이 캔버스 핸들러 (형광펜 모드용으로만 유지)
  const handleMaskMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    // 마스크 모드에서는 사용 안 함 (Niivue 캔버스에서 직접 처리)
  }, []);

  const handleMaskMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    // 마스크 모드에서는 사용 안 함
  }, []);

  const handleMaskMouseUp = useCallback(() => {
    // 마스크 모드에서는 사용 안 함
  }, []);

  const handleMaskMouseLeave = useCallback(() => {
    // 마스크 모드에서는 사용 안 함
  }, []);

  // ============================================
  // 형광펜 모드: 그리기 함수
  // ============================================
  const drawHighlighter = useCallback((x: number, y: number) => {
    const canvas = drawingCanvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const currentSize = hlTool === 'highlighter' ? highlighterSize : brushSize;
    
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    if (hlTool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = 'rgba(0,0,0,1)';
      ctx.lineWidth = currentSize * 2;
    } else if (hlTool === 'pen') {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = '#FF0000';
      ctx.lineWidth = currentSize;
    } else if (hlTool === 'highlighter') {
      ctx.globalCompositeOperation = 'source-over';
      const color = HIGHLIGHTER_COLORS[highlighterColorIndex].color;
      const r = parseInt(color.slice(1, 3), 16);
      const g = parseInt(color.slice(3, 5), 16);
      const b = parseInt(color.slice(5, 7), 16);
      ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${highlighterOpacity / 100})`;
      ctx.lineWidth = currentSize;
    }

    if (lastPosRef.current) {
      ctx.beginPath();
      ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
      ctx.lineTo(x, y);
      ctx.stroke();
    }

    lastPosRef.current = { x, y };
  }, [hlTool, brushSize, highlighterSize, highlighterOpacity, highlighterColorIndex]);

  // ============================================
  // 형광펜 모드: 마우스 이벤트
  // ============================================
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (editMode !== 'highlighter') return;
    
    const canvas = drawingCanvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setIsDrawing(true);
    lastPosRef.current = { x, y };
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const currentSize = hlTool === 'highlighter' ? highlighterSize : brushSize;
      
      if (hlTool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.fillStyle = 'rgba(0,0,0,1)';
      } else if (hlTool === 'pen') {
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = '#FF0000';
      } else if (hlTool === 'highlighter') {
        ctx.globalCompositeOperation = 'source-over';
        const color = HIGHLIGHTER_COLORS[highlighterColorIndex].color;
        const r = parseInt(color.slice(1, 3), 16);
        const g = parseInt(color.slice(3, 5), 16);
        const b = parseInt(color.slice(5, 7), 16);
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${highlighterOpacity / 100})`;
      }
      
      ctx.beginPath();
      ctx.arc(x, y, currentSize / 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [editMode, hlTool, brushSize, highlighterSize, highlighterOpacity, highlighterColorIndex]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || editMode !== 'highlighter') return;
    
    const canvas = drawingCanvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    drawHighlighter(x, y);
  }, [isDrawing, editMode, drawHighlighter]);

  const handleMouseUp = useCallback(() => {
    setIsDrawing(false);
    lastPosRef.current = null;
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsDrawing(false);
    lastPosRef.current = null;
  }, []);

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
  // 형광펜 모드: 캔버스 클리어
  // ============================================
  const handleClearHighlighterCanvas = () => {
    const canvas = drawingCanvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  // ============================================
  // 마스크 편집 모드: Undo
  // ============================================
  const handleMaskUndo = () => {
    if (!nvRef.current) return;
    nvRef.current.drawUndo();
  };

  // ============================================
  // 마스크 편집 모드: 원본 복구
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
  // 형광펜 모드: PNG 저장
  // ============================================
  const handleSaveHighlighter = async () => {
    const canvas = drawingCanvasRef.current;
    if (!canvas) return;
    
    try {
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `annotation_${Date.now()}.png`;
          a.click();
          URL.revokeObjectURL(url);
          alert('형광펜 주석이 저장되었습니다!');
        }
      }, 'image/png');
      
      closeDrawingModal();
    } catch (error) {
      console.error('저장 실패:', error);
      alert('저장에 실패했습니다.');
    }
  };

  // ============================================
  // 마스크 편집 모드: NIfTI 저장
  // ============================================
  const handleSaveMask = async () => {
    if (!nvRef.current) return;
    
    try {
      const nv = nvRef.current;
      
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

  // ============================================
  // 모드 전환
  // ============================================
  const handleModeChange = (mode: 'highlighter' | 'mask') => {
    setEditMode(mode);
    if (mode === 'highlighter') {
      handleClearHighlighterCanvas();
    }
  };

  // ============================================
  // 뷰 탭 변경
  // ============================================
  const handleViewTabChange = (tab: 'axial' | 'coronal' | 'sagittal') => {
    setViewTab(tab);
    if (editMode === 'highlighter') {
      handleClearHighlighterCanvas();
    }
  };

  if (!isDrawingModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-[90vw] max-w-[1400px] h-[85vh] bg-[#0B1220] rounded-2xl border border-white/10 shadow-2xl flex flex-col">
        {/* 헤더 */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-white/5">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-semibold text-slate-100">Drawing</h2>
            
            <div className="flex bg-slate-800/50 rounded-lg p-1">
              <button
                onClick={() => handleModeChange('highlighter')}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                  editMode === 'highlighter'
                    ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white shadow-lg'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                ✏️ 형광펜 모드
              </button>
              <button
                onClick={() => handleModeChange('mask')}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                  editMode === 'mask'
                    ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                🎭 마스크 편집 (3D)
              </button>
            </div>

            {editMode === 'mask' && isMaskLoaded && (
              <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full">
                3D 관통 모드
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
                onClick={() => handleViewTabChange(tab)}
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

          {/* 형광펜 모드 컨트롤 */}
          {editMode === 'highlighter' && (
            <>
              <div className="flex gap-2">
                <button
                  onClick={() => setHlTool('pen')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition flex items-center gap-2 ${
                    hlTool === 'pen'
                      ? 'bg-[#FF0000] text-white'
                      : 'bg-[#020617] text-slate-400 hover:bg-[#1F2937] border border-white/10'
                  }`}
                >
                  펜
                </button>
                <button
                  onClick={() => setHlTool('highlighter')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition flex items-center gap-2 ${
                    hlTool === 'highlighter'
                      ? 'text-white shadow-lg'
                      : 'bg-[#020617] text-slate-400 hover:bg-[#1F2937] border border-white/10'
                  }`}
                  style={hlTool === 'highlighter' ? { backgroundColor: HIGHLIGHTER_COLORS[highlighterColorIndex].color } : {}}
                >
                  형광펜
                </button>
                <button
                  onClick={() => setHlTool('eraser')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition flex items-center gap-2 ${
                    hlTool === 'eraser'
                      ? 'bg-[#0066CC] text-white'
                      : 'bg-[#020617] text-slate-400 hover:bg-[#1F2937] border border-white/10'
                  }`}
                >
                  지우개
                </button>
              </div>

              <div className="flex-1" />

              <button onClick={handleClearHighlighterCanvas} className="px-4 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium rounded-lg transition">
                초기화
              </button>
              <button onClick={handleSaveHighlighter} className="px-5 py-1.5 bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-semibold rounded-lg transition">
                저장 (PNG)
              </button>
            </>
          )}

          {/* 마스크 편집 모드 컨트롤 */}
          {editMode === 'mask' && (
            <>
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

              <div className="flex gap-2">
                <button
                  onClick={() => setMaskTool('draw')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                    maskTool === 'draw' ? 'text-white' : 'bg-[#020617] text-slate-400 hover:bg-[#1F2937] border border-white/10'
                  }`}
                  style={maskTool === 'draw' ? { backgroundColor: MASK_LABELS.find(l => l.id === selectedLabel)?.color } : {}}
                >
                  그리기
                </button>
                <button
                  onClick={() => setMaskTool('erase')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                    maskTool === 'erase' ? 'bg-slate-500 text-white' : 'bg-[#020617] text-slate-400 hover:bg-[#1F2937] border border-white/10'
                  }`}
                >
                  지우기 (3D)
                </button>
                <button onClick={handleMaskUndo} className="px-3 py-1.5 rounded-lg text-sm bg-[#020617] text-slate-400 hover:bg-[#1F2937] border border-white/10">
                  Undo
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
                  className="w-16 h-1.5 rounded-full appearance-none cursor-pointer bg-slate-700"
                />
                <span className="text-xs text-slate-300 w-6">{maskBrushSize}</span>
              </div>

              <div className="h-6 w-px bg-white/10" />

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">투명도:</span>
                <input
                  type="range"
                  min="20"
                  max="100"
                  value={drawOpacity}
                  onChange={(e) => setDrawOpacity(parseInt(e.target.value))}
                  className="w-16 h-1.5 rounded-full appearance-none cursor-pointer bg-slate-700"
                />
                <span className="text-xs text-slate-300 w-8">{drawOpacity}%</span>
              </div>

              <div className="flex-1" />

              {maskFiles && maskFiles.length > 0 && (
                <button onClick={handleResetMask} className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg transition">
                  원본 복구
                </button>
              )}
              <button onClick={handleSaveMask} className="px-5 py-1.5 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold rounded-lg transition">
                저장 (.nii)
              </button>
            </>
          )}
        </div>

        {/* 본문: 뷰어 영역 */}
        <div className="flex-1 p-6 overflow-hidden flex flex-col">
          <div className="flex-1 bg-black rounded-xl border border-white/10 relative mb-4 overflow-hidden">
            <canvas 
              ref={niivueCanvasRef} 
              className="w-full h-full absolute inset-0" 
              style={{ cursor: editMode === 'mask' ? 'crosshair' : 'default' }}
            />
            
            {/* 형광펜 모드 overlay */}
            {editMode === 'highlighter' && (
              <canvas
                ref={drawingCanvasRef}
                className="w-full h-full absolute inset-0"
                style={{ cursor: 'crosshair' }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseLeave}
              />
            )}

            {/* 마스크 편집 모드: Niivue 캔버스에서 직접 마우스 이벤트 처리 */}
            {/* 오버레이 캔버스는 pointer-events: none으로 마우스 이벤트를 Niivue로 전달 */}
            {editMode === 'mask' && (
              <div 
                className="w-full h-full absolute inset-0"
                style={{ cursor: 'crosshair', pointerEvents: 'none' }}
              />
            )}

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

            <div className="absolute top-4 left-4 bg-black/70 px-3 py-2 rounded-lg pointer-events-none">
              {editMode === 'highlighter' ? (
                <p className="text-xs text-yellow-400">✏️ 형광펜 모드 (PNG 저장)</p>
              ) : (
                <p className="text-xs text-cyan-400">
                  🎭 {maskTool === 'erase' ? '3D 관통 지우기' : `3D 관통 그리기 (${MASK_LABELS.find(l => l.id === selectedLabel)?.shortName})`}
                </p>
              )}
            </div>

            {editMode === 'mask' && (
              <div className="absolute bottom-4 right-4 bg-black/70 px-3 py-2 rounded-lg pointer-events-none">
                <p className="text-xs text-green-400">🔥 3D 관통: 모든 슬라이스에 적용됩니다!</p>
              </div>
            )}
          </div>

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
            <div className="bg-slate-800/50 rounded-lg p-3">
              <p className="text-xs text-slate-400">
                {editMode === 'mask' 
                  ? '🔥 3D 관통 모드: 한 곳에서 지우면/그리면 모든 슬라이스에 적용!'
                  : '💡 형광펜: 현재 화면에만 그립니다'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
