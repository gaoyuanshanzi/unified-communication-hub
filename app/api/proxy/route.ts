import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions, SessionData } from "@/lib/session";

// 허용된 도메인 목록 (보안: allowlist 방식)
const ALLOWED_DOMAINS = [
  "accounts.kakao.com",
  "web.kakaotalk.com",
  "mail.naver.com",
  "mail.google.com",
  "accounts.google.com",
  "nid.naver.com",
];

export async function GET(request: NextRequest) {
  // 인증 확인
  const response = new NextResponse();
  const session = await getIronSession<SessionData>(request, response, sessionOptions);

  if (!session.isLoggedIn) {
    return NextResponse.json({ error: "인증되지 않은 접근입니다." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get("url");

  if (!targetUrl) {
    return NextResponse.json({ error: "URL 파라미터가 필요합니다." }, { status: 400 });
  }

  // URL 유효성 검사
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(targetUrl);
  } catch {
    return NextResponse.json({ error: "유효하지 않은 URL입니다." }, { status: 400 });
  }

  // 허용된 도메인 확인
  const isAllowed = ALLOWED_DOMAINS.some(
    (domain) => parsedUrl.hostname === domain || parsedUrl.hostname.endsWith(`.${domain}`)
  );

  if (!isAllowed) {
    return NextResponse.json({ error: "허용되지 않은 도메인입니다." }, { status: 403 });
  }

  try {
    const fetchResponse = await fetch(targetUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8",
      },
      redirect: "follow",
    });

    const contentType = fetchResponse.headers.get("content-type") || "text/html";
    const body = await fetchResponse.text();

    const proxyResponse = new NextResponse(body, {
      status: fetchResponse.status,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "no-store",
      },
    });

    // iframe 차단 헤더 제거 (X-Frame-Options, CSP)
    proxyResponse.headers.delete("x-frame-options");
    proxyResponse.headers.delete("content-security-policy");
    proxyResponse.headers.delete("x-content-type-options");

    return proxyResponse;
  } catch (error) {
    console.error("프록시 요청 오류:", error);
    return NextResponse.json(
      { error: "원격 페이지를 가져오는 데 실패했습니다." },
      { status: 502 }
    );
  }
}
