# 민경철의 개발 기록

[블로그 열기](https://kcrmin.github.io)

글과 프로젝트를 담은 작은 정적 블로그입니다. Node.js 24 이상이 필요합니다. 방문자 브라우저에는 JavaScript나 외부 폰트 요청이 필요하지 않습니다.

## 글 추가

1. `content/posts/my-next-note.md`에 Markdown으로 글을 씁니다. 본문 제목은 `##`부터 시작합니다.
2. `content/posts.json`에 다음 항목을 추가합니다. `slug`는 확장자를 뺀 파일 이름과 같아야 하며, 영문 소문자·숫자·단어 사이 하이픈만 사용합니다. 글 제목과 본문은 한국어로 작성할 수 있습니다.

```json
{
  "slug": "my-next-note",
  "title": "글 제목",
  "description": "목록에서 보여 줄 짧은 설명",
  "date": "2026-09-23",
  "category": "개발 기록",
  "project": "프로젝트 이름"
}
```

3. `main`에 반영하면 GitHub Actions가 빌드·검사 후 자동 배포합니다. 목록, RSS, 사이트맵도 갱신됩니다.

Markdown은 작성자를 신뢰하는 게시 시스템입니다. 임의 방문자의 HTML·Markdown 입력을 받아 렌더링하는 용도로 사용하지 않습니다.

## PDF 포트폴리오 추가

완성된 PDF를 **`public/files/portfolio.pdf`**로 올리고 `main`에 반영하세요. 다음 배포에서 포트폴리오 페이지에 **PDF 열기 / 다운로드**가 자동으로 생깁니다. 파일이 없으면 PDF 영역은 표시하지 않습니다. 같은 이름으로 교체하면 링크 주소가 유지됩니다.

GitHub 웹에서도 `public/files` 폴더 → **Add file → Upload files**로 올릴 수 있습니다. 저장소는 공개이므로 게시할 최종 PDF만 넣으세요. PDF 본문은 브라우저 기본 뷰어로 열립니다.

## 로컬 확인

```sh
npm ci
npm run check
python -m http.server 4173 --directory dist --bind 127.0.0.1
```

브라우저에서 `http://localhost:4173`을 엽니다. 글을 수정하면 `npm run build`를 다시 실행합니다.

## 구조

- `site.json`: 이름, 소개, 사이트 주소
- `content/`: 글 메타데이터와 Markdown 원고
- `scripts/build.mjs`: 페이지·RSS·사이트맵 생성
- `scripts/site.mjs`: 공통 레이아웃과 PDF 표시
- `public/styles.css`: 반응형 스타일
- `.github/workflows/pages.yml`: 검사와 GitHub Pages 배포

포트폴리오 소개와 짧은 자기소개는 `scripts/build.mjs`에서 수정합니다. 글 네 편은 기존 Notion 프로젝트 기록에서 선별·재구성했으며, 표시 날짜는 블로그 편집일입니다. Notion을 바꿔도 자동 동기화되지는 않습니다. 구현 근거는 가능한 한 고정 커밋으로 연결합니다. 새 글을 추가할 때도 개인 기여, 팀 구현, 별도 검증 결과를 구분해서 적습니다.

GitHub Pages 설정은 **Settings → Pages → Source: GitHub Actions**입니다. 기본 주소는 `https://kcrmin.github.io`이며 기존 개인 도메인은 변경하지 않습니다.
