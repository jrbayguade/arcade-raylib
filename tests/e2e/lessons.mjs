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
        check(`${label}: confetti on success`, await visible(page.locator('.confetti[data-active="true"]'), 1000).catch(() => false) || (await page.locator('.confetti').getAttribute('data-active')) === 'true');
        check(`${label}: Continue button appears`, await visible(page.locator('.toolbar .next')));
        check(`${label}: two stars without hints`, (await page.locator('.star.earned').count()) === 2);
      } else {
        if (kind === 'hint') {
          await button('💡 Pista').click();
          check(`${label}: hint shown`, await visible(page.locator('.bubble .hint')));
        }
        await page.evaluate(() => window.__bitArcade.solve());
        if (kind === 'ctrlEnter') {
          await page.locator('.cm-content').focus();
          await page.keyboard.press('Control+Enter');
          check(`${label}: Ctrl+Enter runs the code`, await visible(page.locator('.bubble .success')));
        } else {
          await runAndExpectSuccess(label);
        }
        if (kind === 'hint') {
          check(`${label}: one star after a hint`, (await page.locator('.star.earned').count()) === 1);
          check(`${label}: the missing star keeps its place`, (await page.locator('.star').count()) === 2);
        }
        if (kind === 'vars') check(`${label}: variables panel`, await visible(page.locator('.vars .box')));
      }
      if (i < steps.length - 1) await button('Continua →').click();
    }
  }

  await page.goto(`${base}#/pong/0/0`);
  await page.locator('.cm-editor').waitFor();
  check('fold placeholders shown', await visible(page.locator('.cm-lesson-fold')));
  check('parameter hints shown', (await page.locator('.cm-param-hint').allInnerTexts()).includes('alçada:'));

  // Bit types the first bubble, then moves on by itself; a click skips the wait
  const say = page.locator('.bubble .say');
  const bubbleSize = async () => { const b = await page.locator('.bubble').boundingBox(); return `${Math.round(b.width)}x${Math.round(b.height)}`; };
  const sizeWhileTyping = await bubbleSize();
  check('Bit starts typing', (await say.innerText()).length < 'Hola! Sóc en Bit 🤖.'.length + 2);
  check('Bit finishes the first bubble', await visible(page.locator('.bubble .say', { hasText: 'Sóc en Bit' })));
  check('one dot per bubble', (await page.locator('.pager .dot').count()) === 5);
  await say.click();
  await say.click();
  check('the bubble keeps its size while typing', (await bubbleSize()) === sizeWhileTyping, `${sizeWhileTyping} → ${await bubbleSize()}`);
  check('a click jumps to the next bubble', await visible(page.locator('.bubble .say', { hasText: 'espatllada' }), 1500));
  check('the bubble keeps its size on the next page', (await bubbleSize()) === sizeWhileTyping);
  check('bubbles move on by themselves', await visible(page.locator('.bubble .say', { hasText: 'zona groga' }), 9000));
  const runBox = await button('▶ Executa').boundingBox();
  check('Run button in view at 1600×900', runBox !== null && runBox.y >= 0 && runBox.y + runBox.height <= 900);
  await page.setViewportSize({ width: 1366, height: 768 });
  const smallBox = await button('▶ Executa').boundingBox();
  check('Run button in view at 1366×768', smallBox !== null && smallBox.y >= 0 && smallBox.y + smallBox.height <= 768);
  await page.setViewportSize({ width: 1600, height: 900 });

  await playLesson(0, ['type185', 'explain', 'hint', 'ctrlEnter', 'solve', 'solve']);
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
  check('compile error explained', await visible(page.locator('.bubble .error', { hasText: 'Falta un ;' })));
  check('error line marked', await visible(page.locator('.cm-error-line')));

  // Triple-click selects the line *with* its newline: typing must replace the zone line, not append to it
  await page.goto(`${base}#/pong/0/0`);
  await page.reload();
  await page.locator('.cm-editor').waitFor();
  await page.locator('.cm-zone').getByText('DrawRectangle').first().click({ clickCount: 3 });
  // closeBrackets inserts ")" after "(": typing ")" steps over it, as when a kid types the whole line.
  await page.keyboard.type('        DrawRectangle(20, 50, 10, 80, WHITE);');
  const tripleCode = await page.evaluate(() => window.__bitArcade.code());
  check('triple-click + typing replaces the line',
    tripleCode.includes('\n        DrawRectangle(20, 50, 10, 80, WHITE);\n        EndDrawing();') && !tripleCode.includes('(20, 185'));
  await runAndExpectSuccess('triple-click');

  // The `order` hint: cut the ClearBackground line with Ctrl+X (no selection) and paste it above
  await page.goto(`${base}#/pong/0/4`);
  await page.reload();
  await page.locator('.cm-editor').waitFor();
  await page.locator('.cm-zone').nth(1).click();
  await page.keyboard.press('Control+X');
  await page.locator('.cm-zone').first().click();
  await page.keyboard.press('Home');
  await page.keyboard.press('Home');
  await page.keyboard.press('Control+V');
  await runAndExpectSuccess('order hint (cut and paste)');

  // Sounds: run, success and stars are heard; the mute button silences and is remembered
  await page.goto(`${base}#/pong/0/0`);
  await page.reload();
  await page.locator('.cm-editor').waitFor();
  await page.evaluate(() => window.__bitArcade.solve());
  await button('▶ Executa').click();
  await visible(page.locator('.bubble .success'));
  await page.waitForTimeout(1200);
  const heard = await page.evaluate(() => [...window.__bitArcadeSounds]);
  check('sounds: run, success and one per star', heard.includes('run') && heard.includes('success') && heard.filter((n) => n === 'star').length === 2, heard.join(','));
  check('sounds: Bit types with ticks', heard.includes('type'));
  check('no mute button: sound is always on', (await page.locator('.sound-toggle').count()) === 0);
  check('no keyboard button on a desktop', !(await page.locator('.keys-toggle').isVisible()));

  // Phones: upright asks to rotate; sideways fits, with a symbol bar
  for (const [w, h] of [[390, 844], [844, 390]]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true });
    const phone = await ctx.newPage();
    phone.on('pageerror', (e) => errors.push(String(e)));
    await phone.goto(`${base}#/pong/0/0`);
    if (w < h) {
      check('phone upright: asks to rotate', await visible(phone.locator('.rotate')));
      check('phone upright: nothing wider than the screen', (await phone.evaluate(() => document.documentElement.scrollWidth)) <= w);
      await phone.waitForTimeout(3000);
      await phone.setViewportSize({ width: h, height: w });
      await phone.locator('.cm-editor').waitFor();
      const first = await phone.locator('.bubble .say .typed').innerText();
      check('phone: Bit waits while the rotate message is shown', (await phone.locator('.pager .dot').first().getAttribute('class')).includes('on') && first.length < 'Hola! Sóc en Bit 🤖.'.length + 2, JSON.stringify(first));
    } else {
      await phone.locator('.cm-editor').waitFor();
      check('phone sideways: no rotate message', !(await phone.locator('.rotate').isVisible()));
      check('phone sideways: nothing wider than the screen', (await phone.evaluate(() => document.documentElement.scrollWidth)) <= w);
      const run = await phone.getByRole('button', { name: '▶ Executa', exact: true }).boundingBox();
      check('phone sideways: Run in view', run !== null && run.y + run.height <= h);
      await phone.locator('.cm-zone').getByText('WHITE').first().click();
      await phone.keyboard.press('End');
      check('phone sideways: symbols hidden until ⌨️ is tapped', !(await phone.locator('.symbols').isVisible()));
      const editorTop = (await phone.locator('.code-pane').boundingBox()).y;
      await phone.locator('.keys-toggle').click();
      check('phone sideways: ⌨️ opens the symbols', await visible(phone.locator('.symbols')));
      check('phone sideways: the symbols float, the code does not move', (await phone.locator('.code-pane').boundingBox()).y === editorTop);
      await phone.locator('.symbols button', { hasText: /^;$/ }).click();
      check('phone sideways: symbol bar types into the zone', (await phone.evaluate(() => window.__bitArcade.code())).includes('WHITE);;'));
    }
    await ctx.close();
  }

  check('no page errors', errors.length === 0, errors.join(' | '));
} catch (e) {
  check('script finished without exceptions', false, String(e));
} finally {
  console.log(results.join('\n'));
  await browser?.close();
  await server.close();
}
process.exit(results.some((r) => r.startsWith('FAIL')) ? 1 : 0);
