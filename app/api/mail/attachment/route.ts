import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions, SessionData } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { decryptPassword } from "@/lib/crypto";
import { createImapClient, DEFAULT_IMAP_PROVIDERS, ImapConfig } from "@/lib/imap";
import { simpleParser } from "mailparser";

export async function POST(request: NextRequest) {
  const response = new NextResponse();
  const session = await getIronSession<SessionData>(request, response, sessionOptions);

  if (!session.isLoggedIn) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      uid,
      attachmentIndex,
      accountId,
      provider,
      email,
      password,
      host,
      port,
      secure,
      mailbox = "INBOX",
    } = body;

    if (uid === undefined || attachmentIndex === undefined) {
      return NextResponse.json(
        { error: "uid 와 attachmentIndex 는 필수입니다." },
        { status: 400 }
      );
    }

    let imapConfig: ImapConfig;

    if (accountId) {
      const account = await prisma.mailAccount.findUnique({
        where: { id: accountId },
      });

      if (!account) {
        return NextResponse.json({ error: "계정을 찾을 수 없습니다." }, { status: 404 });
      }

      const decryptedPassword = decryptPassword(account.password);
      if (!decryptedPassword) {
        return NextResponse.json({ error: "비밀번호 복호화에 실패했습니다." }, { status: 500 });
      }

      imapConfig = {
        host: account.host,
        port: account.port,
        secure: account.secure,
        auth: { user: account.email, pass: decryptedPassword },
      };
    } else if (email && password) {
      const defaultProvider = provider ? DEFAULT_IMAP_PROVIDERS[provider] : undefined;
      imapConfig = {
        host: host || defaultProvider?.host || "imap.gmail.com",
        port: port ? Number(port) : defaultProvider?.port || 993,
        secure: secure !== undefined ? Boolean(secure) : true,
        auth: { user: email, pass: password },
      };
    } else {
      return NextResponse.json({ error: "계정 정보가 필요합니다." }, { status: 400 });
    }

    const client = createImapClient(imapConfig);
    await client.connect();

    let targetMailbox = mailbox;
    if (mailbox.toUpperCase() === "SENT") {
      const mailboxes = await client.list();
      const sentBox = mailboxes.find(
        (mb: any) =>
          mb.specialUse === "\\Sent" ||
          mb.path.toLowerCase().includes("sent") ||
          mb.name.toLowerCase().includes("sent") ||
          mb.name.includes("보낸")
      );
      if (sentBox) targetMailbox = sentBox.path;
    }

    const lock = await client.getMailboxLock(targetMailbox);
    let attachmentBuffer: Buffer | null = null;
    let attachmentFilename = "attachment";
    let attachmentContentType = "application/octet-stream";

    try {
      const downloaded = await client.download(String(uid), undefined, { uid: true });
      if (downloaded && downloaded.content) {
        const parsed = await simpleParser(downloaded.content);
        const att = parsed.attachments[Number(attachmentIndex)];
        if (!att) {
          return NextResponse.json(
            { error: `첨부파일 인덱스(${attachmentIndex})가 존재하지 않습니다.` },
            { status: 404 }
          );
        }
        attachmentBuffer = att.content as Buffer;
        attachmentFilename = att.filename || `attachment_${attachmentIndex}`;
        attachmentContentType = att.contentType || "application/octet-stream";
      }
    } finally {
      lock.release();
    }

    await client.logout();

    if (!attachmentBuffer) {
      return NextResponse.json({ error: "첨부파일을 가져오지 못했습니다." }, { status: 404 });
    }

    // 파일명 RFC5987 인코딩 (한글 등 유니코드 지원)
    const encodedFilename = encodeURIComponent(attachmentFilename).replace(/'/g, "%27");

    return new Response(new Uint8Array(attachmentBuffer), {
      status: 200,
      headers: {
        "Content-Type": attachmentContentType,
        "Content-Disposition": `attachment; filename*=UTF-8''${encodedFilename}`,
        "Content-Length": String(attachmentBuffer.length),
      },
    });
  } catch (error: any) {
    console.error("첨부파일 다운로드 오류:", error);
    return NextResponse.json(
      { error: error.message || "첨부파일을 다운로드하는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
