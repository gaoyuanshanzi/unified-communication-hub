# Unified Communication Hub — Native Webmail Client

KakaoTalk/Daum · Naver Mail · Gmail 통합 실시간 네이티브 웹메일 클라이언트

Next.js 16 (App Router) + TypeScript + Tailwind CSS + IMAP (`imapflow` + `mailparser`) + Neon PostgreSQL

---

## 🌟 핵심 특징

1. **iframe 및 외부 프록시 100% 제거**: 브라우저 보안 제약(`X-Frame-Options`, `CORS`, `SameSite Cookie`)을 원천적으로 해결하고 Next.js 백엔드 서버에서 IMAP 프로토콜로 직접 메일을 수신합니다.
2. **실시간 3사 IMAP 완벽 연동**:
   - **Kakao / Daum Mail**: `imap.daum.net:993` (SSL)
   - **Naver Mail**: `imap.naver.com:993` (SSL)
   - **Gmail**: `imap.gmail.com:993` (SSL)
3. **완벽한 메일 클라이언트 UI (화이트 모드)**:
   - 각 메일함별 실시간 메일 목록 (발신자, 제목, 수신일시, 읽음/안읽음 표시)
   - 검색 및 실시간 필터링
   - 메일 상세 본문 뷰어 (HTML 본문 살균 렌더링, 첨부파일 목록 메타데이터)
   - 전체/개별 편지함 실시간 동기화(새로고침)
4. **안전한 보안 및 계정 관리**:
   - 관리자 인증 게이트 (`admin` / `123jesus`)
   - `AES-256-GCM` 양방향 암호화로 Neon PostgreSQL에 사용자 메일 계정 및 앱 비밀번호 안전 보관
   - 일회성 직접 연결 및 DB 저장 선택 지원

---

## 🚀 메일 서비스별 앱 비밀번호 설정 방법

보안 정책에 따라 일반 로그인 비밀번호 대신 각 서비스에서 발급하는 **앱 비밀번호 (App Password)**를 사용합니다:

### 1. Kakao / Daum Mail
1. [Daum 메일](https://mail.daum.net) 접속 → 좌측 하단 **환경설정** 클릭
2. **「IMAP/POP3 설정」** → **IMAP/SMTP 사용**을 **「사용함」**으로 설정
3. 카카오계정 관리 → **보안** → **2단계 인증** → **「애플리케이션 비밀번호」** 생성 후 입력

### 2. Naver Mail
1. [네이버 메일](https://mail.naver.com) 접속 → 좌측 메뉴 하단 **환경설정(톱니바퀴)** 클릭
2. **「POP3/IMAP 설정」** 탭 클릭
3. **IMAP/SMTP 설정**에서 **「IMAP/SMTP 사용」**을 **「사용함」**으로 변경 후 저장
4. 네이버 내정보 → **보안설정** → **2단계 인증** 관리 → **「애플리케이션 비밀번호」** 생성 후 입력

### 3. Gmail
1. [Google 계정 관리](https://myaccount.google.com) 접속
2. **보안** 탭으로 이동 → **2단계 인증** 활성화
3. [앱 비밀번호 페이지](https://myaccount.google.com/apppasswords) 접속
4. 앱 이름을 입력하고 생성된 **16자리 영문 비밀번호**를 복사하여 입력

---

## 📁 프로젝트 구조

```
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   ├── login/route.ts      # 관리자 로그인 API
│   │   │   └── logout/route.ts     # 로그아웃 API
│   │   └── mail/
│   │       ├── accounts/route.ts   # 메일 계정 DB 관리 (AES-256-GCM 암호화)
│   │       ├── list/route.ts       # IMAP 메일함 목록 실시간 조회
│   │       └── detail/route.ts     # IMAP 메일 상세 본문 파싱
│   ├── login/page.tsx              # 관리자 로그인 화면
│   ├── page.tsx                    # 3분할 통합 메일 클라이언트 대시보드
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── NativeMailColumn.tsx        # 컬럼별 메일함 목록 & 연결 폼
│   └── MailDetailView.tsx          # 메일 상세 본문 및 첨부파일 뷰어
├── lib/
│   ├── imap.ts                     # ImapFlow 및 mailparser 엔진
│   ├── crypto.ts                   # AES-256-GCM 비밀번호 암호화 유틸리티
│   ├── session.ts                  # iron-session 설정
│   └── prisma.ts                   # Prisma 싱글톤
├── prisma/
│   └── schema.prisma               # AdminSession, MailAccount 스키마
└── middleware.ts                   # 관리자 인증 보호 미들웨어
```

---

## 🌐 Vercel 환경 변수 설정

| Key | Value |
|---|---|
| `DATABASE_URL` | `postgresql://neondb_owner:npg_1qlyAzLi9gJS@ep-bitter-forest-axrre7za.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require` |
| `ADMIN_ID` | `admin` |
| `ADMIN_PASSWORD` | `123jesus` |
| `SESSION_SECRET` | `comm_hub_super_secret_key_2024_change_this_now` |
