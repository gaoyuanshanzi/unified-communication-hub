"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import NativeMailColumn from "@/components/NativeMailColumn";

// 서비스별 아이콘
const KakaoIcon = () => (
  <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
    <path
      d="M12 3C6.477 3 2 6.477 2 10.8c0 2.787 1.616 5.231 4.063 6.694L5.2 20.4l3.863-2.4c.938.174 1.924.267 2.937.267 5.523 0 10-3.477 10-7.467C22 6.477 17.523 3 12 3z"
      fill="#FAE100"
    />
    <path
      d="M8.5 11.5H7v-3h1.5v3zm4.25 0H11.25v-3h1.5v3zm4.25 0H15.5v-3H17v3z"
      fill="#3C1E1E"
      opacity="0.9"
    />
  </svg>
);

const NaverIcon = () => (
  <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none">
    <rect width="24" height="24" rx="4" fill="#03C75A" />
    <path d="M13.4 12.5L10.2 7H7v10h3.6V11.5L14 17H17V7h-3.6v5.5z" fill="white" />
  </svg>
);

const GmailIcon = () => (
  <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none">
    <path d="M20 4H4C2.9 4 2 4.9 2 6v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2z" fill="#f44336" />
    <path d="M20 4L12 13 4 4" stroke="white" strokeWidth="1.5" fill="none" />
    <path d="M2 6l10 7 10-7" stroke="white" strokeWidth="0.5" fill="none" opacity="0.3" />
  </svg>
);

