'use client';

import { useCtSessionStore } from '@/store/useCtSessionStore';

export default function PatientInfoCard() {
  const { patientInfo } = useCtSessionStore();

  if (!patientInfo) {
    return (
      <div className="rounded-2xl bg-[#0B1220] border border-white/5 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-slate-300 mb-3">환자 정보</h3>
        <div className="text-center py-8">
          <svg className="mx-auto h-10 w-10 text-slate-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <p className="text-sm text-slate-500">환자 정보가 없습니다</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-[#0B1220] border border-white/5 shadow-sm p-5">
      <h3 className="text-sm font-semibold text-slate-300 mb-4">환자 정보</h3>
      
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-slate-400">이름</span>
          <span className="text-sm font-medium text-slate-100">{patientInfo.name}</span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-sm text-slate-400">성별</span>
          <span className="text-sm font-medium text-slate-100">
            {patientInfo.sex === 'M' ? '남성' : '여성'}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-sm text-slate-400">생년월일</span>
          <span className="text-sm font-medium text-slate-100">{patientInfo.birthDate}</span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-sm text-slate-400">촬영일자</span>
          <span className="text-sm font-medium text-slate-100">{patientInfo.studyDate}</span>
        </div>

        {patientInfo.ageYears !== null && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-400">나이 (만)</span>
            <span className="text-sm font-medium text-slate-100">{patientInfo.ageYears}세</span>
          </div>
        )}
      </div>
    </div>
  );
}

