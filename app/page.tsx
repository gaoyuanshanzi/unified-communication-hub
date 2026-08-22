"use client";

import { useState } from "react";
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
    colorClass: "bg-yellow-50",
  },
  {
    title: "Naver Mail",
    url: "https://mail.naver.com",
    icon: <NaverIcon />,
    colorClass: "bg-green-50",
  },
  {
    title: "Gmail",
    url: "https://mail.google.com",
    icon: <GmailIcon />,
    colorClass: "bg-red-50",
  },
];

export default function DashboardPage() {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const now = new Date();

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

  return (
    <div className="flex flex-col h-screen bg-slate-50 overflow-hidden">
      {/* 상단 바 */}
      <header className="flex-shrink-0 bg-white border-b border-slate-200 px-4 py-3 shadow-sm">
        <div className="flex items-center justify-between max-w-full">
          {/* 좌측: 로고 + 타이틀 */}
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-blue-600 shadow-sm">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-800 leading-tight">
                Unified Communication Hub
              </h1>
              <p className="text-xs text-slate-400 leading-tight">
                통합 커뮤니케이션 허브
              </p>
            </div>
          </div>

          {/* 중앙: 서비스 레이블 */}
          <div className="hidden md:flex items-center gap-4">
            {services.map((svc) => (
              <div key={svc.title} className="flex items-center gap-1.5 text-xs text-slate-500">
                {svc.icon}
                <span>{svc.title}</span>
              </div>
            ))}
          </div>

          {/* 우측: 세션 정보 + 로그아웃 */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col items-end">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs font-medium text-slate-600">admin</span>
              </div>
              <span className="text-xs text-slate-400">
                {now.toLocaleString("ko-KR", {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })} 접속
              </span>
            </div>
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200
                         text-sm text-slate-600 font-medium hover:bg-slate-50 hover:border-slate-300
                         disabled:opacity-50 disabled:cursor-not-allowed
                         transition-all duration-150"
            >
              {isLoggingOut ? (
                <svg className="animate-spin w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              )}
              로그아웃
            </button>
          </div>
        </div>
      </header>

      {/* 안내 배너 */}
      <div className="flex-shrink-0 bg-amber-50 border-b border-amber-100 px-4 py-2">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-amber-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd" />
          </svg>
          <p className="text-xs text-amber-700">
            <strong>보안 정책 안내:</strong> KakaoTalk · Naver Mail · Gmail은 외부 프레임 삽입을 보안상 제한합니다.
            각 서비스 창 하단의 <strong>"새 탭으로 열기"</strong> 버튼을 이용해 직접 로그인하세요.
          </p>
        </div>
      </div>

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
