import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions, SessionData } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { decryptPassword } from "@/lib/crypto";
import { sendMail, DEFAULT_SMTP_PROVIDERS, SmtpConfig } from "@/lib/smtp";

export async function POST(request: NextRequest) {
  const response = new NextResponse();
  const session = await getIronSession<SessionData>(request, response, sessionOptions);

  if (!session.isLoggedIn) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      accountId,
      provider,
      email,
      password,
      smtpHost,
      smtpPort,
      to,
      cc,
      subject,
      text,
      html,
    } = body;

    if (!to || !subject || (!text && !html)) {
      return NextResponse.json(
        { error: "수신자(to), 제목(subject), 본문 내용은 필수입니다." },
        { status: 400 }
      );
    }

    let smtpConfig: SmtpConfig;
    let senderEmail: string;

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

      const defaultSmtp = DEFAULT_SMTP_PROVIDERS[account.provider];
      smtpConfig = {
        host: smtpHost || defaultSmtp?.host || "smtp.gmail.com",
        port: smtpPort ? Number(smtpPort) : defaultSmtp?.port || 465,
        secure: true,
        auth: {
          user: account.email,
          pass: decryptedPassword,
        },
      };
      senderEmail = account.email;
    } else if (email && password) {
      const defaultSmtp = provider ? DEFAULT_SMTP_PROVIDERS[provider] : undefined;
      smtpConfig = {
        host: smtpHost || defaultSmtp?.host || "smtp.gmail.com",
        port: smtpPort ? Number(smtpPort) : defaultSmtp?.port || 465,
        secure: true,
        auth: {
          user: email,
          pass: password,
        },
      };
      senderEmail = email;
    } else {
      return NextResponse.json({ error: "발신 계정 정보가 필요합니다." }, { status: 400 });
    }

    // 세미콜론(;) 및 쉼표(,) 다중 수신자 지원 정규화
    const normalizeAddresses = (raw?: string) => {
      if (!raw) return undefined;
      return raw
        .split(/[;,]+/)
        .map((addr) => addr.trim())
        .filter(Boolean)
        .join(", ");
    };

    const formattedTo = normalizeAddresses(to) || to;
    const formattedCc = normalizeAddresses(cc);

    // SMTP 발송 실행
    const info = await sendMail(smtpConfig, {
      from: senderEmail,
      to: formattedTo,
      cc: formattedCc,
      subject,
      text,
      html,
    });

    return NextResponse.json({
      success: true,
      messageId: info.messageId,
    });
  } catch (error: any) {
    console.error("메일 발송/회신 실패:", error);
    return NextResponse.json(
      {
        error: error.message || "메일 전송 중 오류가 발생했습니다. (SMTP 설정 또는 앱 비밀번호를 확인하세요)",
      },
      { status: 500 }
    );
  }
}
