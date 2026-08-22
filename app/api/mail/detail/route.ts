import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions, SessionData } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { decryptPassword } from "@/lib/crypto";
import { fetchMailDetail, DEFAULT_IMAP_PROVIDERS, ImapConfig } from "@/lib/imap";

export async function POST(request: NextRequest) {
  const response = new NextResponse();
  const session = await getIronSession<SessionData>(request, response, sessionOptions);

  if (!session.isLoggedIn) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { uid, accountId, provider, email, password, host, port, secure } = body;

    if (!uid) {
      return NextResponse.json({ error: "메일 UID가 필요합니다." }, { status: 400 });
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

    const mailDetail = await fetchMailDetail(imapConfig, Number(uid), "INBOX");

    if (!mailDetail) {
      return NextResponse.json({ error: "메일 본문을 가져오지 못했습니다." }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      mail: mailDetail,
    });
  } catch (error: any) {
    console.error("메일 상세 파싱 실패:", error);
    return NextResponse.json(
      {
        error: error.message || "메일 상세 정보를 가져오는 중 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}
