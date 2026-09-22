import { readFile, writeFile, mkdir, cp, rm, stat } from 'node:fs/promises';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { marked } from 'marked';
import { escape, layout, postList, pdfSection, validatePdf } from './site.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'dist');
const site = JSON.parse(await readFile(join(root, 'site.json'), 'utf8'));
const posts = JSON.parse(await readFile(join(root, 'content/posts.json'), 'utf8'));
if (!/^https:\/\/[a-z0-9.-]+$/.test(site.url)) throw new Error('site.url must be an HTTPS origin without trailing slash.');
const seen = new Set();
for (const post of posts) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(post.slug) || seen.has(post.slug)) throw new Error(`Invalid or duplicate slug: ${post.slug}`);
  seen.add(post.slug);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(post.date) || !Number.isFinite(Date.parse(post.date)) || new Date(post.date).toISOString().slice(0, 10) !== post.date) throw new Error(`Invalid date: ${post.date}`);
  for (const field of ['title', 'description', 'category', 'project']) if (typeof post[field] !== 'string' || !post[field].trim()) throw new Error(`Missing ${field}: ${post.slug}`);
  post.markdown = await readFile(join(root, 'content/posts', `${post.slug}.md`), 'utf8');
  post.minutes = Math.max(1, Math.ceil(post.markdown.replace(/\s/g, '').length / 500));
}
posts.sort((a, b) => b.date.localeCompare(a.date));
let pdf = null;
try {
  const file = await readFile(join(root, 'public/files/portfolio.pdf'));
  validatePdf(file);
  pdf = { bytes: file.length };
} catch (error) { if (error.code !== 'ENOENT') throw error; }

// The only removable directory is this generator's fixed output, never a user-supplied path.
if (out !== join(root, 'dist') || dirname(out) !== root) throw new Error('Invalid build output path.');
await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
await cp(join(root, 'public'), out, { recursive: true });
const pages = [];
async function page(path, title, body, active = '', description, article = false) {
  const file = path === '/404.html' ? join(out, '404.html') : join(out, path, 'index.html');
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, layout({ site, title, description, path, active, body, article }));
  if (path !== '/404.html') pages.push(path);
}

await page('/', '', `<section class="intro"><p class="eyebrow">RYAN MIN / ENGINEERING NOTES</p><h1>만들며 고민한 것들을<br>기록합니다<span class="accent">.</span></h1><p class="intro-copy">안녕하세요, 민경철입니다.<br>시스템을 설계하며 마주한 문제와 선택의 이유를 씁니다.</p><a class="text-link intro-link" href="/about/">조금 더 알아보기 <span aria-hidden="true">↗</span></a></section><section aria-labelledby="writing-title"><div class="section-heading"><h2 id="writing-title">개발 기록</h2><span>${String(posts.length).padStart(2, '0')}개의 글</span></div>${postList(posts)}</section><aside class="portfolio-note"><p>프로젝트를 한눈에 보고 싶다면</p><a href="/portfolio/">포트폴리오 보기 <span aria-hidden="true">→</span></a></aside>`, 'writing');

for (const post of posts) {
  const headings = [];
  const renderer = new marked.Renderer();
  renderer.heading = function ({ tokens, depth }) {
    if (depth === 1) throw new Error('Article body starts at h2; title is in posts.json.');
    const text = this.parser.parseInline(tokens);
    const id = `section-${headings.length + 1}`;
    headings.push({ id, text, depth });
    return `<h${depth} id="${id}">${text}</h${depth}>\n`;
  };
  const content = marked.parse(post.markdown, { renderer });
  const others = posts.filter(p => p.slug !== post.slug);
  await page(`/writing/${post.slug}/`, post.title, `<article><header class="article-header"><a class="back-link" href="/">← 모든 글</a><div class="post-meta"><span>${escape(post.category)}</span><span aria-hidden="true">·</span><span>${escape(post.project)}</span></div><h1>${escape(post.title)}</h1><p class="article-summary">${escape(post.description)}</p><div class="article-byline"><span>민경철</span><time datetime="${post.date}">${post.date.replaceAll('-', '.')} 정리</time><span>${post.minutes}분 읽기</span></div></header><nav class="toc" aria-label="글 목차"><span class="eyebrow">이 글에서</span><ol>${headings.filter(h => h.depth === 2).map(h => `<li><a href="#${h.id}">${h.text}</a></li>`).join('')}</ol></nav><div class="prose">${content}</div><div class="article-end"><span class="end-mark" aria-hidden="true">✳</span><p>문제와 선택의 이유를 남깁니다.</p></div></article><section class="related" aria-labelledby="related-title"><div class="section-heading"><h2 id="related-title">다른 기록</h2><a href="/">전체 글 →</a></div><ul>${others.map(p => `<li><a href="/writing/${p.slug}/">${escape(p.title)} <span aria-hidden="true">↗</span></a></li>`).join('')}</ul></section>`, 'writing', post.description, true);
}

