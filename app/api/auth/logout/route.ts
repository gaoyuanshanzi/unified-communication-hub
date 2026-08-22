import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions, SessionData } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const response = NextResponse.json({ success: true });
    const session = await getIronSession<SessionData>(request, response, sessionOptions);

    // DB에 로그아웃 시간 기록
    if (session.sessionId) {
      try {
        await prisma.adminSession.update({
          where: { id: session.sessionId },
          data: { loggedOutAt: new Date() },
        });
      } catch (dbError) {
        console.error("DB 로그아웃 업데이트 오류 (계속 진행):", dbError);
      }
    }

    session.destroy();
    await session.save();

    return response;
  } catch (error) {
    console.error("로그아웃 오류:", error);
    return NextResponse.json(
      { error: "로그아웃 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
