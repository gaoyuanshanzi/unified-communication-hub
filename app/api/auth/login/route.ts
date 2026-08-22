import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions, SessionData } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { adminId, adminPassword } = body;

    const correctId = process.env.ADMIN_ID;
    const correctPassword = process.env.ADMIN_PASSWORD;

    if (adminId !== correctId || adminPassword !== correctPassword) {
      return NextResponse.json(
        { error: "아이디 또는 비밀번호가 올바르지 않습니다." },
        { status: 401 }
      );
    }

    const response = NextResponse.json({ success: true });

    const session = await getIronSession<SessionData>(request, response, sessionOptions);

    // IP와 User-Agent 추출
    const ipAddress =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "unknown";
    const userAgent = request.headers.get("user-agent") || "unknown";

    // DB에 세션 로그 저장
    let sessionId: string | undefined;
    try {
      const dbSession = await prisma.adminSession.create({
        data: {
          ipAddress: ipAddress.split(",")[0].trim(),
          userAgent,
        },
      });
      sessionId = dbSession.id;
    } catch (dbError) {
      console.error("DB 세션 로그 오류 (계속 진행):", dbError);
    }

    session.isLoggedIn = true;
    session.adminId = adminId;
    session.loginTime = new Date().toISOString();
    if (sessionId) session.sessionId = sessionId;

    await session.save();

    return response;
  } catch (error) {
    console.error("로그인 오류:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