const projects = [
  { name: 'Idea2Strategy', label: '주식 전략 테스트 플랫폼', role: '팀장 · 시스템·DB·인프라 설계', text: '투자 아이디어를 블록으로 만들고, 백테스트와 모의투자로 확인하는 서비스. 요청 접수와 계산 자원을 분리하고 데이터의 보존·조회 흐름을 설계했습니다.', tags: '시스템 설계 / 데이터 파이프라인', repo: 'https://github.com/Idea2Strategy/Idea2Strategy', slug: 'keep-the-inputs' },
  { name: '숨길', label: '취향 기반 협업 여행 서비스', role: '추천 방식 · 취향 데이터 흐름 설계', text: '여러 사람의 취향을 모아 여행 장소와 일정을 정하는 서비스. 반응과 태그가 바뀔 때 선호도를 갱신하는 구조를 고민했습니다.', tags: '추천 시스템 / 데이터 정합성', repo: 'https://github.com/Soomgil/soomgil', slug: 'changing-preferences' },
  { name: 'Stackcord', label: 'AI 협업 플러그인', role: '제품 기획 · 협업 흐름·검증 도구 설계', text: 'AI가 바뀌어도 서비스의 결정과 다음 작업을 이어가기 위한 도구. 문맥 복원과 작업 인계, 정책 승인과 검증을 연결합니다.', tags: '개발 도구 / AI 협업', repo: 'https://github.com/kcrmin/Stackcord', slug: 'decisions-that-last' }
];
await page('/portfolio/', '포트폴리오', `<header class="page-heading"><p class="eyebrow">SELECTED WORK</p><h1>포트폴리오<span class="accent">.</span></h1><p>서비스의 목적을 구조로 옮기며 고민한 세 가지 프로젝트.</p></header><div class="projects">${projects.map((p, i) => `<section class="project"><span class="project-number">0${i + 1}</span><div><p class="project-label">${p.label}</p><h2>${p.name}</h2><p class="project-role">${p.role}</p><p class="project-description">${p.text}</p><p class="project-tags">${p.tags}</p><div class="project-links"><a href="/writing/${p.slug}/">설계 기록 읽기 →</a><a href="${p.repo}">GitHub ↗</a></div></div></section>`).join('')}</div>${pdfSection(pdf)}`, 'portfolio');

await page('/about/', '소개', `<header class="page-heading"><p class="eyebrow">ABOUT</p><h1>안녕하세요,<br>민경철입니다<span class="accent">.</span></h1><p class="english-name">Ryan Min</p></header><div class="prose about-copy"><p>서로 다른 요구가 하나의 서비스로 연결되는 과정에 관심이 있습니다. 기능이 동작하는 것뿐 아니라, 데이터가 어디서 생기고 어떻게 바뀌며 어떤 기준으로 확인되는지 고민합니다.</p><p>프로젝트에서는 시스템과 데이터 구조를 설계하고, 팀원들과 그 흐름을 함께 이해하는 일을 해왔습니다. 최근에는 AI와 개발할 때 결정과 작업 맥락을 이어가는 도구를 만들고 있습니다.</p><h2>이곳에 남기는 것</h2><p>개발 중에 마주한 문제, 비교한 방법, 선택한 이유를 기록합니다. 직접 한 일과 팀의 구현, 확인한 결과와 아직 확인하지 못한 부분을 구분해서 쓰려고 합니다.</p><p>많이 모으기보다, 다시 읽어도 도움이 되는 글을 조금씩 남기겠습니다.</p></div><div class="about-links"><a class="button" href="/portfolio/">포트폴리오 보기 →</a><a class="text-link" href="${site.github}">GitHub ↗</a></div>`, 'about');
await page('/404.html', '페이지를 찾을 수 없습니다', '<section class="page-heading error-page"><p class="eyebrow">404</p><h1>페이지를 찾을 수 없습니다.</h1><p>주소가 바뀌었거나 없는 페이지입니다.</p><a class="button" href="/">개발 기록으로 돌아가기 →</a></section>');

await writeFile(join(out, 'feed.xml'), `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>민경철의 개발 기록</title><link>${site.url}/</link><description>${escape(site.description)}</description><language>ko</language><atom:link href="${site.url}/feed.xml" rel="self" type="application/rss+xml"/>${posts.map(p => `<item><title>${escape(p.title)}</title><link>${site.url}/writing/${p.slug}/</link><guid>${site.url}/writing/${p.slug}/</guid><pubDate>${new Date(`${p.date}T00:00:00+09:00`).toUTCString()}</pubDate><description>${escape(p.description)}</description></item>`).join('')}</channel></rss>`);
await writeFile(join(out, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${pages.map(p => `<url><loc>${site.url}${p}</loc></url>`).join('')}</urlset>`);
await writeFile(join(out, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${site.url}/sitemap.xml\n`);
await writeFile(join(out, '.nojekyll'), '');
console.log(`Built ${pages.length + 1} pages, ${posts.length} articles. PDF: ${pdf ? 'ready' : 'not added'}.`);
