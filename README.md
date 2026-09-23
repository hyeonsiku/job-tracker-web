# Job Tracker Web

개인 구직 진행상황을 웹에서 관리하는 React 기반 웹 앱입니다.

🌐 **Live:** https://hyeonsiku.github.io/job-tracker-web/

## Features
- Email / Password 로그인
- Job 등록 / 수정 / 삭제
- 검색 / 상태 / 고용형태 / 타입 필터
- Job 상세 정보 관리
- JD PDF 업로드 / 열람 / 삭제
- Private Supabase Storage
- 사용자별 Row Level Security (RLS)
- Google Calendar 면접 일정 등록
- 기존 Google Calendar 일정 업데이트 / 삭제
- JSON 데이터 Import / Export
- PDF 일괄 Import

## Architecture
- **Frontend:** React + Vite
- **Hosting:** GitHub Pages
- **Authentication:** Supabase Auth
- **Database:** Supabase PostgreSQL
- **Storage:** Supabase Storage
- **Security:** PostgreSQL RLS + Supabase Storage RLS
- **Calendar:** Google Calendar API

개인 회사명, 지원정보, 면접정보, PDF 등 실제 구직 데이터는 GitHub repository에 저장하지 않습니다. 실제 데이터는 Supabase에 저장되며 RLS를 통해 사용자별 접근이 제한됩니다.

## Security

### Database
`public.jobs` 테이블에 RLS를 적용하여 로그인한 사용자가 자신의 데이터만 조회 / 등록 / 수정 / 삭제할 수 있도록 구성합니다.

예:
```sql
auth.uid() = user_id
```

### Storage
JD PDF는 `job-pdfs` private bucket에 저장합니다.

Storage path:
```text
<user_id>/<job_id>/<filename>.pdf
```

Storage RLS 역시 사용자 ID를 기준으로 접근을 제한합니다.

### Client configuration
브라우저에서 사용하는 Supabase Publishable key는 클라이언트 코드에 포함될 수 있습니다. 대신 다음 정보는 절대 공개하지 않습니다.
- Supabase service_role key
- Database password
- 기타 서버 전용 secret

## Google Calendar
면접 일정이 있는 Job에서 Google Calendar에 일정을 등록할 수 있습니다.

기본 이벤트 제목:
```text
[面接] 会社名 - 職種
```

Google Calendar 이벤트 ID를 Supabase의 Job 데이터에 저장하여 중복 방지와 일정 수정 / 삭제를 지원합니다.

## Development

### Install
```bash
npm install
```

### Development server
```bash
npm run dev
```

### Production build
```bash
npm run build
```

빌드 결과는 `dist/`에 생성됩니다.

## Supabase setup
1. Supabase project를 생성합니다.
2. `supabase/schema.sql`을 SQL Editor에서 실행합니다.
3. `supabase/migrations/`의 필요한 migration을 적용합니다.
4. Authentication에서 Email provider를 확인합니다.
5. Storage에 `job-pdfs` private bucket을 생성합니다.
6. Storage RLS 정책을 적용합니다.
7. `public/js/config.js`에 Supabase 설정을 구성합니다.

Publishable key는 브라우저에 노출되는 클라이언트용 키입니다. `service_role` key와 DB 비밀번호는 GitHub에 저장하지 않습니다.

JD PDF 업로드 크기는 10MB 이하이며, 사용자 ID / Job ID 기준으로 저장됩니다.

## GitHub Pages deployment
GitHub Actions를 사용하여 `main` branch에 push되면 Vite build 후 GitHub Pages에 자동 배포합니다.

```text
push to main
   ↓
GitHub Actions
   ↓
npm install
   ↓
npm run build
   ↓
upload-pages-artifact
   ↓
deploy-pages
   ↓
GitHub Pages
```

현재 workflow는 Node.js 24 호환 Action을 사용합니다.
- actions/checkout@v5
- actions/setup-node@v5
- actions/configure-pages@v6
- actions/upload-pages-artifact@v4
- actions/deploy-pages@v5

## Repository structure
```text
.
├── src/
│   ├── App.jsx
│   ├── main.jsx
│   ├── privacy/
│   └── lib/
├── public/
│   └── js/
│       └── config.js
├── supabase/
│   ├── schema.sql
│   └── migrations/
├── privacy/
│   └── index.html
├── index.html
├── vite.config.js
└── .github/
    └── workflows/
        └── deploy-pages.yml
```

## Privacy
Privacy policy:
https://hyeonsiku.github.io/job-tracker-web/privacy/

실제 구직 데이터는 public GitHub repository에 포함하지 않는 것을 전제로 합니다.
