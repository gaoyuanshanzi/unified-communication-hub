"use client";

import React, { useState, useRef, useEffect } from "react";

interface ServiceFrameProps {
  title: string;
  url: string;
  icon: React.ReactNode;
  colorClass: string;
}

export default function ServiceFrame({ title, url, icon, colorClass }: ServiceFrameProps) {
  const [isElectron, setIsElectron] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const webviewRef = useRef<any>(null);

  const partitionName = `persist:${title.toLowerCase().replace(/\s+/g, "")}`;

  useEffect(() => {
    // Electron 환경 감지
    if (typeof window !== "undefined") {
      const isEl =
        (window as any).isElectron ||
        navigator.userAgent.includes("Electron");
      setIsElectron(Boolean(isEl));
    }
  }, []);

  const handleReload = () => {
    if (isElectron && webviewRef.current) {
      if (typeof webviewRef.current.reload === "function") {
        webviewRef.current.reload();
      }
    }
  };

  const handleGoBack = () => {
    if (isElectron && webviewRef.current) {
      if (typeof webviewRef.current.canGoBack === "function" && webviewRef.current.canGoBack()) {
        webviewRef.current.goBack();
      }
    }
  };

  return (
    <div
      className={`flex flex-col rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden transition-all duration-200
                  ${isFullscreen ? "fixed inset-4 z-50 shadow-2xl" : "h-full"}`}
    >
      {/* 컬럼 헤더 */}
      <div className={`flex items-center justify-between px-4 py-3 border-b border-slate-100 ${colorClass}`}>
        <div className="flex items-center gap-2.5">
          <span className="flex-shrink-0">{icon}</span>
          <span className="font-semibold text-sm text-slate-800">{title}</span>
          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-white/80 text-slate-600 border border-slate-200/60">
            {isElectron ? "App Native" : "Web Hub"}
          </span>
        </div>

        <div className="flex items-center gap-1">
          {isElectron && (
            <button
              onClick={handleGoBack}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-white/80 transition-all"
              title="뒤로 가기"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}

          {/* 새로고침 */}
          <button
            onClick={handleReload}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-white/80 transition-all"
            title="새로고침"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>

          {/* 전체화면 토글 */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-white/80 transition-all"
            title={isFullscreen ? "원래 크기로" : "전체화면"}
          >
            {isFullscreen ? (
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
                />
              </svg>
            )}
          </button>

          {/* 새 탭/브라우저에서 열기 */}
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-white/80 transition-all"
            title="새 브라우저 창에서 열기"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
          </a>
        </div>
      </div>

      {/* 본문 콘텐츠 영역 */}
      <div className="relative flex-1 min-h-0 bg-slate-50">
        {isElectron ? (
          // Electron 데스크톱 앱 모드: 네이티브 webview로 100% 임베딩 구동
          React.createElement("webview", {
            ref: webviewRef,
            src: url,
            partition: partitionName,
            allowpopups: "true",
            useragent:
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
            className: "w-full h-full border-0 bg-white",
          })
        ) : (
          // 웹 브라우저 (Vercel) 모드: 스마트 런처 및 새 탭 연동 UI
          <div className="h-full flex flex-col items-center justify-center p-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-white shadow-sm border border-slate-200 flex items-center justify-center mb-4">
              {icon}
            </div>
            <h3 className="font-bold text-slate-800 text-base mb-1">{title} 서비스</h3>
            <p className="text-xs text-slate-500 max-w-xs mb-6 leading-relaxed">
              보안 정책(X-Frame)으로 인해 웹 브라우저에서는 분할 팝업으로 실행하거나, PC 전용 데스크톱 앱에서 실행 시 하나의 창 안에 100% 분할 임베딩됩니다.
            </p>

            <div className="flex flex-col gap-2.5 w-full max-w-xs">
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700
                           text-white text-sm font-semibold transition-all shadow-sm hover:shadow"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
                {title} 바로 열기
              </a>

              <button
                onClick={() => {
                  const width = Math.floor(window.screen.availWidth / 3);
                  const height = window.screen.availHeight;
                  const left =
                    title === "KakaoTalk" ? 0 : title === "Naver Mail" ? width : width * 2;
                  window.open(
                    url,
                    `hub_${title}`,
                    `width=${width},height=${height},left=${left},top=0,menubar=no,toolbar=no,location=no,status=no`
                  );
                }}
                className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-slate-200 bg-white
                           text-slate-700 text-xs font-medium hover:bg-slate-50 hover:border-slate-300 transition-all"
              >
                <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
                화면 1/3 분할 팝업으로 띄우기
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 하단 정보 바 */}
      <div className="px-3 py-2 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-[11px] text-slate-400">
        <span>독립 세션 파티션</span>
        <span className="text-slate-500 font-mono">{title}</span>
      </div>
    </div>
  );
}
