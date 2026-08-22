"use client";

import React, { useState, useEffect, useMemo } from "react";
import { MailSummary, MailDetail, DEFAULT_IMAP_PROVIDERS } from "@/lib/imap";
import MailDetailView from "./MailDetailView";
import ComposeMailView from "./ComposeMailView";

interface NativeMailColumnProps {
  provider: "kakao" | "naver" | "gmail";
  title: string;
  icon: React.ReactNode;
  colorClass: string;
  defaultHost: string;
  defaultPort?: number;
  guideText: string;
  guideLink?: string;
  savedAccount?: {
    id: string;
    email: string;
    host: string;
    port: number;
  } | null;
  onAccountSaved?: () => void;
  onAccountDeleted?: () => void;
}

export default function NativeMailColumn({
  provider,
  title,
  icon,
  colorClass,
  defaultHost,
  defaultPort = 993,
  guideText,
  guideLink,
  savedAccount,
  onAccountSaved,
  onAccountDeleted,
}: NativeMailColumnProps) {
  // 폼 입력 상태
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [host, setHost] = useState(defaultHost);
  const [port, setPort] = useState(defaultPort);
  const [saveToDb, setSaveToDb] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfig, setShowConfig] = useState(false);

  // 메일 및 연결 상태
  const [isConnected, setIsConnected] = useState(false);
  const [activeAccountId, setActiveAccountId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mails, setMails] = useState<MailSummary[]>([]);
  const [selectedMail, setSelectedMail] = useState<MailDetail | null>(null);
  const [isComposing, setIsComposing] = useState(false);
  const [sentSuccessToast, setSentSuccessToast] = useState(false);
  const [deleteSuccessToast, setDeleteSuccessToast] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // 메일함 선택 상태 (받은편지함: "INBOX", 보낸편지함: "SENT")
  const [currentMailbox, setCurrentMailbox] = useState<"INBOX" | "SENT">("INBOX");

  // 다중 메일 선택 상태
  const [selectedUids, setSelectedUids] = useState<number[]>([]);

  // 저장된 계정이 있으면 자동 로드 시도
  useEffect(() => {
    if (savedAccount) {
      setEmail(savedAccount.email);
      setHost(savedAccount.host);
      setPort(savedAccount.port);
      setActiveAccountId(savedAccount.id);
      setIsConnected(true);
      fetchMailsWithAccountId(savedAccount.id, currentMailbox);
    }
  }, [savedAccount]);

  // 메일 목록 가져오기 (저장된 ID 기준)
  const fetchMailsWithAccountId = async (accId: string, box: string = currentMailbox) => {
    setIsLoading(true);
    setError(null);
    setSelectedUids([]);
    try {
      const res = await fetch("/api/mail/list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId: accId, mailbox: box }),
      });
      const data = await res.json();
      if (res.ok) {
        setMails(data.mails || []);
      } else {
        setError(data.error || "메일을 불러오지 못했습니다.");
      }
    } catch (err: any) {
      setError("서버 통신 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  // 직접 자격증명으로 메일 목록 가져오기
  const fetchMailsDirect = async (
    targetEmail: string,
    targetPass: string,
    targetHost: string,
    targetPort: number,
    box: string = currentMailbox
  ) => {
    setIsLoading(true);
    setError(null);
    setSelectedUids([]);
    try {
      const res = await fetch("/api/mail/list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          email: targetEmail,
          password: targetPass,
          host: targetHost,
          port: targetPort,
          mailbox: box,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setMails(data.mails || []);
        setIsConnected(true);
      } else {
        setError(data.error || "메일 연결에 실패했습니다.");
      }
    } catch (err: any) {
      setError("서버 통신 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  // 메일함 탭 변경 (받은편지함 ↔ 보낸편지함)
  const handleSwitchMailbox = (box: "INBOX" | "SENT") => {
    setCurrentMailbox(box);
    setSelectedMail(null);
    setIsComposing(false);
    if (activeAccountId) {
      fetchMailsWithAccountId(activeAccountId, box);
    } else if (email && password) {
      fetchMailsDirect(email, password, host, port, box);
    }
  };

  // 로그인 & 연결 제출 핸들러
  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    if (!email || !password) {
      setError("이메일과 비밀번호(앱 비밀번호)를 입력해 주세요.");
      setIsLoading(false);
      return;
    }

    try {
      if (saveToDb) {
        const res = await fetch("/api/mail/accounts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            provider,
            email,
            password,
            host,
            port,
          }),
        });

        const data = await res.json();
        if (res.ok && data.account) {
          setActiveAccountId(data.account.id);
          setIsConnected(true);
          onAccountSaved?.();
          await fetchMailsWithAccountId(data.account.id, currentMailbox);
        } else {
          setError(data.error || "IMAP 연결 및 계정 저장 실패");
        }
      } else {
        await fetchMailsDirect(email, password, host, port, currentMailbox);
      }
    } catch (err) {
      setError("연결 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  // 단일 메일 상세 열기
  const handleSelectMail = async (uid: number) => {
    setIsLoadingDetail(true);
    setError(null);
    try {
      const payload: any = { uid, mailbox: currentMailbox };
      if (activeAccountId) {
        payload.accountId = activeAccountId;
      } else {
        payload.provider = provider;
        payload.email = email;
        payload.password = password;
        payload.host = host;
        payload.port = port;
      }

      const res = await fetch("/api/mail/detail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.mail) {
        setSelectedMail(data.mail);
        setMails((prev) =>
          prev.map((m) => (m.uid === uid ? { ...m, seen: true } : m))
        );
      } else {
        setError(data.error || "메일 본문을 가져오지 못했습니다.");
      }
    } catch (err) {
      setError("상세 본문 로드 실패");
    } finally {
      setIsLoadingDetail(false);
    }
  };

  // 선택된 메일 일괄 삭제
  const handleDeleteSelected = async () => {
    if (selectedUids.length === 0) return;
    if (!confirm(`선택한 ${selectedUids.length}개의 메일을 삭제하시겠습니까?`)) return;

    setIsDeleting(true);
    try {
      const payload: any = {
        uids: selectedUids,
        mailbox: currentMailbox,
      };

      if (activeAccountId) {
        payload.accountId = activeAccountId;
      } else {
        payload.provider = provider;
        payload.email = email;
        payload.password = password;
        payload.host = host;
        payload.port = port;
      }

      const res = await fetch("/api/mail/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setMails((prev) => prev.filter((m) => !selectedUids.includes(m.uid)));
        setSelectedUids([]);
        setDeleteSuccessToast(true);
        setTimeout(() => setDeleteSuccessToast(false), 4000);
      } else {
        const data = await res.json();
        alert(data.error || "메일 삭제에 실패했습니다.");
      }
    } catch {
      alert("삭제 요청 중 오류가 발생했습니다.");
    } finally {
      setIsDeleting(false);
    }
  };

  // 체크박스 토글 핸들러
  const handleToggleSelectUid = (uid: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedUids((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
    );
  };

  // 전체 선택 / 해제 토글
  const handleToggleSelectAll = () => {
    if (selectedUids.length === filteredMails.length && filteredMails.length > 0) {
      setSelectedUids([]);
    } else {
      setSelectedUids(filteredMails.map((m) => m.uid));
    }
  };

  // 연결 해제 및 계정 삭제
  const handleDisconnect = async () => {
    if (activeAccountId && confirm("저장된 메일 계정 연동을 해제하시겠습니까?")) {
      try {
        await fetch(`/api/mail/accounts?id=${activeAccountId}`, { method: "DELETE" });
        onAccountDeleted?.();
      } catch (err) {
        console.error(err);
      }
    }
    setIsConnected(false);
    setActiveAccountId(null);
    setPassword("");
    setMails([]);
    setSelectedMail(null);
    setSelectedUids([]);
  };

  // 새로고침 핸들러
  const handleRefresh = () => {
    if (activeAccountId) {
      fetchMailsWithAccountId(activeAccountId, currentMailbox);
    } else if (email && password) {
      fetchMailsDirect(email, password, host, port, currentMailbox);
    }
  };

  // 검색 필터링된 메일 목록
  const filteredMails = useMemo(() => {
    if (!searchQuery.trim()) return mails;
    const q = searchQuery.toLowerCase();
    return mails.filter(
      (m) =>
        m.subject.toLowerCase().includes(q) ||
        m.from.name.toLowerCase().includes(q) ||
        m.from.address.toLowerCase().includes(q)
    );
  }, [mails, searchQuery]);

  const unreadCount = useMemo(() => mails.filter((m) => !m.seen).length, [mails]);

  const formatShortDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const now = new Date();
      const isToday =
        d.getDate() === now.getDate() &&
        d.getMonth() === now.getMonth() &&
        d.getFullYear() === now.getFullYear();

      if (isToday) {
        return d.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
      }
      return d.toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" });
    } catch {
      return "";
    }
  };

  return (
    <div className="flex flex-col h-full rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
      {/* 컬럼 상단 헤더 */}
      <div className={`flex items-center justify-between px-4 py-3 border-b border-slate-100 ${colorClass}`}>
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="flex-shrink-0">{icon}</span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-slate-800 truncate">{title}</h3>
              {isConnected && currentMailbox === "INBOX" && unreadCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-blue-600 text-white">
                  {unreadCount}
                </span>
              )}
            </div>
            {isConnected && (
              <p className="text-[11px] text-slate-500 truncate">{email}</p>
            )}
          </div>
        </div>

        {/* 우측 헤더 액션 */}
        <div className="flex items-center gap-1.5">
          {isConnected && (
            <>
              {/* 새 메일 쓰기 버튼 */}
              <button
                onClick={() => {
                  setIsComposing(true);
                  setSelectedMail(null);
                }}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-2xs"
                title="새 메일 작성"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>메일 쓰기</span>
              </button>

              <button
                onClick={handleRefresh}
                disabled={isLoading}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-white/80 transition-all"
                title="새로고침"
              >
                <svg
                  className={`w-4 h-4 ${isLoading ? "animate-spin text-blue-600" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
              </button>

              <button
                onClick={handleDisconnect}
                className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-white/80 transition-all"
                title="계정 연결 해제"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
              </button>
            </>
          )}
        </div>
      </div>

      {/* 발송 성공 토스트 */}
      {sentSuccessToast && (
        <div className="p-2.5 bg-emerald-50 border-b border-emerald-100 text-xs font-semibold text-emerald-700 flex items-center justify-between animate-fadeIn">
          <span>✅ 메일이 성공적으로 발송되었습니다!</span>
          <button onClick={() => setSentSuccessToast(false)} className="text-emerald-500 hover:text-emerald-700">✕</button>
        </div>
      )}

      {/* 삭제 성공 토스트 */}
      {deleteSuccessToast && (
        <div className="p-2.5 bg-slate-100 border-b border-slate-200 text-xs font-semibold text-slate-700 flex items-center justify-between animate-fadeIn">
          <span>🗑️ 선택한 메일이 삭제되었습니다.</span>
          <button onClick={() => setDeleteSuccessToast(false)} className="text-slate-500 hover:text-slate-700">✕</button>
        </div>
      )}

      {/* 본문 영역: 작성 뷰 vs 상세 뷰 vs 미연결 폼 vs 메일 목록 */}
      <div className="relative flex-1 min-h-0 flex flex-col bg-slate-50/40">
        {isComposing ? (
          // 1. 새 메일 작성 뷰어
          <ComposeMailView
            provider={provider}
            senderEmail={email}
            onClose={() => setIsComposing(false)}
            onSentSuccess={() => {
              setSentSuccessToast(true);
              setTimeout(() => setSentSuccessToast(false), 5000);
              handleRefresh();
            }}
            accountId={activeAccountId}
            directAuth={{
              provider,
              email,
              password,
            }}
          />
        ) : selectedMail ? (
          // 2. 개별 메일 상세 뷰어 (회신 및 삭제 기능 포함)
          <MailDetailView
            mail={selectedMail}
            onBack={() => setSelectedMail(null)}
            onDeleted={() => {
              setSelectedMail(null);
              setDeleteSuccessToast(true);
              setTimeout(() => setDeleteSuccessToast(false), 4000);
              handleRefresh();
            }}
            accountId={activeAccountId}
            mailbox={currentMailbox}
            directAuth={{
              provider,
              email,
              password,
            }}
          />
        ) : !isConnected ? (
          // 3. 계정 인증 및 연결 설정 폼
          <div className="flex-1 overflow-y-auto p-5 flex flex-col justify-center">
            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs space-y-4">
              <div className="text-center space-y-1">
                <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 mx-auto flex items-center justify-center">
                  {icon}
                </div>
                <h4 className="text-sm font-bold text-slate-800">{title} IMAP 연동</h4>
                <p className="text-[11px] text-slate-400">
                  실시간 수신을 위해 IMAP 계정을 연결하세요
                </p>
              </div>

              {/* 안내 가이드 배너 */}
              <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-100/60 text-[11px] text-slate-600 leading-relaxed">
                <p className="font-semibold text-blue-800 mb-0.5">💡 비밀번호 입력 안내</p>
                <p>{guideText}</p>
                {guideLink && (
                  <a
                    href={guideLink}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 hover:underline inline-flex items-center gap-0.5 mt-1 font-medium"
                  >
                    앱 비밀번호 발급 방법 보기 →
                  </a>
                )}
              </div>

              {/* 에러 메시지 */}
              {error && (
                <div className="p-2.5 rounded-lg bg-red-50 border border-red-100 text-xs text-red-600 flex items-start gap-1.5">
                  <svg className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleConnect} className="space-y-3">
                {/* 이메일 주소 */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    이메일 주소
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={
                      provider === "kakao"
                        ? "user@daum.net 또는 kakao.com"
                        : provider === "naver"
                        ? "username@naver.com"
                        : "username@gmail.com"
                    }
                    required
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/50
                               focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                  />
                </div>

                {/* 앱 비밀번호 */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    앱 비밀번호 (App Password)
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="생성된 앱 전용 비밀번호"
                      required
                      className="w-full px-3 py-2 pr-10 text-xs rounded-xl border border-slate-200 bg-slate-50/50
                                 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? "🙈" : "👁️"}
                    </button>
                  </div>
                </div>

                {/* 고급 IMAP 서버 설정 토글 */}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => setShowConfig(!showConfig)}
                    className="text-[11px] text-slate-400 hover:text-slate-600 flex items-center gap-1"
                  >
                    <span>고급 IMAP 서버 설정 {showConfig ? "▲" : "▼"}</span>
                  </button>

                  {showConfig && (
                    <div className="grid grid-cols-3 gap-2 mt-2 p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                      <div className="col-span-2">
                        <label className="block text-[10px] text-slate-500 mb-0.5">호스트</label>
                        <input
                          type="text"
                          value={host}
                          onChange={(e) => setHost(e.target.value)}
                          className="w-full px-2 py-1 text-xs rounded border border-slate-200 bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-500 mb-0.5">포트</label>
                        <input
                          type="number"
                          value={port}
                          onChange={(e) => setPort(Number(e.target.value))}
                          className="w-full px-2 py-1 text-xs rounded border border-slate-200 bg-white"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* DB 저장 체크박스 */}
                <label className="flex items-center gap-2 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={saveToDb}
                    onChange={(e) => setSaveToDb(e.target.checked)}
                    className="w-3.5 h-3.5 rounded text-blue-600 border-slate-300 focus:ring-blue-500"
                  />
                  <span className="text-xs text-slate-600">
                    계정 정보 안전하게 저장 (Neon DB)
                  </span>
                </label>

                {/* 연결 버튼 */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700
                             text-white font-semibold text-xs transition-all shadow-xs
                             disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      IMAP 서버 연결 중...
                    </>
                  ) : (
                    "메일함 연결 및 수신 시작"
                  )}
                </button>
              </form>
            </div>
          </div>
        ) : (
          // 4. 실시간 메일함 목록 (받은편지함 / 보낸편지함 선택 탭 & 다중 선택/삭제 포함)
          <div className="flex flex-col h-full">
            {/* 메일함 탭 전환 (받은편지함 ↔ 보낸편지함) */}
            <div className="flex items-center px-3 pt-2 bg-white border-b border-slate-100 gap-2">
              <button
                onClick={() => handleSwitchMailbox("INBOX")}
                className={`flex items-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-bold transition-all border-b-2 ${
                  currentMailbox === "INBOX"
                    ? "border-blue-600 text-blue-600 bg-blue-50/60"
                    : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                }`}
              >
                <span>📥 받은편지함</span>
                {unreadCount > 0 && currentMailbox === "INBOX" && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-blue-600 text-white font-bold">
                    {unreadCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => handleSwitchMailbox("SENT")}
                className={`flex items-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-bold transition-all border-b-2 ${
                  currentMailbox === "SENT"
                    ? "border-blue-600 text-blue-600 bg-blue-50/60"
                    : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                }`}
              >
                <span>📤 보낸편지함</span>
              </button>
            </div>

            {/* 검색 및 일괄 선택/삭제 툴바 */}
            <div className="p-2.5 border-b border-slate-100 bg-white space-y-2">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="보낸/받는 사람 또는 제목 검색..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50/50
                             focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                />
                <svg
                  className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* 다중 선택 및 삭제 액션 바 */}
              <div className="flex items-center justify-between px-1 text-xs">
                <label className="flex items-center gap-1.5 cursor-pointer text-slate-600 hover:text-slate-900 select-none">
                  <input
                    type="checkbox"
                    checked={
                      filteredMails.length > 0 && selectedUids.length === filteredMails.length
                    }
                    onChange={handleToggleSelectAll}
                    className="w-3.5 h-3.5 rounded text-blue-600 border-slate-300 focus:ring-blue-500"
                  />
                  <span className="text-[11px] font-medium">
                    전체 선택 ({selectedUids.length}/{filteredMails.length})
                  </span>
                </label>

                {selectedUids.length > 0 && (
                  <button
                    onClick={handleDeleteSelected}
                    disabled={isDeleting}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 text-[11px] font-bold transition-all disabled:opacity-50"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                    <span>{isDeleting ? "삭제 중..." : `선택 삭제 (${selectedUids.length})`}</span>
                  </button>
                )}
              </div>
            </div>

            {/* 메일 항목 리스트 */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 bg-white">
              {isLoading && mails.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400 space-y-2">
                  <div className="inline-block animate-spin w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full" />
                  <p>{currentMailbox === "INBOX" ? "받은편지함" : "보낸편지함"}을 동기화하고 있습니다...</p>
                </div>
              ) : filteredMails.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400 space-y-1">
                  <p className="font-semibold text-slate-600">
                    {currentMailbox === "INBOX" ? "받은 메일이 없습니다" : "보낸 메일이 없습니다"}
                  </p>
                  <p className="text-[11px]">검색어를 확인하거나 새로고침을 눌러보세요.</p>
                </div>
              ) : (
                filteredMails.map((mail) => (
                  <div
                    key={mail.uid}
                    onClick={() => handleSelectMail(mail.uid)}
                    className={`w-full text-left p-3 hover:bg-slate-50 transition-colors flex items-start gap-2.5 cursor-pointer group
                                ${!mail.seen && currentMailbox === "INBOX" ? "bg-blue-50/30 font-medium" : ""}`}
                  >
                    {/* 선택 체크박스 */}
                    <div
                      className="pt-0.5 flex-shrink-0"
                      onClick={(e) => handleToggleSelectUid(mail.uid, e)}
                    >
                      <input
                        type="checkbox"
                        checked={selectedUids.includes(mail.uid)}
                        onChange={() => {}}
                        className="w-3.5 h-3.5 rounded text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer"
                      />
                    </div>

                    {/* 읽지 않음 파란 점 (받은편지함 전용) */}
                    {currentMailbox === "INBOX" && (
                      <div className="pt-1 flex-shrink-0">
                        <span
                          className={`block w-2 h-2 rounded-full ${
                            !mail.seen ? "bg-blue-600" : "bg-transparent"
                          }`}
                        />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      {/* 발신자/수신자 + 날짜 */}
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <span
                          className={`text-xs truncate ${
                            !mail.seen && currentMailbox === "INBOX"
                              ? "font-bold text-slate-900"
                              : "text-slate-700"
                          }`}
                        >
                          {currentMailbox === "SENT"
                            ? mail.to && mail.to.length > 0
                              ? `받는사람: ${mail.to.map((t) => t.name || t.address).join(", ")}`
                              : "받는사람 없음"
                            : mail.from.name || mail.from.address}
                        </span>
                        <span className="text-[10px] text-slate-400 whitespace-nowrap flex-shrink-0">
                          {formatShortDate(mail.date)}
                        </span>
                      </div>

                      {/* 제목 */}
                      <p
                        className={`text-xs line-clamp-1 leading-snug ${
                          !mail.seen && currentMailbox === "INBOX"
                            ? "font-semibold text-slate-800"
                            : "text-slate-600"
                        }`}
                      >
                        {mail.subject || "(제목 없음)"}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* 하단 상태 표시줄 */}
      <div className="px-3 py-1.5 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between text-[11px] text-slate-400">
        <span>
          {isConnected
            ? `${currentMailbox === "INBOX" ? "받은편지함" : "보낸편지함"} (총 ${mails.length}통)`
            : "연결 대기 중"}
        </span>
        <span className="font-mono text-slate-500">{defaultHost}</span>
      </div>
    </div>
  );
}
