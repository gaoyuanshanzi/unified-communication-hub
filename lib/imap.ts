import { ImapFlow } from "imapflow";
import { simpleParser, ParsedMail } from "mailparser";

export interface ImapConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

export interface MailboxItem {
  path: string;
  name: string;
  specialUse?: string;
  isSent?: boolean;
  isInbox?: boolean;
}

export interface MailSummary {
  uid: number;
  seq: number;
  subject: string;
  from: {
    name: string;
    address: string;
  };
  to?: {
    name: string;
    address: string;
  }[];
  date: string;
  seen: boolean;
  flags: string[];
  size?: number;
}

export interface MailDetail {
  uid: number;
  subject: string;
  from: {
    name: string;
    address: string;
  };
  to: {
    name: string;
    address: string;
  }[];
  cc?: {
    name: string;
    address: string;
  }[];
  date: string;
  html?: string;
  text?: string;
  textAsHtml?: string;
  attachments: {
    filename?: string;
    contentType: string;
    size: number;
    checksum?: string;
  }[];
}

/**
 * IMAP 프로바이더별 기본 호스트 정보
 */
export const DEFAULT_IMAP_PROVIDERS: Record<
  string,
  { host: string; port: number; secure: boolean; name: string }
> = {
  kakao: {
    name: "Kakao / Daum Mail",
    host: "imap.daum.net",
    port: 993,
    secure: true,
  },
  naver: {
    name: "Naver Mail",
    host: "imap.naver.com",
    port: 993,
    secure: true,
  },
  gmail: {
    name: "Gmail",
    host: "imap.gmail.com",
    port: 993,
    secure: true,
  },
};

/**
 * IMAP 연결 인스턴스 생성
 */
export function createImapClient(config: ImapConfig): ImapFlow {
  return new ImapFlow({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.auth.user,
      pass: config.auth.pass,
    },
    logger: false,
    clientInfo: {
      name: "Unified Communication Hub",
      version: "1.0.0",
    },
  });
}

/**
 * IMAP 연결 테스트
 */
export async function testImapConnection(config: ImapConfig): Promise<boolean> {
  const client = createImapClient(config);
  try {
    await client.connect();
    await client.logout();
    return true;
  } catch (error) {
    console.error("IMAP 연결 테스트 실패:", error);
    throw error;
  }
}

/**
 * 사용 가능한 메일함(받은편지함, 보낸편지함 등) 목록 조회
 */
export async function listMailboxes(config: ImapConfig): Promise<MailboxItem[]> {
  const client = createImapClient(config);
  const result: MailboxItem[] = [];

  try {
    await client.connect();
    const mailboxes = await client.list();

    for (const mb of mailboxes) {
      const isSent =
        mb.specialUse === "\\Sent" ||
        mb.path.toLowerCase().includes("sent") ||
        mb.name.toLowerCase().includes("sent") ||
        mb.name.includes("보낸");

      const isInbox =
        mb.specialUse === "\\Inbox" ||
        mb.path.toUpperCase() === "INBOX" ||
        mb.name.toUpperCase() === "INBOX" ||
        mb.name.includes("받은");

      result.push({
        path: mb.path,
        name: mb.name,
        specialUse: mb.specialUse,
        isSent,
        isInbox,
      });
    }

    await client.logout();
  } catch (error) {
    console.error(`IMAP 메일함 목록 조회 오류:`, error);
    // 기본 폴더 목록 반환
    return [
      { path: "INBOX", name: "받은편지함", isInbox: true },
      { path: "Sent", name: "보낸편지함", isSent: true },
    ];
  }

  return result;
}

/**
 * 메일함의 최신 메일 목록 가져오기 (받은편지함/보낸편지함 등 지원)
 */
export async function fetchMailList(
  config: ImapConfig,
  mailbox: string = "INBOX",
  limit: number = 30
): Promise<MailSummary[]> {
  const client = createImapClient(config);
  const mails: MailSummary[] = [];

  try {
    await client.connect();

    // 메일함 경로 보정 (대소문자 및 특수 폴더명 매핑)
    let targetMailbox = mailbox;
    if (mailbox.toUpperCase() === "SENT") {
      // 보낸편지함 경로 자동 탐색
      const mailboxes = await client.list();
      const sentBox = mailboxes.find(
        (mb) =>
          mb.specialUse === "\\Sent" ||
          mb.path.toLowerCase().includes("sent") ||
          mb.name.toLowerCase().includes("sent") ||
          mb.name.includes("보낸")
      );
      if (sentBox) {
        targetMailbox = sentBox.path;
      }
    }

    const lock = await client.getMailboxLock(targetMailbox);

    try {
      const status = await client.status(targetMailbox, { messages: true });
      const totalMessages = status.messages || 0;

      if (totalMessages === 0) {
        return [];
      }

      // 최신 메일 위주로 범위 산출
      const startSeq = Math.max(1, totalMessages - limit + 1);
      const range = `${startSeq}:*`;

      for await (const message of client.fetch(range, {
        envelope: true,
        flags: true,
        uid: true,
        size: true,
      })) {
        const envelope = message.envelope;
        const fromItem = envelope?.from?.[0];
        const toItems = envelope?.to || [];
        const flags = message.flags ? Array.from(message.flags) : [];
        const seen = message.flags ? message.flags.has("\\Seen") : false;

        mails.push({
          uid: message.uid,
          seq: message.seq,
          subject: envelope?.subject || "(제목 없음)",
          from: {
            name: fromItem?.name || fromItem?.address?.split("@")[0] || "알 수 없음",
            address: fromItem?.address || "",
          },
          to: toItems.map((t) => ({
            name: t.name || t.address?.split("@")[0] || "",
            address: t.address || "",
          })),
          date: envelope?.date
            ? new Date(envelope.date).toISOString()
            : new Date().toISOString(),
          seen,
          flags,
          size: message.size,
        });
      }
    } finally {
      lock.release();
    }

    await client.logout();
  } catch (error) {
    console.error(`IMAP 메일 목록 조회 오류 (${config.host}, ${mailbox}):`, error);
    throw error;
  }

  // 최신 메일이 맨 위에 오도록 역순 정렬
  return mails.reverse();
}

