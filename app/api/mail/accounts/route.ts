import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions, SessionData } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { encryptPassword, decryptPassword } from "@/lib/crypto";
import { testImapConnection, DEFAULT_IMAP_PROVIDERS } from "@/lib/imap";

// 1. 저장된 계정 목록 조회
export async function GET(request: NextRequest) {
  const response = new NextResponse();
  const session = await getIronSession<SessionData>(request, response, sessionOptions);

  if (!session.isLoggedIn) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  try {
    const accounts = await prisma.mailAccount.findMany({
      select: {
        id: true,
        provider: true,
        email: true,
        host: true,
        port: true,
        secure: true,
        updatedAt: true,
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ accounts });
  } catch (error) {
    console.error("계정 목록 조회 실패:", error);
    return NextResponse.json({ error: "계정 목록을 불러오지 못했습니다." }, { status: 500 });
  }
}

// 2. 계정 추가 및 저장 (IMAP 연결 유효성 검증 후 암호화 저장)
export async function POST(request: NextRequest) {
  const response = new NextResponse();
  const session = await getIronSession<SessionData>(request, response, sessionOptions);

  if (!session.isLoggedIn) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { provider, email, password, host, port, secure } = body;

    if (!provider || !email || !password) {
      return NextResponse.json({ error: "필수 정보가 누락되었습니다." }, { status: 400 });
    }

    const defaultProvider = DEFAULT_IMAP_PROVIDERS[provider];
    const imapHost = host || defaultProvider?.host || "imap.gmail.com";
    const imapPort = port ? Number(port) : defaultProvider?.port || 993;
    const imapSecure = secure !== undefined ? Boolean(secure) : true;

    // IMAP 연결 사전 테스트
    try {
      await testImapConnection({
        host: imapHost,
        port: imapPort,
        secure: imapSecure,
        auth: {
          user: email,
          pass: password,
        },
      });
    } catch (connError: any) {
      return NextResponse.json(
        {
          error: `IMAP 서버 접속 실패: ${
            connError.message || "아이디 또는 앱 비밀번호를 확인해 주세요."
          }`,
        },
        { status: 400 }
      );
    }

    // 비밀번호 암호화 후 DB 저장 (Upsert)
    const encryptedPass = encryptPassword(password);

    const savedAccount = await prisma.mailAccount.upsert({
      where: { email },
      update: {
        provider,
        password: encryptedPass,
        host: imapHost,
        port: imapPort,
        secure: imapSecure,
      },
      create: {
        provider,
        email,
        password: encryptedPass,
        host: imapHost,
        port: imapPort,
        secure: imapSecure,
      },
      select: {
        id: true,
        provider: true,
        email: true,
        host: true,
        port: true,
        secure: true,
      },
    });

    return NextResponse.json({ success: true, account: savedAccount });
  } catch (error: any) {
    console.error("계정 저장 오류:", error);
    return NextResponse.json({ error: "계정 저장 중 오류가 발생했습니다." }, { status: 500 });
  }
}

// 3. 계정 삭제
export async function DELETE(request: NextRequest) {
  const response = new NextResponse();
  const session = await getIronSession<SessionData>(request, response, sessionOptions);

  if (!session.isLoggedIn) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const email = searchParams.get("email");

    if (!id && !email) {
      return NextResponse.json({ error: "ID 또는 이메일이 필요합니다." }, { status: 400 });
    }

    if (id) {
      await prisma.mailAccount.delete({ where: { id } });
    } else if (email) {
      await prisma.mailAccount.delete({ where: { email } });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("계정 삭제 오류:", error);
    return NextResponse.json({ error: "계정 삭제에 실패했습니다." }, { status: 500 });
  }
}
