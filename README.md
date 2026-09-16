# Job Tracker Web

개인 구직 진행상황을 웹에서 관리하는 정적 웹 앱입니다.

## Features

- Email / Password 로그인
- Job 등록 / 수정 / 삭제
- 검색 / 상태 / 고용형태 / 타입 필터
- Job 상세 페이지
- JD PDF 업로드 / 열람 / 삭제
- Private Supabase Storage
- 사용자별 RLS

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
4. `js/config.js`의 `publishableKey`에 Supabase Publishable key를 설정합니다.

Publishable key는 브라우저에 노출되는 클라이언트용 키입니다. `service_role` key와 DB 비밀번호는 절대 GitHub에 넣지 않습니다.

JD PDF는 `job-pdfs` private bucket에 사용자 ID / Job ID 기준으로 저장되며, 업로드 크기는 10MB 이하입니다.

## GitHub Pages

Repository Settings → Pages → Deploy from branch → `main` / `/ (root)`를 선택합니다.

현재 프로젝트는 개인 데이터 없이 빈 상태로 시작하며, 로그인 후 Supabase에서 데이터를 읽습니다.