export default function DashboardPage() {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [savedAccounts, setSavedAccounts] = useState<any[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  // 모바일 전용 활성 탭 상태 ("kakao" | "naver" | "gmail")
  const [activeMobileTab, setActiveMobileTab] = useState<"kakao" | "naver" | "gmail">("kakao");

  // 저장된 계정 목록 조회
  const fetchAccounts = useCallback(async () => {
    try {
      const res = await fetch("/api/mail/accounts");
      if (res.ok) {
        const data = await res.json();
        setSavedAccounts(data.accounts || []);
      }
    } catch (err) {
      console.error("계정 목록 불러오기 실패:", err);
    }
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch {
      setIsLoggingOut(false);
    }
  };

  const getAccountForProvider = (provider: string) => {
    return savedAccounts.find((acc) => acc.provider === provider) || null;
  };

  return (
    <div className="flex flex-col h-[100dvh] bg-slate-100/70 overflow-hidden font-sans">
      {/* 상단 통합 헤더 */}
      <header className="flex-shrink-0 bg-white border-b border-slate-200 px-3 sm:px-5 py-2.5 sm:py-3 shadow-xs z-10">
        <div className="flex items-center justify-between max-w-full">
          {/* 좌측: 로고 및 타이틀 */}
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-blue-600 shadow-xs flex-shrink-0">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-sm sm:text-base font-bold text-slate-900 leading-tight truncate">
                  Unified Communication Hub
                </h1>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  ⚡ Native IMAP
                </span>
              </div>
              <p className="hidden sm:block text-xs text-slate-400 mt-0.5">
                카카오(다음) 메일 · 네이버 메일 · Gmail 통합 실시간 웹메일 클라이언트
              </p>
            </div>
          </div>

          {/* 우측: 전체 동기화 & 로그아웃 */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                fetchAccounts();
                setRefreshKey((k) => k + 1);
              }}
              className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-all shadow-2xs"
              title="전체 편지함 새로고침"
            >
              <svg className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              <span className="hidden sm:inline">전체 새로고침</span>
            </button>

            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-semibold text-slate-700">admin</span>
            </div>

            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all shadow-2xs"
            >
              로그아웃
            </button>
          </div>
        </div>
      </header>

      {/* 📱 모바일 전용 3개 서비스 탭 바 (PC/lg 이상에서는 자동 숨김) */}
      <nav className="lg:hidden flex-shrink-0 bg-white border-b border-slate-200 px-2 py-1.5 flex items-center gap-1.5 shadow-2xs z-10">
        {/* 카카오 탭 */}
        <button
          onClick={() => setActiveMobileTab("kakao")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-bold transition-all ${
            activeMobileTab === "kakao"
              ? "bg-amber-100/70 text-amber-950 border border-amber-300/80 shadow-2xs font-extrabold"
              : "text-slate-500 hover:bg-slate-50 border border-transparent"
          }`}
        >
          <KakaoIcon />
          <span className="truncate">Kakao / Daum</span>
        </button>

        {/* 네이버 탭 */}
        <button
          onClick={() => setActiveMobileTab("naver")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-bold transition-all ${
            activeMobileTab === "naver"
              ? "bg-emerald-50 text-emerald-900 border border-emerald-300 shadow-2xs font-extrabold"
              : "text-slate-500 hover:bg-slate-50 border border-transparent"
          }`}
        >
          <NaverIcon />
          <span className="truncate">Naver</span>
        </button>

        {/* Gmail 탭 */}
        <button
          onClick={() => setActiveMobileTab("gmail")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-bold transition-all ${
            activeMobileTab === "gmail"
              ? "bg-red-50 text-red-900 border border-red-300 shadow-2xs font-extrabold"
              : "text-slate-500 hover:bg-slate-50 border border-transparent"
          }`}
        >
          <GmailIcon />
          <span className="truncate">Gmail</span>
        </button>
      </nav>

      {/* 메인 메일 패널 영역 (모바일: 선택 탭 단일 100% 뷰 / PC: 3열 동시 뷰) */}
      <main
        key={refreshKey}
        className="flex-1 min-h-0 p-2 sm:p-3.5 lg:grid lg:grid-cols-3 lg:gap-3.5 overflow-hidden"
      >
        {/* 1. 카카오 / 다음 메일 */}
        <div className={`h-full min-h-0 ${activeMobileTab === "kakao" ? "flex flex-col" : "hidden lg:flex lg:flex-col"}`}>
          <NativeMailColumn
            provider="kakao"
            title="Kakao / Daum Mail"
            icon={<KakaoIcon />}
            colorClass="bg-yellow-50/80"
            defaultHost="imap.daum.net"
            defaultPort={993}
            guideText="Daum 메일 설정에서 IMAP을 '사용함'으로 설정하고, 2단계 인증용 '애플리케이션 비밀번호'를 입력하세요."
            guideLink="https://mail.daum.net"
            savedAccount={getAccountForProvider("kakao")}
            onAccountSaved={fetchAccounts}
            onAccountDeleted={fetchAccounts}
          />
        </div>

        {/* 2. 네이버 메일 */}
        <div className={`h-full min-h-0 ${activeMobileTab === "naver" ? "flex flex-col" : "hidden lg:flex lg:flex-col"}`}>
          <NativeMailColumn
            provider="naver"
            title="Naver Mail"
            icon={<NaverIcon />}
            colorClass="bg-green-50/80"
            defaultHost="imap.naver.com"
            defaultPort={993}
            guideText="네이버 메일 환경설정 > POP3/IMAP 설정에서 IMAP/SMTP를 '사용함'으로 켠 후, 네이버 2단계 인증용 '애플리케이션 비밀번호'를 입력하세요."
            guideLink="https://mail.naver.com/v2/settings/pop3-imap"
            savedAccount={getAccountForProvider("naver")}
            onAccountSaved={fetchAccounts}
            onAccountDeleted={fetchAccounts}
          />
        </div>

        {/* 3. Gmail */}
        <div className={`h-full min-h-0 ${activeMobileTab === "gmail" ? "flex flex-col" : "hidden lg:flex lg:flex-col"}`}>
          <NativeMailColumn
            provider="gmail"
            title="Gmail"
            icon={<GmailIcon />}
            colorClass="bg-red-50/80"
            defaultHost="imap.gmail.com"
            defaultPort={993}
            guideText="Google 계정 관리 > 보안 > 2단계 인증 > '앱 비밀번호(App Password)'에서 생성한 16자리 비밀번호를 입력하세요."
            guideLink="https://myaccount.google.com/apppasswords"
            savedAccount={getAccountForProvider("gmail")}
            onAccountSaved={fetchAccounts}
            onAccountDeleted={fetchAccounts}
          />
        </div>
      </main>
    </div>
  );
}
