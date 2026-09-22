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

await page('/', '', `<section class="intro"><p class="eyebrow">RYAN MIN / BACKEND ENGINEER</p><h1>백엔드 개발자<br>민경철입니다<span class="accent">.</span></h1><p class="intro-copy">주식 투자 전략 테스트와 여행 추천 서비스를 만들었습니다.<br>직접 맡은 개발과 그 과정에서 내린 선택을 정리합니다.</p><div class="intro-actions"><a class="button" href="/portfolio/">포트폴리오 보기 <span aria-hidden="true">→</span></a><a class="text-link" href="/about/">소개</a><a class="text-link" href="${site.github}">GitHub <span aria-hidden="true">↗</span></a></div></section>
<section class="selected-work" aria-labelledby="selected-title"><div class="section-heading"><h2 id="selected-title">대표 프로젝트</h2><a href="/portfolio/">자세히 보기 →</a></div><ul class="project-index"><li><a href="/portfolio/#idea2strategy"><strong>Idea2Strategy</strong><span>Java 백엔드와 실행 자원 분리</span><span aria-hidden="true">↗</span></a></li><li><a href="/portfolio/#soomgil"><strong>숨길</strong><span>추천 시스템과 취향 데이터 갱신</span><span aria-hidden="true">↗</span></a></li><li><a href="/portfolio/#stackcord"><strong>Stackcord</strong><span>AI 협업 플러그인과 검증 CLI</span><span aria-hidden="true">↗</span></a></li></ul></section>
<section id="writing" aria-labelledby="writing-title"><div class="section-heading"><h2 id="writing-title">개발 기록</h2><span>${String(posts.length).padStart(2, '0')}개의 글</span></div>${postList(posts)}</section>`, 'writing');

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
  await page(`/writing/${post.slug}/`, post.title, `<article><header class="article-header"><a class="back-link" href="/#writing">← 모든 글</a><div class="post-meta"><span>${escape(post.category)}</span><span aria-hidden="true">·</span><span>${escape(post.project)}</span></div><h1>${escape(post.title)}</h1><p class="article-summary">${escape(post.description)}</p><div class="article-byline"><span>민경철</span><time datetime="${post.date}">${post.date.replaceAll('-', '.')} 정리</time><span>${post.minutes}분 읽기</span></div></header><nav class="toc" aria-label="글 목차"><span class="eyebrow">이 글에서</span><ol>${headings.filter(h => h.depth === 2).map(h => `<li><a href="#${h.id}">${h.text}</a></li>`).join('')}</ol></nav><div class="prose">${content}</div><div class="article-end"><span class="end-mark" aria-hidden="true">✳</span><p>문제와 선택의 이유를 남깁니다.</p></div></article><section class="related" aria-labelledby="related-title"><div class="section-heading"><h2 id="related-title">다른 기록</h2><a href="/#writing">전체 글 →</a></div><ul>${others.map(p => `<li><a href="/writing/${p.slug}/">${escape(p.title)} <span aria-hidden="true">↗</span></a></li>`).join('')}</ul></section>`, 'writing', post.description, true);
}

