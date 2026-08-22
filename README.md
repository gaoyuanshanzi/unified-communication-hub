# Unified Communication Hub

KakaoTalk · Naver Mail · Gmail 통합 커뮤니케이션 허브

Next.js (App Router) + TypeScript + Tailwind CSS + Neon PostgreSQL

---

## 🚀 로컬 개발 시작

### 1. 환경 변수 설정

```bash
cp .env.local.example .env.local
```

`.env.local` 파일을 열고 실제 값으로 수정하세요:

```
DATABASE_URL=postgresql://neondb_owner:...@.../neondb?sslmode=require
ADMIN_ID=admin
ADMIN_PASSWORD=123jesus
SESSION_SECRET=your_32_char_random_secret_here
```

### 2. 의존성 설치

```bash
npm install
```

### 3. Prisma DB 스키마 동기화

```bash
npx prisma db push
```

### 4. 웹 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000) 접속

---

## 🖥️ Electron 데스크톱 앱 실행 (3개 서비스 완전 임베딩)

웹 브라우저의 보안 정책(X-Frame-Options/CORS) 없이 **하나의 프로그램 창 안에서 카카오톡 · 네이버 메일 · Gmail이 100% 동작하는 데스크톱 전용 모드**입니다.

```bash
# 1. 로컬 전체 개발 환경 (Next.js + Electron 동시 실행)
npm run app:dev

# 2. Vercel 배포 URL과 연동하여 데스크톱 앱 실행
npm run app:prod
```

---

## 📁 프로젝트 구조

```
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   ├── login/route.ts      # 로그인 API
│   │   │   └── logout/route.ts     # 로그아웃 API
│   │   └── proxy/route.ts          # iframe 프록시 API
│   ├── login/page.tsx              # 관리자 로그인 페이지
│   ├── page.tsx                    # 메인 대시보드
│   ├── layout.tsx
│   └── globals.css
├── components/
│   └── ServiceFrame.tsx            # 서비스 iframe 컴포넌트
├── lib/
│   ├── session.ts                  # iron-session 설정
│   └── prisma.ts                   # Prisma 클라이언트
├── prisma/
│   └── schema.prisma               # DB 스키마
├── middleware.ts                   # 인증 미들웨어
├── .env.local                      # 환경 변수 (git 제외)
└── .env.local.example              # 환경 변수 예시 (git 포함)
```

---

## 🌐 GitHub + Vercel 배포 (gaoyuanshanzi@gmail.com)

### 1단계: GitHub 저장소 생성

GitHub(https://github.com)에 `gaoyuanshanzi@gmail.com` 계정으로 로그인 후,
새 저장소를 생성합니다. 저장소명 예: `unified-communication-hub`

### 2단계: Git 초기화 및 푸시

```bash
# Git 초기화 (이미 create-next-app이 초기화함)
git status

# 모든 파일 스테이징
git add .

# 첫 커밋
git commit -m "feat: Unified Communication Hub 초기 구현"

# GitHub 저장소 원격 추가 (YOUR_REPO_URL을 실제 URL로 교체)
git remote add origin https://github.com/gaoyuanshanzi/unified-communication-hub.git

# main 브랜치로 푸시
git branch -M main
git push -u origin main
```

### 3단계: Vercel 배포

#### 방법 A: Vercel 웹 대시보드 (권장)

1. [https://vercel.com](https://vercel.com) 에서 `gaoyuanshanzi@gmail.com`으로 로그인
2. **"New Project"** 클릭
3. GitHub 저장소 `unified-communication-hub` 선택 → **Import**
4. **Environment Variables** 섹션에 아래 3개 변수 추가:

   | 이름 | 값 |
   |------|-----|
   | `DATABASE_URL` | `postgresql://neondb_owner:npg_1qlyAzLi9gJS@ep-bitter-forest-axrre7za.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require` |
   | `ADMIN_ID` | `admin` |
   | `ADMIN_PASSWORD` | `123jesus` |
   | `SESSION_SECRET` | `comm_hub_super_secret_key_2024_change_this_now` |

5. **Deploy** 클릭

#### 방법 B: Vercel CLI

```bash
# Vercel CLI 설치
npm install -g vercel

# 로그인 (gaoyuanshanzi@gmail.com)
vercel login

# 배포
vercel

# 프로덕션 배포
vercel --prod
```

### 4단계: 배포 후 DB 마이그레이션

Vercel 배포 후 Neon 콘솔(https://console.neon.tech)에서 스키마가 자동으로 적용되었는지 확인하거나,
로컬에서 `DATABASE_URL`이 설정된 상태로 실행:

```bash
npx prisma db push
```

---

## ⚠️ 보안 주의사항

- `.env.local`은 절대 GitHub에 커밋하지 마세요
- 프로덕션 배포 시 `SESSION_SECRET`을 반드시 강력한 랜덤 값으로 변경하세요
- Vercel 환경 변수는 암호화되어 저장됩니다

---

## 🔧 기술 스택

| 항목 | 기술 |
|------|------|
| 프레임워크 | Next.js 16 (App Router) |
| 언어 | TypeScript |
| 스타일링 | Tailwind CSS v4 |
| 인증 | iron-session (HTTP-only 쿠키) |
| ORM | Prisma |
| 데이터베이스 | Neon PostgreSQL |
| 배포 | Vercel |
