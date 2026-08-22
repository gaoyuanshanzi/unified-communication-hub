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
    logger: false, // 콘솔 로그 억제
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
 * 편지함의 최신 메일 목록 가져오기
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
    const lock = await client.getMailboxLock(mailbox);

    try {
      const status = await client.status(mailbox, { messages: true });
      const totalMessages = status.messages || 0;

      if (totalMessages === 0) {
        return [];
      }

      // 최신 메일 위주로 범위 산출 (예: 80~100)
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
    console.error(`IMAP 메일 목록 조회 오류 (${config.host}):`, error);
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
    const lock = await client.getMailboxLock(mailbox);

    let parsed: ParsedMail | null = null;

    try {
      // RFC822 원본 다운로드
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
