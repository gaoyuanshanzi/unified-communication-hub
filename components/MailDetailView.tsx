"use client";

import React, { useMemo } from "react";
import DOMPurify from "isomorphic-dompurify";
import { MailDetail } from "@/lib/imap";

interface MailDetailViewProps {
  mail: MailDetail;
  onBack: () => void;
  isLoading?: boolean;
}

export default function MailDetailView({ mail, onBack, isLoading }: MailDetailViewProps) {
  // HTML 본문 안전 살균 처리
  const sanitizedHtml = useMemo(() => {
    if (mail.html) {
      return DOMPurify.sanitize(mail.html, {
        ADD_TAGS: ["style", "iframe"],
        ADD_ATTR: ["target", "style"],
      });
    }
    return null;
  }, [mail.html]);

  const formattedDate = useMemo(() => {
    try {
      const d = new Date(mail.date);
      return d.toLocaleString("ko-KR", {
        year: "numeric",
        month: "long",
        day: "numeric",
        weekday: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return mail.date;
    }
  }, [mail.date]);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden animate-fadeIn">
      {/* 상단 네비게이션 & 액션 바 */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 bg-slate-50/70">
        <button
          onClick={onBack}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600
                     hover:text-blue-600 hover:bg-white transition-all shadow-2xs"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          목록으로 돌아가기
        </button>

        <span className="text-[11px] text-slate-400 font-mono">UID: {mail.uid}</span>
      </div>

      {/* 메일 본문 스크롤 영역 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* 제목 */}
        <h2 className="text-base font-bold text-slate-900 leading-snug break-words">
          {mail.subject || "(제목 없음)"}
        </h2>

        {/* 헤더 메타데이터 카드 */}
        <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-100 space-y-1.5 text-xs">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs flex-shrink-0">
                {(mail.from.name || mail.from.address || "?")[0].toUpperCase()}
              </div>
              <div className="min-w-0">
                <span className="font-semibold text-slate-800 block truncate">
                  {mail.from.name || mail.from.address}
                </span>
                <span className="text-[11px] text-slate-500 block truncate">
                  {mail.from.address}
                </span>
              </div>
            </div>
            <span className="text-[11px] text-slate-400 whitespace-nowrap flex-shrink-0">
              {formattedDate}
            </span>
          </div>

          {/* 수신자 정보 */}
          {mail.to && mail.to.length > 0 && (
            <div className="pt-1 text-[11px] text-slate-500 flex items-center gap-1 truncate">
              <span className="text-slate-400 font-medium flex-shrink-0">받는사람:</span>
              <span className="truncate">
                {mail.to.map((t) => t.name || t.address).join(", ")}
              </span>
            </div>
          )}
        </div>

        {/* 첨부파일 영역 */}
        {mail.attachments && mail.attachments.length > 0 && (
          <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/50">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-2">
              <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                />
              </svg>
              첨부파일 ({mail.attachments.length}개)
            </div>
            <div className="space-y-1.5">
              {mail.attachments.map((att, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between px-2.5 py-1.5 bg-white rounded-lg border border-slate-200 text-xs"
                >
                  <div className="flex items-center gap-2 truncate">
                    <svg className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    <span className="truncate text-slate-700">{att.filename}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 whitespace-nowrap ml-2">
                    {formatFileSize(att.size)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 본문 콘텐츠 */}
        <div className="pt-2">
          {sanitizedHtml ? (
            <div
              className="prose prose-sm max-w-none text-slate-800 break-words leading-relaxed text-sm
                         [&_img]:max-w-full [&_img]:h-auto [&_table]:w-full [&_table]:border-collapse [&_a]:text-blue-600 [&_a]:underline"
              dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
            />
          ) : mail.text ? (
            <pre className="whitespace-pre-wrap font-sans text-sm text-slate-800 leading-relaxed break-words">
              {mail.text}
            </pre>
          ) : (
            <p className="text-xs text-slate-400 italic">본문 내용이 없습니다.</p>
          )}
        </div>
      </div>
    </div>
  );
}
