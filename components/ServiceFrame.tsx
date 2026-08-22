"use client";

import { useState, useRef } from "react";

interface ServiceFrameProps {
  title: string;
  url: string;
  icon: React.ReactNode;
  colorClass: string;
}

export default function ServiceFrame({ title, url, icon, colorClass }: ServiceFrameProps) {
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [iframeError, setIframeError] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const proxyUrl = `/api/proxy?url=${encodeURIComponent(url)}`;

  const handleLoad = () => {
    setIframeLoaded(true);
    setIframeError(false);
  };

  const handleError = () => {
    setIframeLoaded(true);
    setIframeError(true);
  };

  const handleReload = () => {
    setIframeLoaded(false);
    setIframeError(false);
    if (iframeRef.current) {
      iframeRef.current.src = proxyUrl;
    }
  };

  return (
    <div className={`flex flex-col rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden
                     ${isFullscreen ? "fixed inset-4 z-50 shadow-2xl" : "h-full"}`}>
      {/* 컬럼 헤더 */}
      <div className={`flex items-center justify-between px-4 py-3 border-b border-slate-100 ${colorClass}`}>
        <div className="flex items-center gap-2.5">
          <span className="flex-shrink-0">{icon}</span>
          <span className="font-semibold text-sm text-slate-700">{title}</span>
          {/* 상태 인디케이터 */}
          <span className={`w-1.5 h-1.5 rounded-full ${iframeError ? "bg-red-400" : iframeLoaded ? "bg-green-400" : "bg-yellow-400 animate-pulse"}`} />
        </div>
        <div className="flex items-center gap-1.5">
          {/* 새로고침 */}
          <button
            onClick={handleReload}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-white/60 transition-all"
            title="새로고침"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          {/* 전체화면 토글 */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-white/60 transition-all"
            title={isFullscreen ? "원래 크기로" : "전체화면"}
          >
            {isFullscreen ? (
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            )}
          </button>
          {/* 새 탭에서 열기 */}
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-white/60 transition-all"
            title="새 탭에서 열기"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>
      </div>

      {/* iframe 영역 */}
      <div className="relative flex-1 min-h-0">
        {/* 로딩 스켈레톤 */}
        {!iframeLoaded && (
          <div className="absolute inset-0 bg-slate-50 flex flex-col items-center justify-center gap-3 z-10">
            <div className="flex gap-1.5">
              <div className="w-2 h-2 rounded-full bg-slate-300 animate-bounce" style={{ animationDelay: "0ms" }} />
              <div className="w-2 h-2 rounded-full bg-slate-300 animate-bounce" style={{ animationDelay: "150ms" }} />
              <div className="w-2 h-2 rounded-full bg-slate-300 animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
            <p className="text-xs text-slate-400">{title} 로딩 중...</p>
          </div>
        )}

        {/* 에러 폴백 UI */}
        {iframeError && (
          <div className="absolute inset-0 bg-slate-50 flex flex-col items-center justify-center gap-4 p-6 z-10">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center">
              {icon}
            </div>
            <div className="text-center">
              <p className="font-semibold text-slate-700 text-sm mb-1">{title} 직접 로드 불가</p>
              <p className="text-xs text-slate-400 leading-relaxed max-w-48">
                보안 정책(X-Frame-Options)으로 인해 프레임 내 표시가 제한됩니다.
                새 탭에서 직접 접속해 주세요.
              </p>
            </div>
            <div className="flex flex-col gap-2 w-full max-w-48">
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700
                           text-white text-sm font-medium transition-colors shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                새 탭에서 열기
              </a>
              <button
                onClick={handleReload}
                className="py-2.5 px-4 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium
                           hover:bg-slate-100 transition-colors"
              >
                다시 시도
              </button>
            </div>
          </div>
        )}

        <iframe
          ref={iframeRef}
          src={proxyUrl}
          className={`w-full h-full border-0 ${iframeError ? "opacity-0" : "opacity-100"}`}
          onLoad={handleLoad}
          onError={handleError}
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-top-navigation"
          title={title}
        />
      </div>

      {/* 하단 바 - 서비스 바로가기 버튼 */}
      <div className="px-3 py-2 border-t border-slate-100 bg-slate-50/50">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 text-xs text-slate-400 hover:text-blue-600 transition-colors"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          {title} 새 탭으로 열기 (권장)
        </a>
      </div>
    </div>
  );
}
