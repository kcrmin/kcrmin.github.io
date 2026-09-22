import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import { resolve, join } from 'node:path';

const root = resolve('dist');
async function walk(dir) {
  const paths = await readdir(dir, { withFileTypes: true });
  const lists = await Promise.all(paths.map(p => p.isDirectory() ? walk(join(dir, p.name)) : [join(dir, p.name)]));
  return lists.flat();
}

test('all generated internal links and fragments resolve', async () => {
  const files = (await walk(root)).filter(p => p.endsWith('.html'));
  assert.ok(files.length >= 7);
  for (const file of files) {
    const html = await readFile(file, 'utf8');
    assert.match(html, /<html lang="ko">/);
    assert.equal((html.match(/<h1[ >]/g) ?? []).length, 1, file);
    for (const [, href] of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
      if (/^(https?:|mailto:|data:)/.test(href)) continue;
      const [path, fragment] = href.split('#');
      const target = path ? join(root, decodeURIComponent(path)) : file;
      const info = await stat(target);
      const document = info.isDirectory() ? join(target, 'index.html') : target;
      await stat(document);
      if (fragment) assert.match(await readFile(document, 'utf8'), new RegExp(`id="${fragment}"`), `${file}: ${href}`);
    }
  }
});

test('PDF component never presents a missing file as downloadable', async () => {
  const { pdfSection } = await import('../scripts/site.mjs');
  const absent = pdfSection(null);
  assert.doesNotMatch(absent, /href=.*\.pdf/);
  assert.match(absent, /준비 중/);
  const present = pdfSection({ bytes: 10240 });
  assert.match(present, /href="\/files\/portfolio.pdf"/);
  assert.match(present, /download/);
});

test('PDF validation accepts a PDF header and rejects mislabeled files', async () => {
  const { validatePdf } = await import('../scripts/site.mjs');
  assert.doesNotThrow(() => validatePdf(Buffer.from('%PDF-1.7\nexample')));
  assert.throws(() => validatePdf(Buffer.from('<html>not a pdf</html>')), /PDF/);
});

test('public build excludes private sources and has usable metadata', async () => {
  const files = await walk(root);
  for (const file of files.filter(f => /\.(html|xml|txt)$/.test(f))) {
    const text = await readFile(file, 'utf8');
    assert.doesNotMatch(text, /X-Amz-|prod-files-secure|C:\\Users|gho_|harness\/sources/);
  }
  const home = await readFile(join(root, 'index.html'), 'utf8');
  assert.match(home, /rel="canonical" href="https:\/\/kcrmin.github.io\/"/);
  assert.match(await readFile(join(root, 'feed.xml'), 'utf8'), /<rss/);
  assert.match(await readFile(join(root, 'sitemap.xml'), 'utf8'), /<urlset/);
});
