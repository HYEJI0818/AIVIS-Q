'use client';

import { useState } from 'react';
import { useCtSessionStore } from '@/store/useCtSessionStore';
import { PediatricReferenceInput } from '@/lib/ctTypes';

export default function PediatricReferenceModal() {
  const { isPediatricModalOpen, closePediatricModal } = useCtSessionStore();
  const [showResult, setShowResult] = useState(false);
  
  const [formData, setFormData] = useState<PediatricReferenceInput>({
    sex: 'M',
    birthDate: '',
    studyDate: '',
    heightCm: 0,
    weightKg: 0,
    ageYears: 0,
  });

  if (!isPediatricModalOpen) return null;

  const handleCalculate = () => {
    console.log('참고치 계산:', formData);
    // TODO: 실제 소아 참고치 API 연동
    setShowResult(true);
  };

  const mockPercentiles = {
    liver: { p5: 800, p25: 950, p50: 1100, p75: 1250, p95: 1400 },
    spleen: { p5: 80, p25: 100, p50: 120, p75: 140, p95: 160 },
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-[90vw] max-w-4xl max-h-[90vh] bg-[#0B1220] rounded-2xl border border-white/10 shadow-2xl flex flex-col overflow-hidden">
        {/* 헤더 */}
        <div className="flex justify-between items-center p-6 border-b border-white/5">
          <h2 className="text-xl font-semibold text-slate-100">소아 참고치 비교</h2>
          <button
            onClick={() => {
              closePediatricModal();
              setShowResult(false);
            }}
            className="p-2 hover:bg-white/5 rounded-lg transition"
          >
            <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 본문 */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* 입력 폼 */}
          {!showResult && (
            <div className="max-w-2xl mx-auto">
              <h3 className="text-lg font-semibold text-slate-200 mb-4">환자 정보 입력</h3>
              
              <div className="space-y-4">
                {/* 성별 */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">성별</label>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setFormData({ ...formData, sex: 'M' })}
                      className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition ${
                        formData.sex === 'M'
                          ? 'bg-[#0066CC] text-white'
                          : 'bg-[#020617] text-slate-400 border border-white/10 hover:bg-[#1F2937]'
                      }`}
                    >
                      남성
                    </button>
                    <button
                      onClick={() => setFormData({ ...formData, sex: 'F' })}
                      className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition ${
                        formData.sex === 'F'
                          ? 'bg-[#0066CC] text-white'
                          : 'bg-[#020617] text-slate-400 border border-white/10 hover:bg-[#1F2937]'
                      }`}
                    >
                      여성
                    </button>
                  </div>
                </div>

                {/* 생년월일 / 촬영일자 */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">생년월일</label>
                    <input
                      type="date"
                      value={formData.birthDate}
                      onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                      className="w-full px-4 py-2.5 bg-[#020617] border border-white/10 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0066CC]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">촬영일자</label>
                    <input
                      type="date"
                      value={formData.studyDate}
                      onChange={(e) => setFormData({ ...formData, studyDate: e.target.value })}
                      className="w-full px-4 py-2.5 bg-[#020617] border border-white/10 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0066CC]"
                    />
                  </div>
                </div>

                {/* 키 / 체중 / 나이 */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">키 (cm)</label>
                    <input
                      type="number"
                      value={formData.heightCm || ''}
                      onChange={(e) => setFormData({ ...formData, heightCm: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-2.5 bg-[#020617] border border-white/10 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0066CC]"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">체중 (kg)</label>
                    <input
                      type="number"
                      value={formData.weightKg || ''}
                      onChange={(e) => setFormData({ ...formData, weightKg: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-2.5 bg-[#020617] border border-white/10 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0066CC]"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">나이 (만)</label>
                    <input
                      type="number"
                      value={formData.ageYears || ''}
                      onChange={(e) => setFormData({ ...formData, ageYears: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-2.5 bg-[#020617] border border-white/10 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0066CC]"
                      placeholder="0"
                    />
                  </div>
                </div>

                {/* 계산 버튼 */}
                <button
                  onClick={handleCalculate}
                  className="w-full py-3 bg-[#0066CC] hover:bg-[#004A99] text-white font-semibold rounded-lg transition mt-6"
                >
                  참고치 계산 및 비교
                </button>
              </div>
            </div>
          )}

          {/* 결과 표시 */}
          {showResult && (
            <div className="space-y-6">
              {/* 백분위수 표 */}
              <div>
                <h3 className="text-lg font-semibold text-slate-200 mb-4">백분위수 비교표</h3>
                
                {/* 간 볼륨 */}
                <div className="mb-4">
                  <p className="text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-[#22C55E]" />
                    간 볼륨 (Liver Volume)
                  </p>
                  <div className="bg-[#020617] rounded-lg overflow-hidden border border-white/5">
                    <table className="w-full text-sm">
                      <thead className="bg-[#0B1220]">
                        <tr>
                          <th className="px-4 py-2 text-left text-slate-400 font-medium">5%</th>
                          <th className="px-4 py-2 text-left text-slate-400 font-medium">25%</th>
                          <th className="px-4 py-2 text-left text-slate-400 font-medium">50%</th>
                          <th className="px-4 py-2 text-left text-slate-400 font-medium">75%</th>
                          <th className="px-4 py-2 text-left text-slate-400 font-medium">95%</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="px-4 py-3 text-slate-200">{mockPercentiles.liver.p5} cc</td>
                          <td className="px-4 py-3 text-slate-200">{mockPercentiles.liver.p25} cc</td>
                          <td className="px-4 py-3 text-slate-200 bg-[#0066CC]/10">{mockPercentiles.liver.p50} cc</td>
                          <td className="px-4 py-3 text-slate-200">{mockPercentiles.liver.p75} cc</td>
                          <td className="px-4 py-3 text-slate-200">{mockPercentiles.liver.p95} cc</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">환자값: 1050 cc (약 50 백분위)</p>
                </div>

                {/* 비장 볼륨 */}
                <div>
                  <p className="text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-[#EF4444]" />
                    비장 볼륨 (Spleen Volume)
                  </p>
                  <div className="bg-[#020617] rounded-lg overflow-hidden border border-white/5">
                    <table className="w-full text-sm">
                      <thead className="bg-[#0B1220]">
                        <tr>
                          <th className="px-4 py-2 text-left text-slate-400 font-medium">5%</th>
                          <th className="px-4 py-2 text-left text-slate-400 font-medium">25%</th>
                          <th className="px-4 py-2 text-left text-slate-400 font-medium">50%</th>
                          <th className="px-4 py-2 text-left text-slate-400 font-medium">75%</th>
                          <th className="px-4 py-2 text-left text-slate-400 font-medium">95%</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="px-4 py-3 text-slate-200">{mockPercentiles.spleen.p5} cc</td>
                          <td className="px-4 py-3 text-slate-200">{mockPercentiles.spleen.p25} cc</td>
                          <td className="px-4 py-3 text-slate-200 bg-[#22D3EE]/10">{mockPercentiles.spleen.p50} cc</td>
                          <td className="px-4 py-3 text-slate-200">{mockPercentiles.spleen.p75} cc</td>
                          <td className="px-4 py-3 text-slate-200">{mockPercentiles.spleen.p95} cc</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">환자값: 115 cc (약 50 백분위)</p>
                </div>
              </div>

              {/* 그래프 placeholder */}
              <div>
                <h3 className="text-lg font-semibold text-slate-200 mb-4">백분위수 그래프</h3>
                <div className="bg-[#020617] rounded-lg border border-white/5 p-8 flex items-center justify-center h-64">
                  <div className="text-center">
                    <svg className="mx-auto h-12 w-12 text-slate-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                    </svg>
                    <p className="text-sm text-slate-400">체중별 볼륨 그래프</p>
                    <p className="text-xs text-slate-600 mt-1">TODO: Chart.js 또는 Recharts 연동</p>
                  </div>
                </div>
              </div>

              {/* 다시 입력 버튼 */}
              <button
                onClick={() => setShowResult(false)}
                className="w-full py-3 bg-slate-700 hover:bg-slate-600 text-slate-200 font-medium rounded-lg transition"
              >
                다시 입력
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