/**
 * 개별 메일 상세 본문 파싱 가져오기
 */
export async function fetchMailDetail(
  config: ImapConfig,
  uid: number,
  mailbox: string = "INBOX"
): Promise<MailDetail | null> {
  const client = createImapClient(config);

  try {
    await client.connect();

    let targetMailbox = mailbox;
    if (mailbox.toUpperCase() === "SENT") {
      const mailboxes = await client.list();
      const sentBox = mailboxes.find(
        (mb) =>
          mb.specialUse === "\\Sent" ||
          mb.path.toLowerCase().includes("sent") ||
          mb.name.toLowerCase().includes("sent") ||
          mb.name.includes("보낸")
      );
      if (sentBox) {
        targetMailbox = sentBox.path;
      }
    }

    const lock = await client.getMailboxLock(targetMailbox);
    let parsed: ParsedMail | null = null;

    try {
      const downloaded = await client.download(String(uid), undefined, { uid: true });
      if (downloaded && downloaded.content) {
        parsed = await simpleParser(downloaded.content);
      }
    } finally {
      lock.release();
    }

    await client.logout();

    if (!parsed) {
      return null;
    }

    const fromAddress = Array.isArray(parsed.from?.value)
      ? parsed.from?.value[0]
      : parsed.from?.value;

    const toAddresses = Array.isArray(parsed.to)
      ? parsed.to.flatMap((t) => t.value)
      : parsed.to?.value || [];

    const ccAddresses = Array.isArray(parsed.cc)
      ? parsed.cc.flatMap((c) => c.value)
      : parsed.cc?.value || [];

    return {
      uid,
      subject: parsed.subject || "(제목 없음)",
      from: {
        name: fromAddress?.name || fromAddress?.address?.split("@")[0] || "알 수 없음",
        address: fromAddress?.address || "",
      },
      to: toAddresses.map((t) => ({
        name: t.name || t.address?.split("@")[0] || "",
        address: t.address || "",
      })),
      cc: ccAddresses.map((c) => ({
        name: c.name || c.address?.split("@")[0] || "",
        address: c.address || "",
      })),
      date: parsed.date ? new Date(parsed.date).toISOString() : new Date().toISOString(),
      html: parsed.html || undefined,
      text: parsed.text || undefined,
      textAsHtml: parsed.textAsHtml || undefined,
      attachments: (parsed.attachments || []).map((att) => ({
        filename: att.filename || "무제 파일",
        contentType: att.contentType,
        size: att.size,
        checksum: att.checksum,
      })),
    };
  } catch (error) {
    console.error(`IMAP 메일 상세 조회 오류 (UID: ${uid}):`, error);
    throw error;
  }
}

/**
 * 메일 삭제 (단일 또는 다중 UID 삭제)
 */
export async function deleteMails(
  config: ImapConfig,
  uids: number[],
  mailbox: string = "INBOX"
): Promise<boolean> {
  if (!uids || uids.length === 0) return true;

  const client = createImapClient(config);

  try {
    await client.connect();

    let targetMailbox = mailbox;
    if (mailbox.toUpperCase() === "SENT") {
      const mailboxes = await client.list();
      const sentBox = mailboxes.find(
        (mb) =>
          mb.specialUse === "\\Sent" ||
          mb.path.toLowerCase().includes("sent") ||
          mb.name.toLowerCase().includes("sent") ||
          mb.name.includes("보낸")
      );
      if (sentBox) {
        targetMailbox = sentBox.path;
      }
    }

    const lock = await client.getMailboxLock(targetMailbox);

    try {
      const range = uids.join(",");
      // Deleted 플래그 추가 후 영구 삭제(Expunge) 또는 messageDelete
      await client.messageFlagsAdd(range, ["\\Deleted"], { uid: true });
      await client.messageDelete(range, { uid: true });
    } finally {
      lock.release();
    }

    await client.logout();
    return true;
  } catch (error) {
    console.error(`IMAP 메일 삭제 오류 (UIDs: ${uids.join(",")}):`, error);
    throw error;
  }
}
