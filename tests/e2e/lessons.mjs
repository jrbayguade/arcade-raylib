// Plays both lessons in Edge against the dev server. Run: npm run e2e
import { chromium } from 'playwright-core';
import { createServer } from 'vite';

const results = [];
const check = (name, ok, detail = '') => results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);
// isVisible() never waits; waitFor() does.
const visible = (locator, timeout = 3000) => locator.first().waitFor({ state: 'visible', timeout }).then(() => true, () => false);

const server = await createServer({ server: { port: 0 }, logLevel: 'error' });
let browser;
try {
  await server.listen();
  const base = server.resolvedUrls.local[0];
  browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('favicon')) errors.push(m.text()); });

  const code = () => page.evaluate(() => window.__bitArcade.code());
  const button = (text) => page.getByRole('button', { name: text, exact: true });

  async function runAndExpectSuccess(label) {
    await button('▶ Executa').click();
    const ok = await visible(page.locator('.bubble .success'));
    check(`${label}: passes`, ok, ok ? '' : await page.locator('.bubble').innerText());
  }

  async function playLesson(lesson, steps) {
    for (const [i, kind] of steps.entries()) {
      const label = `lesson ${lesson} step ${i}`;
      if (kind === 'explain') {
        check(`${label}: explain card`, await visible(page.locator('.explain svg')));
      } else if (kind === 'type185') {
        const before = await code();
        await page.locator('.cm-line').first().click();
        await page.keyboard.type('xx');
        check(`${label}: locked line cannot be edited`, (await code()) === before);
        await page.keyboard.press('Control+A');
        await page.keyboard.type('hola');
        check(`${label}: select-all + typing changes nothing`, (await code()) === before);
        const folds = await page.locator('.cm-lesson-fold').count();
        await page.locator('.cm-lesson-fold').first().click();
        check(`${label}: clicking a fold opens it`, (await page.locator('.cm-lesson-fold').count()) === folds - 1);
        check(`${label}: opening a fold does not change the code`, (await code()) === before);
        await page.locator('.cm-zone span', { hasText: /^185$/ }).first().dblclick();
        await page.keyboard.type('50');
        await runAndExpectSuccess(label);
        check(`${label}: two stars without hints`, (await page.locator('.stars').innerText()).includes('⭐⭐'));
      } else {
        if (kind === 'hint') {
          await button('💡 Pista').click();
          check(`${label}: hint shown`, await visible(page.locator('.bubble .hint')));
        }
        await page.evaluate(() => window.__bitArcade.solve());
        await runAndExpectSuccess(label);
        if (kind === 'hint') check(`${label}: one star after a hint`, (await page.locator('.stars').innerText()).trim() === '⭐');
        if (kind === 'vars') check(`${label}: variables panel`, await visible(page.locator('.vars .box')));
      }
      if (i < steps.length - 1) await button('Continua →').click();
    }
  }

  await page.goto(`${base}#/pong/0/0`);
  await page.locator('.cm-editor').waitFor();
  check('fold placeholders shown', await visible(page.locator('.cm-lesson-fold')));
  check('parameter hints shown', (await page.locator('.cm-param-hint').allInnerTexts()).includes('alçada:'));

  await playLesson(0, ['type185', 'explain', 'hint', 'solve', 'solve', 'solve']);
  check('lesson 0 done', await visible(page.getByText('Has acabat la lliçó!')));
  await button('Següent lliçó →').click();
  // The hash change re-mounts the screen in a later task: wait for the new lesson, not the old editor.
  check('lesson 1 shown', await visible(page.getByRole('heading', { name: /Lliçó 1/ })));
  await page.locator('.cm-editor').waitFor();
  await playLesson(1, ['solve', 'vars', 'explain', 'vars', 'vars', 'vars']);
  check('all lessons done', await visible(page.getByText('Has acabat totes les lliçons')));

  // A compile error is explained and marked in the editor
  await page.goto(`${base}#/pong/0/0`);
  await page.reload();
  await page.locator('.cm-editor').waitFor();
  await page.locator('.cm-zone').first().click();
  await page.keyboard.press('End');
  await page.keyboard.press('Backspace');
  await button('▶ Executa').click();
  check('compile error explained', (await page.locator('.bubble .error').innerText()).includes('Falta un ;'));
  check('error line marked', await visible(page.locator('.cm-error-line')));

  check('no page errors', errors.length === 0, errors.join(' | '));
} catch (e) {
  check('script finished without exceptions', false, String(e));
} finally {
  console.log(results.join('\n'));
  await browser?.close();
  await server.close();
}
process.exit(results.some((r) => r.startsWith('FAIL')) ? 1 : 0);
