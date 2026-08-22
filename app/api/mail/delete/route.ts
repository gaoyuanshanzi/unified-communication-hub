import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions, SessionData } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { decryptPassword } from "@/lib/crypto";
import { deleteMails, DEFAULT_IMAP_PROVIDERS, ImapConfig } from "@/lib/imap";

export async function POST(request: NextRequest) {
  const response = new NextResponse();
  const session = await getIronSession<SessionData>(request, response, sessionOptions);

  if (!session.isLoggedIn) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { accountId, provider, email, password, host, port, secure, uids, mailbox = "INBOX" } = body;

    if (!uids || !Array.isArray(uids) || uids.length === 0) {
      return NextResponse.json({ error: "삭제할 메일 UID 목록이 필요합니다." }, { status: 400 });
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
        auth: {
          user: account.email,
          pass: decryptedPassword,
        },
      };
    } else if (email && password) {
      const defaultProvider = provider ? DEFAULT_IMAP_PROVIDERS[provider] : undefined;
      imapConfig = {
        host: host || defaultProvider?.host || "imap.gmail.com",
        port: port ? Number(port) : defaultProvider?.port || 993,
        secure: secure !== undefined ? Boolean(secure) : true,
        auth: {
          user: email,
          pass: password,
        },
      };
    } else {
      return NextResponse.json({ error: "계정 정보가 필요합니다." }, { status: 400 });
    }

    // 메일 삭제 실행
    await deleteMails(imapConfig, uids.map(Number), mailbox);

    return NextResponse.json({
      success: true,
      deletedCount: uids.length,
    });
  } catch (error: any) {
    console.error("메일 삭제 오류:", error);
    return NextResponse.json(
      {
        error: error.message || "메일 삭제 중 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}