const projects = [
  { id: 'idea2strategy', name: 'Idea2Strategy', label: '주식 투자 전략 테스트 플랫폼', role: '팀장 / Java 백엔드 개발, 시스템과 DB 초기 설계', text: '매수와 매도 조건을 블록으로 조합하고, 과거 시세와 실시간 모의거래로 손익을 확인하는 서비스입니다.', decision: '요청을 받는 API, 장중 모의거래, 과거 시세 계산은 필요한 실행 시간이 달랐습니다. 작업별로 자원을 나누고, 백테스트 요청은 큐에 보관해 계산 서버가 꺼져 있어도 접수할 수 있도록 설계했습니다.', result: '담당 팀원과 요청 흐름을 검토하며 설계를 구체화했고, AWS에서 예약 시작·종료와 요청에 따른 기동을 확인했습니다.', tags: 'Java / PostgreSQL / AWS EC2·SQS', repo: 'https://github.com/Idea2Strategy/Idea2Strategy', slug: 'when-to-run', note: '서버를 나눈 기준과 실행 흐름', secondSlug: 'keep-the-inputs', secondNote: '시세 데이터의 보존과 조회' },
  { id: 'soomgil', name: '숨길', label: '취향 기반 협업 여행 서비스', role: '백엔드와 추천 시스템 설계·개발', text: '장소를 스와이프하며 취향을 모으고, 일행이 함께 갈 장소와 일정을 정하는 서비스입니다.', decision: '한 번 받은 좋아요가 계속 유효한 것은 아닙니다. 행동 이력과 현재 취향을 분리하고, 반응이나 장소 태그가 바뀌면 이전 기여를 빼고 새 기여를 반영하는 구조를 만들었습니다.', result: '별도 DB 검증으로 반응 변경·반복과 장소 태그 갱신에 따라 개인 선호도가 갱신되는 경로를 확인했습니다.', tags: 'Java / Spring Boot / PostgreSQL', repo: 'https://github.com/Soomgil/soomgil', slug: 'changing-preferences', note: '취향이 바뀔 때 데이터를 갱신하는 방법' },
  { id: 'stackcord', name: 'Stackcord', label: '오픈소스 AI 협업 플러그인', role: '제품 기획, Skills와 검증 CLI 설계·개발', text: '개발자와 각자의 AI가 같은 서비스 결정을 참고하고, 이전 작업의 코드를 이어받도록 만든 도구입니다.', decision: '숨길에서 Markdown으로 작업 맥락을 관리하다가, 새 프로젝트마다 기준을 다시 만드는 불편을 겪었습니다. 서비스 결정은 Git에 남기고 작업 안내는 Skills로, 코드와 승인 근거 확인은 CLI로 묶었습니다.', result: '초기 기획을 구체화한 뒤 반복 승인 요청이 줄어드는 것을 관찰했습니다. 시험 결과는 당시 코드·계약·정책에 연결해 이후 변경과 구별합니다.', tags: 'Go / Git / AI Skills', repo: 'https://github.com/kcrmin/Stackcord', slug: 'decisions-that-last', note: '대화가 바뀌어도 개발을 이어가는 방법' }
];
await page('/portfolio/', '포트폴리오', `<header class="page-heading"><p class="eyebrow">SELECTED WORK</p><h1>포트폴리오<span class="accent">.</span></h1><p>직접 맡은 개발, 선택의 이유, 확인한 결과를 소개합니다.</p><nav class="project-jump" aria-label="프로젝트 바로가기">${projects.map(p => `<a href="#${p.id}">${p.name}</a>`).join('')}</nav></header><div class="projects">${projects.map((p, i) => `<section class="project" id="${p.id}" aria-labelledby="${p.id}-title"><span class="project-number" aria-hidden="true">0${i + 1}</span><div><p class="project-label">${p.label}</p><h2 id="${p.id}-title">${p.name}</h2><p class="project-role">${p.role}</p><p class="project-description">${p.text}</p><dl class="project-details"><div><dt>선택한 방법</dt><dd>${p.decision}</dd></div><div><dt>확인한 결과</dt><dd>${p.result}</dd></div></dl><p class="project-tags">${p.tags}</p><div class="case-links"><a href="/writing/${p.slug}/">${p.note} <span aria-hidden="true">→</span></a>${p.secondSlug ? `<a href="/writing/${p.secondSlug}/">${p.secondNote} <span aria-hidden="true">→</span></a>` : ''}</div><a class="repo-link" href="${p.repo}">GitHub에서 프로젝트 보기 <span aria-hidden="true">↗</span></a></div></section>`).join('')}</div>${pdf ? pdfSection(pdf) : ''}`, 'portfolio');

