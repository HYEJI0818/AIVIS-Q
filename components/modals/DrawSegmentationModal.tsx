'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Niivue } from '@niivue/niivue';
import { useCtSessionStore } from '@/store/useCtSessionStore';

// 형광펜 색상 옵션
const HIGHLIGHTER_COLORS = [
  { name: '빨강', color: '#FF4444' },
  { name: '파랑', color: '#4488FF' },
];

export default function DrawSegmentationModal() {
  const { isDrawingModalOpen, closeDrawingModal, ctFile, maskFiles, opacity } = useCtSessionStore();
  const [activeTab, setActiveTab] = useState<'3d' | 'axial' | 'coronal' | 'sagittal'>('axial');
  const [tool, setTool] = useState<'pen' | 'highlighter' | 'eraser'>('pen');
  const [brushSize, setBrushSize] = useState(3);
  const [highlighterSize, setHighlighterSize] = useState(20);
  const [highlighterOpacity, setHighlighterOpacity] = useState(50);
  const [highlighterColorIndex, setHighlighterColorIndex] = useState(0);
  const [sliceIndex, setSliceIndex] = useState(50);
  const [maxSlice, setMaxSlice] = useState(100);
  const [isLoading, setIsLoading] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  
  const niivueCanvasRef = useRef<HTMLCanvasElement>(null);
  const drawingCanvasRef = useRef<HTMLCanvasElement>(null);
  const nvRef = useRef<Niivue | null>(null);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);

  // Drawing Canvas 초기화 및 리사이즈
  useEffect(() => {
    if (!drawingCanvasRef.current || !niivueCanvasRef.current || !isDrawingModalOpen) return;
    
    const resizeCanvas = () => {
      const niivueCanvas = niivueCanvasRef.current;
      const drawingCanvas = drawingCanvasRef.current;
      if (!niivueCanvas || !drawingCanvas) return;
      
      // Niivue 캔버스와 같은 크기로 설정
      const rect = niivueCanvas.getBoundingClientRect();
      drawingCanvas.width = rect.width;
      drawingCanvas.height = rect.height;
    };
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [isDrawingModalOpen, activeTab]);

  // Niivue 초기화
  useEffect(() => {
    if (!niivueCanvasRef.current || !isDrawingModalOpen) return;

    try {
      const nv = new Niivue({
        dragAndDropEnabled: false,
        backColor: [0, 0, 0, 1],
        show3Dcrosshair: true,
        isColorbar: false,
        drawingEnabled: false, // Niivue drawing 비활성화 (Canvas overlay 사용)
      });

      nv.attachToCanvas(niivueCanvasRef.current);
      nvRef.current = nv;

      // Orientation 설정
      if (activeTab === 'axial') {
        nv.setSliceType(nv.sliceTypeAxial);
      } else if (activeTab === 'coronal') {
        nv.setSliceType(nv.sliceTypeCoronal);
      } else if (activeTab === 'sagittal') {
        nv.setSliceType(nv.sliceTypeSagittal);
      } else if (activeTab === '3d') {
        nv.setSliceType(nv.sliceTypeRender);
      }

      console.log(`Draw Modal Niivue 초기화 완료: ${activeTab}`);
    } catch (error) {
      console.error('Draw Modal Niivue 초기화 실패:', error);
    }
  }, [activeTab, isDrawingModalOpen]);

  // CT 파일 로드 (마스크 포함)
  useEffect(() => {
    if (!nvRef.current || !ctFile || !isDrawingModalOpen) return;

    const loadCTFile = async () => {
      setIsLoading(true);
      try {
        console.log(`Draw Modal: CT 파일 로드 시작 - ${ctFile.name}`);

        // 기존 볼륨 제거
        while (nvRef.current!.volumes.length > 0) {
          nvRef.current!.removeVolume(nvRef.current!.volumes[0]);
        }

        // 로드할 볼륨 목록 구성 (CT 볼륨 + 마스크들)
        const volumesToLoad: any[] = [{
          url: URL.createObjectURL(ctFile),
          name: ctFile.name
        }];

        // 마스크 파일들도 함께 로드 (다중 레이블 마스크 지원)
        if (maskFiles && maskFiles.length > 0) {
          maskFiles.forEach((maskFile) => {
            volumesToLoad.push({
              url: URL.createObjectURL(maskFile),
              name: maskFile.name,
              colormap: 'actc', // Anatomical CT colormap - 다중 레이블용
              opacity: opacity / 100,
            });
            console.log(`Draw Modal: 마스크 추가 - ${maskFile.name}`);
          });
        }

        // CT 파일 + 마스크 로드
        await nvRef.current!.loadVolumes(volumesToLoad);

        // 슬라이스 범위 업데이트
        const volumes = nvRef.current!.volumes;
        if (volumes.length > 0) {
          const volume = volumes[0];
          const dims = volume.dims;
          if (dims && dims.length >= 3) {
            if (activeTab === 'axial') {
              setMaxSlice(dims[2] - 1);
              setSliceIndex(Math.floor(dims[2] / 2));
            } else if (activeTab === 'coronal') {
              setMaxSlice(dims[1] - 1);
              setSliceIndex(Math.floor(dims[1] / 2));
            } else if (activeTab === 'sagittal') {
              setMaxSlice(dims[0] - 1);
              setSliceIndex(Math.floor(dims[0] / 2));
            }
          }
        }

        console.log(`Draw Modal: CT 파일 로드 완료 (마스크 ${maskFiles?.length || 0}개 포함)`);
      } catch (error) {
        console.error(`Draw Modal: CT 파일 로드 실패:`, error);
      } finally {
        setIsLoading(false);
      }
    };

    loadCTFile();
  }, [ctFile, maskFiles, activeTab, isDrawingModalOpen, opacity]);

  // 그리기 함수
  const draw = useCallback((x: number, y: number) => {
    const canvas = drawingCanvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const currentSize = tool === 'highlighter' ? highlighterSize : brushSize;
    
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    if (tool === 'eraser') {
      // 지우개 모드
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = 'rgba(0,0,0,1)';
      ctx.lineWidth = currentSize * 2;
    } else if (tool === 'pen') {
      // 펜 모드: 완전 불투명, 빨간색
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = '#FF0000';
      ctx.lineWidth = currentSize;
    } else if (tool === 'highlighter') {
      // 형광펜 모드: 반투명, 두꺼운 선
      ctx.globalCompositeOperation = 'source-over';
      const color = HIGHLIGHTER_COLORS[highlighterColorIndex].color;
      // hex to rgba with opacity
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
  }, [tool, brushSize, highlighterSize, highlighterOpacity, highlighterColorIndex]);

  // 마우스 이벤트 핸들러
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (activeTab === '3d') return; // 3D 뷰에서는 그리기 비활성화
    
    const canvas = drawingCanvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setIsDrawing(true);
    lastPosRef.current = { x, y };
    
    // 점 찍기 (클릭만 했을 때)
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const currentSize = tool === 'highlighter' ? highlighterSize : brushSize;
      
      if (tool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.fillStyle = 'rgba(0,0,0,1)';
      } else if (tool === 'pen') {
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = '#FF0000';
      } else if (tool === 'highlighter') {
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
  }, [activeTab, tool, brushSize, highlighterSize, highlighterOpacity, highlighterColorIndex]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || activeTab === '3d') return;
    
    const canvas = drawingCanvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    draw(x, y);
  }, [isDrawing, activeTab, draw]);

  const handleMouseUp = useCallback(() => {
    setIsDrawing(false);
    lastPosRef.current = null;
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsDrawing(false);
    lastPosRef.current = null;
  }, []);

  // 슬라이스 변경 핸들러
  const handleSliceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSlice = parseInt(e.target.value);
    setSliceIndex(newSlice);

    if (nvRef.current && nvRef.current.volumes.length > 0) {
      const nv = nvRef.current;
      const scene = nv.scene;
      
      if (activeTab === 'axial') {
        scene.crosshairPos[2] = newSlice / maxSlice;
      } else if (activeTab === 'coronal') {
        scene.crosshairPos[1] = newSlice / maxSlice;
      } else if (activeTab === 'sagittal') {
        scene.crosshairPos[0] = newSlice / maxSlice;
      }
      
      nv.updateGLVolume();
    }
  };

  // 캔버스 클리어
  const handleClearCanvas = () => {
    const canvas = drawingCanvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const handleSave = async () => {
    // Drawing canvas를 이미지로 저장
    const canvas = drawingCanvasRef.current;
    if (!canvas) return;
    
    try {
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `tumor_drawing_${Date.now()}.png`;
          a.click();
          URL.revokeObjectURL(url);
          alert('Drawing이 저장되었습니다!');
        }
      }, 'image/png');
      
      closeDrawingModal();
    } catch (error) {
      console.error('Drawing 저장 실패:', error);
      alert('Drawing 저장에 실패했습니다.');
    }
  };

  if (!isDrawingModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-[90vw] max-w-[1400px] h-[85vh] bg-[#0B1220] rounded-2xl border border-white/10 shadow-2xl flex flex-col">
        {/* 헤더 */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-white/5">
          <h2 className="text-xl font-semibold text-slate-100">Drawing</h2>
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
                onClick={() => {
                  setActiveTab(tab);
                  handleClearCanvas(); // 탭 변경 시 캔버스 클리어
                }}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                  activeTab === tab
                    ? 'bg-[#0066CC] text-white'
                    : 'bg-[#020617] text-slate-400 hover:bg-[#1F2937] border border-white/10'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          <div className="h-6 w-px bg-white/10" />

          {/* 툴 선택 */}
          <div className="flex gap-2">
            <button
              onClick={() => setTool('pen')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition flex items-center gap-2 ${
                tool === 'pen'
                  ? 'bg-[#FF0000] text-white'
                  : 'bg-[#020617] text-slate-400 hover:bg-[#1F2937] border border-white/10'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              펜
            </button>

            <button
              onClick={() => setTool('highlighter')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition flex items-center gap-2 ${
                tool === 'highlighter'
                  ? 'text-white shadow-lg'
                  : 'bg-[#020617] text-slate-400 hover:bg-[#1F2937] border border-white/10'
              }`}
              style={tool === 'highlighter' ? {
                backgroundColor: HIGHLIGHTER_COLORS[highlighterColorIndex].color,
              } : {}}
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M15.5 4.5L18.5 7.5L8.5 17.5L4 19L5.5 14.5L15.5 4.5ZM17.5 9.5L7.5 19.5H4V16.5L14 6.5L17.5 9.5Z" opacity="0.5"/>
                <rect x="3" y="20" width="18" height="2" rx="1"/>
              </svg>
              형광펜
            </button>
            
            <button
              onClick={() => setTool('eraser')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition flex items-center gap-2 ${
                tool === 'eraser'
                  ? 'bg-[#0066CC] text-white'
                  : 'bg-[#020617] text-slate-400 hover:bg-[#1F2937] border border-white/10'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              지우개
            </button>

            {/* 형광펜 컨트롤 (색상, 굵기, 투명도, 미리보기) - 인라인 */}
            {tool === 'highlighter' && (
              <>
                {/* 색상 */}
                <div className="flex items-center gap-1.5 ml-1">
                  {HIGHLIGHTER_COLORS.map((colorOption, index) => (
                    <button
                      key={colorOption.name}
                      onClick={() => setHighlighterColorIndex(index)}
                      className={`w-6 h-6 rounded-md transition-all border-2 ${
                        highlighterColorIndex === index
                          ? 'border-white scale-110'
                          : 'border-transparent hover:border-white/40'
                      }`}
                      style={{ 
                        backgroundColor: colorOption.color,
                        boxShadow: highlighterColorIndex === index ? `0 0 8px ${colorOption.color}80` : 'none'
                      }}
                      title={colorOption.name}
                    />
                  ))}
                </div>

                <div className="h-5 w-px bg-white/10" />

                {/* 굵기 */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">굵기</span>
                  <input
                    type="range"
                    min="10"
                    max="60"
                    value={highlighterSize}
                    onChange={(e) => setHighlighterSize(parseInt(e.target.value))}
                    className="w-16 h-1.5 rounded-full appearance-none cursor-pointer
                      [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 
                      [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white
                      [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:rounded-full 
                      [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-0"
                    style={{
                      background: `linear-gradient(to right, ${HIGHLIGHTER_COLORS[highlighterColorIndex].color}40, ${HIGHLIGHTER_COLORS[highlighterColorIndex].color})`,
                    }}
                  />
                  <span 
                    className="text-xs font-semibold w-8"
                    style={{ color: HIGHLIGHTER_COLORS[highlighterColorIndex].color }}
                  >
                    {highlighterSize}
                  </span>
                </div>

                <div className="h-5 w-px bg-white/10" />

                {/* 투명도 */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">투명도</span>
                  <input
                    type="range"
                    min="20"
                    max="80"
                    value={highlighterOpacity}
                    onChange={(e) => setHighlighterOpacity(parseInt(e.target.value))}
                    className="w-14 h-1.5 rounded-full appearance-none cursor-pointer
                      [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 
                      [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white
                      [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:rounded-full 
                      [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-0"
                    style={{
                      background: `linear-gradient(to right, transparent, ${HIGHLIGHTER_COLORS[highlighterColorIndex].color}90)`,
                    }}
                  />
                  <span 
                    className="text-xs font-semibold w-8"
                    style={{ color: HIGHLIGHTER_COLORS[highlighterColorIndex].color }}
                  >
                    {highlighterOpacity}%
                  </span>
                </div>

              </>
            )}
          </div>

          <div className="h-6 w-px bg-white/10" />

          {/* 펜/지우개 사이즈 */}
          {tool !== 'highlighter' && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-400">사이즈:</span>
              <input
                type="range"
                min="1"
                max="20"
                value={brushSize}
                onChange={(e) => setBrushSize(parseInt(e.target.value))}
                className="w-24 h-2 bg-[#1F2937] rounded-full appearance-none cursor-pointer
                  [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 
                  [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#0066CC]
                  [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full 
                  [&::-moz-range-thumb]:bg-[#0066CC] [&::-moz-range-thumb]:border-0"
              />
              <span className="text-sm text-[#0066CC] font-semibold w-10">{brushSize}px</span>
            </div>
          )}

          <div className="flex-1" />

          {/* 초기화 버튼 */}
          <button
            onClick={handleClearCanvas}
            className="px-4 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium rounded-lg transition"
          >
            초기화
          </button>

          {/* 저장 버튼 */}
          <button
            onClick={handleSave}
            className="px-5 py-1.5 bg-[#0066CC] hover:bg-[#004A99] text-white font-semibold rounded-lg transition"
          >
            저장
          </button>
        </div>

        {/* 본문: 뷰어 영역 */}
        <div className="flex-1 p-6 overflow-hidden flex flex-col">
          {/* 뷰어 + Drawing Canvas Overlay */}
          <div className="flex-1 bg-black rounded-xl border border-white/10 relative mb-4 overflow-hidden">
            {/* Niivue 캔버스 (아래 레이어) */}
            <canvas
              ref={niivueCanvasRef}
              className="w-full h-full absolute inset-0"
            />
            
            {/* Drawing 캔버스 (위 레이어 - 투명) */}
            <canvas
              ref={drawingCanvasRef}
              className="w-full h-full absolute inset-0"
              style={{ 
                cursor: activeTab === '3d' ? 'default' : 
                        tool === 'eraser' ? 'crosshair' : 'crosshair',
                pointerEvents: activeTab === '3d' ? 'none' : 'auto'
              }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseLeave}
            />

            {/* Placeholder */}
            {!ctFile && !isLoading && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center">
                  <svg className="mx-auto h-16 w-16 text-slate-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-sm text-slate-400">CT 파일 업로드 대기</p>
                  <p className="text-xs text-slate-600 mt-2">{activeTab.toUpperCase()} 뷰어</p>
                </div>
              </div>
            )}

            {/* 로딩 */}
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 pointer-events-none">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0066CC] mx-auto mb-2"></div>
                  <p className="text-xs text-slate-300">로딩 중...</p>
                </div>
              </div>
            )}

            {/* 3D 뷰 안내 */}
            {activeTab === '3d' && (
              <div className="absolute top-4 left-4 bg-black/60 px-3 py-2 rounded-lg pointer-events-none">
                <p className="text-xs text-yellow-400">⚠️ 3D 뷰에서는 그리기가 비활성화됩니다</p>
              </div>
            )}
          </div>

          {/* 하단 컨트롤 */}
          <div className="grid grid-cols-2 gap-6">
            {/* 슬라이스 조절 */}
            {activeTab !== '3d' && (
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
                  className="w-full h-2 bg-[#1F2937] rounded-full appearance-none cursor-pointer
                    [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 
                    [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#0066CC]
                    [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full 
                    [&::-moz-range-thumb]:bg-[#0066CC] [&::-moz-range-thumb]:border-0"
                />
              </div>
            )}

            {/* 안내 */}
            <div className={activeTab === '3d' ? 'col-span-2' : ''}>
              <div className="bg-slate-800/50 rounded-lg p-3">
                <p className="text-xs text-slate-400">
                  💡 <span className="text-slate-300 font-medium">펜</span>: 정밀한 빨간 선 그리기 | 
                  <span className="text-slate-300 font-medium ml-2">형광펜</span>: 반투명 두꺼운 하이라이트 | 
                  <span className="text-slate-300 font-medium ml-2">지우개</span>: 그린 내용 지우기
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
