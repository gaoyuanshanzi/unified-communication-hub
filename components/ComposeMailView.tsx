"use client";

import React, { useState, useRef } from "react";

interface ComposeMailViewProps {
  provider: string;
  senderEmail: string;
  onClose: () => void;
  onSentSuccess?: () => void;
  accountId?: string | null;
  directAuth?: {
    provider: string;
    email: string;
    password?: string;
  };
}

export default function ComposeMailView({
  provider,
  senderEmail,
  onClose,
  onSentSuccess,
  accountId,
  directAuth,
}: ComposeMailViewProps) {
  const [to, setTo] = useState("");
  const [cc, setCc] = useState("");
  const [showCc, setShowCc] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 첨부파일 상태
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAttachFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    setAttachedFiles((prev) => [...prev, ...Array.from(files)]);
    // 동일 파일 재선택 가능하도록 초기화
    e.target.value = "";
  };

  const handleRemoveFile = (idx: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!to.trim()) {
      setError("받는 사람 이메일 주소를 입력해 주세요.");
      return;
    }
    if (!subject.trim()) {
      setError("메일 제목을 입력해 주세요.");
      return;
    }
    if (!body.trim()) {
      setError("메일 본문 내용을 입력해 주세요.");
      return;
    }

    setIsSending(true);

    try {
      let res: Response;

      if (attachedFiles.length > 0) {
        // 첨부파일이 있으면 multipart/form-data 전송
        const formData = new FormData();
        formData.append("to", to.trim());
        formData.append("subject", subject.trim());
        formData.append("text", body);
        if (cc.trim()) formData.append("cc", cc.trim());

        if (accountId) {
          formData.append("accountId", accountId);
        } else if (directAuth) {
          formData.append("provider", directAuth.provider);
          formData.append("email", directAuth.email);
          if (directAuth.password) formData.append("password", directAuth.password);
        }

        for (const file of attachedFiles) {
          formData.append("attachments", file);
        }

        res = await fetch("/api/mail/send", {
          method: "POST",
          body: formData,
        });
      } else {
        // 첨부파일 없으면 기존 JSON 방식
        const payload: any = {
          to: to.trim(),
          subject: subject.trim(),
          text: body,
        };

        if (cc.trim()) payload.cc = cc.trim();

        if (accountId) {
          payload.accountId = accountId;
        } else if (directAuth) {
          payload.provider = directAuth.provider;
          payload.email = directAuth.email;
          payload.password = directAuth.password;
        }

        res = await fetch("/api/mail/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();

      if (res.ok) {
        onSentSuccess?.();
        onClose();
      } else {
        setError(data.error || "메일 전송에 실패했습니다.");
      }
    } catch (err: any) {
      setError("서버 전송 중 오류가 발생했습니다.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden animate-fadeIn">
      {/* 상단 헤더 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/80">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
          </div>
          <h3 className="text-xs font-bold text-slate-800">새 메일 작성</h3>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all text-xs font-bold"
          title="닫기"
        >
          ✕
        </button>
      </div>

      {/* 작성 폼 영역 */}
      <form onSubmit={handleSend} className="flex-1 min-h-0 flex flex-col p-4 space-y-3 overflow-y-auto">
        {error && (
          <div className="p-2.5 rounded-xl bg-red-50 border border-red-100 text-xs text-red-600 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
            <button type="button" onClick={() => setError(null)} className="text-red-400 hover:text-red-600 font-bold">
              ✕
            </button>
          </div>
        )}

        {/* 보낸 사람 계정 표시 */}
        <div className="flex items-center justify-between text-xs py-1 px-2.5 rounded-lg bg-slate-50 border border-slate-100">
          <span className="text-slate-500 font-medium">보내는 사람:</span>
          <span className="font-semibold text-slate-800 truncate max-w-[200px]">{senderEmail}</span>
        </div>

        {/* 받는 사람 */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-semibold text-slate-700">
              받는 사람 <span className="text-[10px] text-slate-400 font-normal">(다수 입력 시 ; 로 구분)</span>
            </label>
            {!showCc && (
              <button
                type="button"
                onClick={() => setShowCc(true)}
                className="text-[11px] text-blue-600 hover:underline font-medium"
              >
                + 참조(CC) 추가
              </button>
            )}
          </div>
          <input
            type="text"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="user1@example.com; user2@example.com"
            required
            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/50
                       focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
          />
        </div>

        {/* 참조 (CC) */}
        {showCc && (
          <div className="animate-fadeIn">
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700">
                참조 (CC) <span className="text-[10px] text-slate-400 font-normal">(다수 입력 시 ; 로 구분)</span>
              </label>
              <button
                type="button"
                onClick={() => {
                  setShowCc(false);
                  setCc("");
                }}
                className="text-[11px] text-slate-400 hover:text-slate-600 font-medium"
              >
                참조 숨기기 ✕
              </button>
            </div>
            <input
              type="text"
              value={cc}
              onChange={(e) => setCc(e.target.value)}
              placeholder="cc1@example.com; cc2@example.com"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/50
                         focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
            />
          </div>
        )}

        {/* 제목 */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">제목</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="메일 제목을 입력하세요"
            required
            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/50
                       focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
          />
        </div>

        {/* 본문 내용 */}
        <div className="flex-1 min-h-[120px] flex flex-col">
          <label className="block text-xs font-semibold text-slate-700 mb-1">내용</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="전송할 메일 내용을 작성하세요..."
            required
            className="w-full flex-1 p-3 text-xs rounded-xl border border-slate-200 bg-slate-50/50
                       focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all leading-relaxed resize-none"
          />
        </div>

        {/* 첨부파일 영역 */}
        <div>
          {/* 숨겨진 파일 input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleAttachFiles}
            className="hidden"
          />

          {/* 첨부 버튼 */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-dashed border-slate-300 text-slate-600 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50/30 text-[11px] font-semibold transition-all w-full justify-center"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
              />
            </svg>
            📎 파일 첨부하기 (여러 파일 선택 가능)
          </button>

          {/* 첨부된 파일 목록 */}
          {attachedFiles.length > 0 && (
            <div className="mt-2 space-y-1.5">
              {attachedFiles.map((file, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between px-2.5 py-1.5 bg-blue-50/40 rounded-lg border border-blue-100 text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <svg className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="truncate text-slate-700 font-medium">{file.name}</span>
                    <span className="text-[10px] text-slate-400 whitespace-nowrap flex-shrink-0">
                      {formatFileSize(file.size)}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveFile(idx)}
                    className="ml-2 p-0.5 text-slate-400 hover:text-red-500 flex-shrink-0 font-bold text-xs"
                    title="첨부 제거"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 하단 버튼 바 */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
          <span className="text-[11px] text-slate-400">
            {attachedFiles.length > 0 ? `📎 ${attachedFiles.length}개 첨부` : ""}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-all"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isSending}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs disabled:opacity-50"
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
                  메일 보내기
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
