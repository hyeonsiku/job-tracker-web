# Job Tracker Web

개인 구직 진행상황을 웹에서 관리하는 정적 웹 앱입니다.

## Architecture

- GitHub Pages: frontend hosting
- Supabase Auth: email/password login
- Supabase Database: job data
- Supabase Storage: private job-description PDFs
- Row Level Security (RLS): 로그인한 사용자의 데이터만 조회/변경

개인 회사명, 지원정보, PDF 등 실제 구직 데이터는 GitHub에 저장하지 않습니다.

## Supabase setup

1. Supabase SQL Editor에서 `supabase/schema.sql` 전체를 실행합니다.
2. Supabase Authentication에서 Email provider를 확인합니다.
3. GitHub Pages 주소를 Auth URL Configuration에 등록합니다.
4. `index.html`과 `company.html`의 `SUPABASE_PUBLISHABLE_KEY`를 프로젝트의 Publishable key로 설정합니다.

Publishable/anon key는 브라우저에 노출되어도 되는 키입니다. `service_role` key는 절대 GitHub Pages 코드에 넣지 않습니다.

## GitHub Pages

Repository Settings → Pages → Deploy from branch → `main` / `/ (root)`를 선택합니다.

현재 프로젝트는 개인 데이터 없이 빈 상태로 시작하며, 로그인 후 Supabase에서 데이터를 읽습니다.
