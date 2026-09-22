export const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export function validatePdf(buffer) {
  if (buffer.subarray(0, 5).toString('ascii') !== '%PDF-') throw new Error('portfolio.pdf must be a PDF file.');
}

export function pdfSection(pdf) {
  return `<section class="pdf-section" aria-labelledby="pdf-title"><div><span class="eyebrow">DOCUMENT</span><h2 id="pdf-title">PDF 포트폴리오</h2><p>${pdf ? '프로젝트와 설계 경험을 한 문서로 정리했습니다.' : '주요 프로젝트를 정리한 문서를 준비 중입니다.'}</p></div>${pdf ? '<div class="pdf-actions"><a class="button" href="/files/portfolio.pdf">PDF 열기 <span aria-hidden="true">↗</span></a><a class="text-link" href="/files/portfolio.pdf" download>다운로드</a></div>' : '<span class="status">준비 중</span>'}</section>`;
}

export function layout({ site, title, description = site.description, path = '/', active = '', body, article = false }) {
  const nav = [['/', '글', 'writing'], ['/portfolio/', '포트폴리오', 'portfolio'], ['/about/', '소개', 'about']];
  const fullTitle = title ? `${title} · ${site.name}` : `${site.name} — 개발 기록`;
  return `<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escape(fullTitle)}</title><meta name="description" content="${escape(description)}"><meta name="theme-color" content="#ffffff">
<link rel="canonical" href="${site.url}${path}"><meta property="og:title" content="${escape(fullTitle)}"><meta property="og:description" content="${escape(description)}"><meta property="og:type" content="${article ? 'article' : 'website'}"><meta property="og:url" content="${site.url}${path}"><meta property="og:locale" content="ko_KR"><meta name="twitter:card" content="summary">
<link rel="icon" href="/favicon.svg" type="image/svg+xml"><link rel="alternate" type="application/rss+xml" title="민경철의 개발 기록" href="/feed.xml"><link rel="stylesheet" href="/styles.css"></head>
<body><a class="skip-link" href="#main">본문으로 바로가기</a><div class="shell"><header class="site-header"><a class="brand" href="/" aria-label="민경철 홈">민경철<span class="brand-dot" aria-hidden="true">.</span></a><nav aria-label="주 메뉴">${nav.map(([url, label, key]) => `<a href="${url}"${key === active ? ' aria-current="page"' : ''}>${label}</a>`).join('')}</nav></header>
<main id="main" tabindex="-1">${body}</main><footer class="site-footer"><span>© ${new Date().getUTCFullYear()} ${site.englishName}</span><div><a href="${site.github}">GitHub <span aria-hidden="true">↗</span></a><a href="/feed.xml">RSS</a><a href="#main">맨 위로 ↑</a></div></footer></div></body></html>`;
}

export function postList(posts) {
  return `<ol class="post-list">${posts.map((p, i) => `<li><a class="post-link" href="/writing/${p.slug}/"><div class="post-meta"><span>${escape(p.category)}</span><span class="meta-dot" aria-hidden="true">·</span><span>${escape(p.project)}</span></div><h3>${escape(p.title)}</h3><p>${escape(p.description)}</p><div class="post-bottom"><time datetime="${p.date}">${p.date.replaceAll('-', '.')}</time><span>${p.minutes}분 읽기</span></div><span class="entry-number" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span></a></li>`).join('')}</ol>`;
}
