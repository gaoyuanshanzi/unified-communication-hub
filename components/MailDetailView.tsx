"use client";

import React, { useState, useMemo } from "react";
import DOMPurify from "isomorphic-dompurify";
import { MailDetail } from "@/lib/imap";

interface MailDetailViewProps {
  mail: MailDetail;
  onBack: () => void;
  isLoading?: boolean;
  accountId?: string | null;
  directAuth?: {
    provider: string;
    email: string;
    password?: string;
  };
}

export default function MailDetailView({
  mail,
  onBack,
  isLoading,
  accountId,
  directAuth,
}: MailDetailViewProps) {
  // 회신 작성 폼 상태
  const [isReplying, setIsReplying] = useState(false);
  const [replyTo, setReplyTo] = useState(mail.from.address || "");
  const [replySubject, setReplySubject] = useState(
    mail.subject.startsWith("Re:") ? mail.subject : `Re: ${mail.subject}`
  );
  const [replyBody, setReplyBody] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

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

  // 회신 메일 전송 핸들러
  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    setSendError(null);
    setSendSuccess(false);

    if (!replyBody.trim()) {
      setSendError("회신할 내용을 작성해 주세요.");
      return;
    }

    setIsSending(true);

    try {
      // 인용된 원본 텍스트 조합
      const quotedOriginal = `\n\n\n----------------- [ 원본 메일 ] -----------------\n보낸 사람: ${
        mail.from.name ? `${mail.from.name} <${mail.from.address}>` : mail.from.address
      }\n날짜: ${formattedDate}\n제목: ${mail.subject}\n\n${mail.text || "(HTML 본문)"}`;

      const fullContent = replyBody + quotedOriginal;

      const payload: any = {
        to: replyTo,
        subject: replySubject,
        text: fullContent,
      };

      if (accountId) {
        payload.accountId = accountId;
      } else if (directAuth) {
        payload.provider = directAuth.provider;
        payload.email = directAuth.email;
        payload.password = directAuth.password;
      }

      const res = await fetch("/api/mail/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok) {
        setSendSuccess(true);
        setIsReplying(false);
        setReplyBody("");
        setTimeout(() => setSendSuccess(false), 5000);
      } else {
        setSendError(data.error || "메일 회신 전송에 실패했습니다.");
      }
    } catch (err: any) {
      setSendError("서버 전송 중 오류가 발생했습니다.");
    } finally {
      setIsSending(false);
    }
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
          목록으로
        </button>

        {/* 상단 빠른 회신 버튼 */}
        <button
          onClick={() => setIsReplying(!isReplying)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shadow-2xs ${
            isReplying
              ? "bg-slate-200 text-slate-700"
              : "bg-blue-600 text-white hover:bg-blue-700 shadow-xs"
          }`}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 10h10a5 5 0 015 5v2m0 0l-4-4m4 4l4-4M3 10l6-6m-6 6l6 6"
            />
          </svg>
          {isReplying ? "회신 닫기" : "회신 (답장)"}
        </button>
      </div>

      {/* 회신 성공/실패 토스트 */}
      {sendSuccess && (
        <div className="p-3 bg-emerald-50 border-b border-emerald-100 text-xs font-semibold text-emerald-700 flex items-center gap-2">
          <span>✅</span>
          <span>회신 메일이 성공적으로 전송되었습니다!</span>
        </div>
      )}

      {sendError && (
        <div className="p-3 bg-red-50 border-b border-red-100 text-xs font-medium text-red-600 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <span>⚠️</span>
            <span>{sendError}</span>
          </div>
          <button onClick={() => setSendError(null)} className="text-red-400 hover:text-red-600">
            ✕
          </button>
        </div>
      )}

      {/* 메일 본문 + 회신 폼 스크롤 영역 */}
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

        {/* 회신 작성 폼 (상단 열림 모드) */}
        {isReplying && (
          <div className="border border-blue-200 rounded-2xl p-4 bg-blue-50/30 shadow-xs space-y-3 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-blue-100 pb-2">
              <h3 className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 10h10a5 5 0 015 5v2m0 0l-4-4m4 4l4-4M3 10l6-6m-6 6l6 6"
                  />
                </svg>
                회신 메일 작성
              </h3>
              <button
                onClick={() => setIsReplying(false)}
                className="text-xs text-slate-400 hover:text-slate-600"
              >
                닫기 ✕
              </button>
            </div>

            <form onSubmit={handleSendReply} className="space-y-2.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                  받는 사람
                </label>
                <input
                  type="email"
                  value={replyTo}
                  onChange={(e) => setReplyTo(e.target.value)}
                  required
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                  제목
                </label>
                <input
                  type="text"
                  value={replySubject}
                  onChange={(e) => setReplySubject(e.target.value)}
                  required
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                  회신 내용
                </label>
                <textarea
                  value={replyBody}
                  onChange={(e) => setReplyBody(e.target.value)}
                  placeholder="회신할 메시지 내용을 입력하세요..."
                  rows={5}
                  required
                  className="w-full p-3 text-xs rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsReplying(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-all"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={isSending}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs disabled:opacity-50"
                >
                  {isSending ? (
                    <>
                      <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      전송 중...
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                      회신 보내기
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

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

        {/* 본문 하단 답장 액션 바 */}
        <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
          <button
            onClick={() => {
              setIsReplying(true);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold text-xs transition-all shadow-2xs"
          >
            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 10h10a5 5 0 015 5v2m0 0l-4-4m4 4l4-4M3 10l6-6m-6 6l6 6"
              />
            </svg>
            이 메일에 회신(답장)하기
          </button>

          <button
            onClick={onBack}
            className="text-xs font-semibold text-slate-500 hover:text-slate-700"
          >
            목록으로 돌아가기 ↑
          </button>
        </div>
      </div>
    </div>
  );
}
