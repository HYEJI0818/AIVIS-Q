'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
    // 간단한 유효성 검증
    if (!username.trim() || !password.trim()) {
      setError('아이디와 비밀번호를 모두 입력해주세요.');
      return;
    }

    // TODO: 실제 인증 API 연동 필요
    // 현재는 간단히 입력값만 확인
    console.log('로그인 시도:', { username, password });
    
    // 로그인 성공 시 메인 페이지로 이동
    router.push('/app');
  };

  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* 로고 및 타이틀 */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#0066CC]/20 mb-4">
            <span className="text-[#0066CC] font-bold text-3xl">A</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-100 mb-2">
            AIVIS-Q Abdomen CT
          </h1>
          <p className="text-slate-400 text-sm">
            복부 CT 고형장기 자동화 분할 소프트웨어
          </p>
        </div>

        {/* 로그인 카드 */}
        <div className="rounded-2xl bg-[#0B1220] border border-white/5 shadow-sm p-6">
          <form onSubmit={handleLogin} className="space-y-4">
            {/* 아이디 입력 */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-slate-300 mb-2">
                아이디
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setError('');
                }}
                className="w-full px-4 py-2.5 bg-[#020617] border border-white/10 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#0066CC] focus:border-transparent transition"
                placeholder="아이디를 입력하세요"
              />
            </div>

            {/* 비밀번호 입력 */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-2">
                비밀번호
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
                className="w-full px-4 py-2.5 bg-[#020617] border border-white/10 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#0066CC] focus:border-transparent transition"
                placeholder="비밀번호를 입력하세요"
              />
            </div>

            {/* 에러 메시지 */}
            {error && (
              <div className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            {/* 로그인 버튼 */}
            <button
              type="submit"
              className="w-full py-3 bg-[#0066CC] hover:bg-[#004A99] text-white font-semibold rounded-lg transition duration-200 shadow-lg shadow-[#0066CC]/20"
            >
              로그인
            </button>
          </form>

          {/* 추가 정보 */}
          <div className="mt-6 text-center">
            <p className="text-xs text-slate-500">
              문의: support@aivisq.com
            </p>
          </div>
        </div>

        {/* 하단 정보 */}
        <div className="mt-6 text-center text-xs text-slate-600">
          <p>© 2024 AIVIS-Q. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}