await page('/about/', '소개', `<header class="page-heading"><p class="eyebrow">ABOUT</p><h1>안녕하세요,<br>민경철입니다<span class="accent">.</span></h1><p class="english-name">Ryan Min / Backend Engineer</p></header><div class="prose about-copy"><p>서비스가 하려는 일을 이해하고, 데이터를 어떻게 저장하고 처리할지 설계하는 백엔드 개발자입니다. Java와 Spring Boot로 개발하며 DB 구조와 실행 환경까지 함께 살펴왔습니다.</p><p>주식 투자 전략 테스트 프로젝트에서는 팀장으로 Java 백엔드 개발과 시스템 초기 설계를 맡았습니다. 여행 추천 서비스에서는 사용자 반응을 수집하고, 바뀐 취향을 추천에 반영하는 구조를 설계하고 개발했습니다.</p><h2>함께 개발하는 방식</h2><p>초기 설계를 문서로 설명하는 것만으로는 팀원이 이후 변경을 판단하기 어렵다는 것을 배웠습니다. 담당 팀원과 대안을 비교하고 함께 공부하면서 처음 세운 설계도 고쳤습니다. 각자 맡은 부분을 이해하고, 어려운 판단은 함께 살피는 방식으로 일했습니다.</p><p>AI와 개발할 때도 결정이 대화에만 남으면 같은 설명을 반복하게 됩니다. 이 경험에서 출발해 서비스의 결정과 코드 검증을 프로젝트 안에 남기는 오픈소스 도구 <a href="https://github.com/kcrmin/Stackcord">Stackcord</a>를 만들고 있습니다.</p><h2>학력과 교육</h2><dl class="education"><div><dt>Coventry University</dt><dd>BSc in Computing Science<br><span class="academic-result">First Class Honours</span></dd></div><div><dt>PSB Academy</dt><dd>Diploma in Infocomm Technology<br>GPA 3.81 / 4.00</dd></div><div><dt>SSAFY</dt><dd>삼성청년SW·AI아카데미<br>1학기 프로젝트 우수상</dd></div></dl><h2>이 블로그에 남기는 것</h2><p>노션에 쌓아 둔 개발 기록에서 한 글에 한 가지 문제를 골라 정리합니다. 어떤 방법을 비교했고 왜 선택했는지, 실제로 어디까지 확인했는지를 코드와 함께 남깁니다.</p></div><div class="about-links"><a class="button" href="/portfolio/">포트폴리오 보기 →</a><a class="text-link" href="${site.github}">GitHub ↗</a></div>`, 'about');
await page('/404.html', '페이지를 찾을 수 없습니다', '<section class="page-heading error-page"><p class="eyebrow">404</p><h1>페이지를 찾을 수 없습니다.</h1><p>주소가 바뀌었거나 없는 페이지입니다.</p><a class="button" href="/">개발 기록으로 돌아가기 →</a></section>');

await writeFile(join(out, 'feed.xml'), `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>민경철의 개발 기록</title><link>${site.url}/</link><description>${escape(site.description)}</description><language>ko</language><atom:link href="${site.url}/feed.xml" rel="self" type="application/rss+xml"/>${posts.map(p => `<item><title>${escape(p.title)}</title><link>${site.url}/writing/${p.slug}/</link><guid>${site.url}/writing/${p.slug}/</guid><pubDate>${new Date(`${p.date}T00:00:00+09:00`).toUTCString()}</pubDate><description>${escape(p.description)}</description></item>`).join('')}</channel></rss>`);
await writeFile(join(out, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${pages.map(p => `<url><loc>${site.url}${p}</loc></url>`).join('')}</urlset>`);
await writeFile(join(out, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${site.url}/sitemap.xml\n`);
await writeFile(join(out, '.nojekyll'), '');
console.log(`Built ${pages.length + 1} pages, ${posts.length} articles. PDF: ${pdf ? 'ready' : 'not added'}.`);
