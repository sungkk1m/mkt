# 🎮 게임 광고 크리에이티브 수집 대시보드

경쟁사 게임 광고의 텍스트·이미지·비디오를 SearchAPI.io를 통해 Meta 광고 라이브러리에서 자동 수집하고 웹에서 조회하는 대시보드입니다.

## 환경변수

`.env.local` 파일에 다음 값을 설정하세요:

| 변수 | 설명 |
|------|------|
| `SEARCHAPI_KEY` | SearchAPI.io API 키 |
| `DATABASE_URL` | Turso 데이터베이스 URL |
| `DATABASE_AUTH_TOKEN` | Turso 인증 토큰 |
| `COLLECT_API_KEY` | 수집 API 보호용 비밀 키 |
| `ADMIN_PASSWORD` | 수집 관리 페이지 비밀번호 |

## 로컬 실행

```bash
npm install
npm run db:push      # DB 테이블 생성
npm run db:seed      # 테스트 데이터 삽입 (선택)
npm run dev          # 개발 서버 시작 → http://localhost:3000
```

## 배포 (Vercel)

1. GitHub에 코드 푸시
2. Vercel에서 Import → 환경변수 5개 설정 → Deploy
