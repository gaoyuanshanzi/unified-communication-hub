"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import ServiceFrame from "@/components/ServiceFrame";

// 서비스 아이콘 컴포넌트들
const KakaoIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
    <path
      d="M12 3C6.477 3 2 6.477 2 10.8c0 2.787 1.616 5.231 4.063 6.694L5.2 20.4l3.863-2.4c.938.174 1.924.267 2.937.267 5.523 0 10-3.477 10-7.467C22 6.477 17.523 3 12 3z"
      className="text-yellow-500"
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
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
    <rect width="24" height="24" rx="4" fill="#03C75A" />
    <path d="M13.4 12.5L10.2 7H7v10h3.6V11.5L14 17H17V7h-3.6v5.5z" fill="white" />
  </svg>
);

const GmailIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
    <path d="M20 4H4C2.9 4 2 4.9 2 6v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2z" fill="#f44336" />
    <path d="M20 4L12 13 4 4" stroke="white" strokeWidth="1.5" fill="none" />
    <path d="M2 6l10 7 10-7" stroke="white" strokeWidth="0.5" fill="none" opacity="0.3" />
  </svg>
);

const services = [
  {
    title: "KakaoTalk",
    url: "https://accounts.kakao.com/login?continue=https://web.kakaotalk.com",
    icon: <KakaoIcon />,
    colorClass: "bg-yellow-50/80",
  },
  {
    title: "Naver Mail",
    url: "https://mail.naver.com",
    icon: <NaverIcon />,
    colorClass: "bg-green-50/80",
  },
  {
    title: "Gmail",
    url: "https://mail.google.com",
    icon: <GmailIcon />,
    colorClass: "bg-red-50/80",
  },
];

export default function DashboardPage() {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isElectron, setIsElectron] = useState(false);
  const now = new Date();

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsElectron(Boolean(window.isElectron || navigator.userAgent.includes("Electron")));
    }
  }, []);

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

  // 3개 창을 화면 가로 해상도에 맞춰 1:1:1로 자동 정렬하여 실행
  const handleLaunchTripleSplit = () => {
    if (typeof window === "undefined") return;
    const totalWidth = window.screen.availWidth;
    const colWidth = Math.floor(totalWidth / 3);
    const height = window.screen.availHeight;

    // 1. 카카오톡 (좌측 1/3)
    window.open(
      services[0].url,
      "win_kakao",
      `width=${colWidth},height=${height},left=0,top=0,menubar=no,toolbar=no,location=no,status=no`
    );

    // 2. 네이버 메일 (중앙 1/3)
    window.open(
      services[1].url,
      "win_naver",
      `width=${colWidth},height=${height},left=${colWidth},top=0,menubar=no,toolbar=no,location=no,status=no`
    );

    // 3. 지메일 (우측 1/3)
    window.open(
      services[2].url,
      "win_gmail",
      `width=${colWidth},height=${height},left=${colWidth * 2},top=0,menubar=no,toolbar=no,location=no,status=no`
    );
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 overflow-hidden">
      {/* 상단 바 */}
      <header className="flex-shrink-0 bg-white border-b border-slate-200 px-4 py-3 shadow-xs">
        <div className="flex items-center justify-between max-w-full">
          {/* 좌측: 로고 + 타이틀 */}
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-blue-600 shadow-sm">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-slate-800 leading-tight">
                  Unified Communication Hub
                </h1>
                <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-100">
                  {isElectron ? "🖥️ Desktop App 모드" : "🌐 Web Hub 모드"}
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-tight mt-0.5">
                카카오톡 · 네이버 메일 · Gmail 통합 대시보드
              </p>
            </div>
          </div>

          {/* 중앙: 3분할 팝업 일괄 실행 버튼 (웹 모드 전용) */}
          {!isElectron && (
            <button
              onClick={handleLaunchTripleSplit}
              className="hidden md:flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600
                         text-white text-xs font-semibold hover:from-blue-700 hover:to-indigo-700
                         shadow-sm hover:shadow transition-all duration-200"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              모니터 3등분 윈도우 일괄 실행
            </button>
          )}

          {/* 우측: 세션 정보 + 로그아웃 */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col items-end">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-semibold text-slate-700">admin</span>
              </div>
              <span className="text-[11px] text-slate-400">
                {now.toLocaleString("ko-KR", {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200
                         text-xs text-slate-600 font-medium hover:bg-slate-50 hover:border-slate-300
                         disabled:opacity-50 disabled:cursor-not-allowed
                         transition-all duration-150"
            >
              {isLoggingOut ? (
                <svg className="animate-spin w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              )}
              로그아웃
            </button>
          </div>
        </div>
      </header>

      {/* 3열 그리드 메인 영역 */}
      <main className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-3 gap-3 p-3">
        {services.map((svc) => (
          <ServiceFrame
            key={svc.title}
            title={svc.title}
            url={svc.url}
            icon={svc.icon}
            colorClass={svc.colorClass}
          />
        ))}
      </main>
    </div>
  );
}
