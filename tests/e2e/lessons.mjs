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
        if (lesson === 0) {
          await page.waitForTimeout(1700);
          const pt = await page.evaluate(() => { const g = document.querySelector('.grid-card .point'); return [g.dataset.x, g.dataset.y, g.querySelector('.coord').textContent, g.querySelector('.dot').getAttribute('cx'), g.querySelector('.dot').getAttribute('cy')]; });
          check(`${label}: grid label matches the dot`, pt[2] === `(${pt[0]}, ${pt[1]})` && pt[3] === pt[0] && pt[4] === pt[1], JSON.stringify(pt));
        }
        if (lesson === 2) {
          check(`${label}: frames card`, await visible(page.locator('.frames-card')));
          const first = await page.locator('.frames-card .box-value').textContent();
          await page.waitForTimeout(2000);
          check(`${label}: the frames card box changes value`, (await page.locator('.frames-card .box-value').textContent()) !== first, first);
        }
      } else if (kind === 'type185') {
        const before = await code();
        await page.locator('.cm-line').first().click();
        await page.keyboard.type('xx');
        check(`${label}: locked line cannot be edited`, (await code()) === before);
        check(`${label}: Bit says why typing there does nothing`, await visible(page.locator('.bubble .almost', { hasText: 'Aquí no hi pots escriure' })));
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
        check(`${label}: Continue button appears`, await visible(page.locator('.actions .next')));
        check(`${label}: two stars without hints`, (await page.locator('.star.earned').count()) === 2);
        await page.waitForTimeout(1200);
        const px = await page.evaluate(() => { const c = document.querySelector('.cabinet canvas'); const d = c.getContext('2d'); const at = (x, y) => d.getImageData(x, y, 1, 1).data[0]; return [at(25, 60), at(25, 220)]; });
        check(`${label}: the machine runs the kid's code after a success`, px[0] > 200 && px[1] < 50, JSON.stringify(px));
      } else {
        if (kind === 'hint') {
          await page.locator('.hint-btn').click();
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
        if (lesson === 2 && i === 0) {
          // The kid's code keeps running after the success: the ball's box keeps growing
          const pilotaX = async () => Number(await page.locator('.vars .box', { hasText: 'pilotaX' }).locator('.value').innerText());
          const a = await pilotaX();
          await page.waitForTimeout(300);
          check(`${label}: the ball keeps moving after a success`, (await pilotaX()) > a);
          check(`${label}: when the ball leaves, the machine offers to launch it again`, await visible(page.locator('.ball-lost'), 4000));
          await page.locator('.ball-lost').click();
          await page.waitForTimeout(100);
          const back = [await page.locator('.ball-lost').count(), await pilotaX()];
          check(`${label}: launching it again brings the ball back`, back[0] === 0 && back[1] < 600, JSON.stringify(back));
        }
      }
      if (i < steps.length - 1) await button('Continua →').click();
    }
  }

  await page.goto(`${base}#/pong/0/0`);
  await page.locator('.cm-editor').waitFor();
  check('fold placeholders shown', await visible(page.locator('.cm-lesson-fold')));
  check('parameter hints shown', (await page.locator('.cm-param-hint').allInnerTexts()).includes('alçada:'));
  check('parameter hints only inside the yellow zone', (await page.locator('.cm-line:not(.cm-zone) .cm-param-hint').count()) === 0);
  check('the mission is always visible', await visible(page.locator('.bubble .mission', { hasText: 'Canvia el 185 per un 50' })));
  check('the machine is on at the start of an exercise', await visible(page.locator('.cabinet .machine.power')));

  // A wrong answer: one gentle message, not a list; ⟲ asks before wiping the code
  await page.locator('.cm-zone span', { hasText: /^20$/ }).first().dblclick();
  await page.keyboard.type('60');
  await button('▶ Executa').click();
  check('a wrong answer gets one gentle message that says what is missing', await visible(page.locator('.bubble .almost', { hasText: 'encara no ha pujat' })) && (await page.locator('.bubble .checks').count()) === 0);
  check('Bit looks thoughtful', (await page.locator('.talk > .bit-face .feature').count()) === 3 && (await page.locator('.talk > .bit-face .eye').count()) === 0);
  const edited = await code();
  await page.locator('.actions .reset').click();
  check('reset asks first', await visible(page.locator('.actions .reset.armed', { hasText: 'Segur?' })) && (await code()) === edited);
  await page.locator('.actions .reset').click();
  check('reset after confirming restores the code', !(await code()).includes('(60,'));

  // Bit types the first bubble, then moves on by itself; a click skips the wait
  await page.reload();
  await page.locator('.cm-editor').waitFor();
  const say = page.locator('.bubble .say');
  const bubbleSize = async () => { const b = await page.locator('.bubble').boundingBox(); return `${Math.round(b.width)}x${Math.round(b.height)}`; };
  const sizeWhileTyping = await bubbleSize();
  check('Bit starts typing', (await say.innerText()).length < 20);
  check('Bit finishes the first bubble', await visible(page.locator('.bubble .say', { hasText: 'Comencem!' })));
  check('one dot per bubble', (await page.locator('.pager .dot').count()) === 3);
  await say.click();
  await say.click();
  check('the bubble keeps its size while typing', (await bubbleSize()) === sizeWhileTyping, `${sizeWhileTyping} → ${await bubbleSize()}`);
  check('a click jumps to the next bubble', await visible(page.locator('.bubble .say', { hasText: 'zona groga' }), 1500));
  check('the bubble keeps its size on the next page', (await bubbleSize()) === sizeWhileTyping);
  check('bubbles move on by themselves', await visible(page.locator('.bubble .say', { hasText: 'paraules grises' }), 12000));
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
  check('lesson 2 shown', await visible(page.getByRole('heading', { name: /lliçó 2/ })));
  check('lessons count from 1, never 0', (await page.locator('.brand').innerText()).includes('lliçó 2'));
  await page.locator('.cm-editor').waitFor();
  await playLesson(1, ['solve', 'vars', 'explain', 'vars', 'vars', 'vars']);
  check('lesson 2 done', await visible(page.getByText('Has acabat la lliçó!')));
  await button('Següent lliçó →').click();
  check('lesson 3 shown', await visible(page.getByRole('heading', { name: /lliçó 3/ })));
  await page.locator('.cm-editor').waitFor();
  await playLesson(2, ['vars', 'explain', 'vars', 'vars', 'vars']);
  check('all lessons done', await visible(page.getByText('Has acabat totes les lliçons')));

  // Tall screens: the buttons follow the code, the machine lines up with Bit
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto(`${base}#/pong/0/0`);
  await page.reload();
  await page.locator('.cm-editor').waitFor();
  const paneBox = await page.locator('.code-pane').boundingBox();
  const actionsBox = await page.locator('.actions').boundingBox();
  check('1920×1080: buttons right under the code', actionsBox.y - (paneBox.y + paneBox.height) < 40, JSON.stringify([paneBox, actionsBox]));
  const talkBox = await page.locator('.talk').boundingBox();
  check('1920×1080: the machine starts level with Bit', Math.abs((await page.locator('.machine-area').boundingBox()).y - talkBox.y) < 40);
  await page.goto(`${base}#/pong/0/1`);
  await page.reload();
  await page.locator('.explain svg').waitFor();
  const nextBox = await page.locator('.actions').boundingBox();
  check('an explanation opened by a link shows snow, not a black machine', await visible(page.locator('.cabinet .tv-static')));
  check('1920×1080: explanation step buttons in view', nextBox.y + nextBox.height <= 1080, JSON.stringify(nextBox));
  await page.setViewportSize({ width: 1600, height: 900 });

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

  // A starting code that does not compile shows TV static
  await page.goto(`${base}#/pong/1/4`);
  await page.reload();
  await page.locator('.cm-editor').waitFor();
  check('broken starting code shows TV static', await visible(page.locator('.cabinet .tv-static')));

  // 🐢 slows the game down and shows the frame number
  await page.goto(`${base}#/pong/2/0`);
  await page.reload();
  await page.locator('.cm-editor').waitFor();
  check('no frame counter at full speed', (await page.locator('.frame-no').count()) === 0);
  await page.locator('.slow-btn').click();
  check('🐢 shows the frame number', await visible(page.locator('.frame-no')));
  const rate = await page.evaluate(async () => {
    const read = () => Number(document.querySelector('.frame-no').textContent.replace(/\D/g, ''));
    const f1 = read(), t1 = performance.now();
    await new Promise((r) => setTimeout(r, 1500));
    return ((read() - f1) * 1000) / (performance.now() - t1);
  });
  check('🐢 runs about 3 frames per second', rate >= 1.5 && rate <= 4.5, rate.toFixed(2));
  const frameAt = async () => Number((await page.locator('.frame-no').innerText()).replace(/\D/g, ''));
  await button('▶ Executa').click();
  check('▶ restarts the frame count in slow motion', (await frameAt()) <= 3);
  check('🐢 makes a sound', (await page.evaluate(() => [...window.__bitArcadeSounds])).includes('page'));
  // It stays on from step to step
  await page.evaluate(() => window.__bitArcade.solve());
  await button('▶ Executa').click();
  await visible(page.locator('.bubble .success'), 5000);
  await button('Continua →').click();
  await button('Continua →').click();
  await page.locator('.cm-editor').waitFor();
  check('🐢 stays on in the next steps', await visible(page.locator('.slow-btn[aria-pressed="true"]')) && await visible(page.locator('.frame-no')));
  await page.locator('.slow-btn').click();
  check('🐢 again goes back to full speed', (await page.locator('.frame-no').count()) === 0);
  // The speed step starts broken: TV static, no counter, even in slow motion
  await page.goto(`${base}#/pong/2/4`);
  await page.reload();
  await page.locator('.cm-editor').waitFor();
  check('lesson 3 speed step starts with TV static', await visible(page.locator('.cabinet .tv-static')));
  check('lesson 3 speed step shows the velX ghost', await visible(page.locator('.cm-ghost', { hasText: 'velX' })));
  await page.locator('.slow-btn').click();
  await page.waitForTimeout(500);
  check('🐢 on TV static shows no counter', (await page.locator('.frame-no').count()) === 0);
  await page.evaluate(() => window.__bitArcade.solve());
  await button('▶ Executa').click();
  check('🐢 counts from the first frame after fixing the machine', await visible(page.locator('.frame-no')) && (await frameAt()) <= 3);
  await page.locator('.slow-btn').click();

  // The empty line in the zone shows a ghost hint that is not code: typing there replaces it
  await page.goto(`${base}#/pong/1/4`);
  await page.reload();
  await page.locator('.cm-editor').waitFor();
  check('ghost hint on the empty line', await visible(page.locator('.cm-ghost', { hasText: 'crea aquí la caixa alcada' })));
  check('the ghost hint is not part of the code', !(await page.evaluate(() => window.__bitArcade.code())).includes('crea aquí'));
  await page.locator('.cm-line:has(.cm-ghost)').click(); // a kid clicks the grey words: they let the click through
  await page.keyboard.type('int alcada = 120;');
  check('typing makes the ghost go away', (await page.locator('.cm-ghost').count()) === 0);
  await runAndExpectSuccess('ghost line');

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
      check('phone: Bit waits while the rotate message is shown', (await phone.locator('.pager .dot').first().getAttribute('class')).includes('on') && first.length < 15, JSON.stringify(first));
    } else {
      await phone.locator('.cm-editor').waitFor();
      check('phone sideways: no rotate message', !(await phone.locator('.rotate').isVisible()));
      check('phone sideways: nothing wider than the screen', (await phone.evaluate(() => document.documentElement.scrollWidth)) <= w);
      const run = await phone.getByRole('button', { name: '▶ Executa', exact: true }).boundingBox();
      check('phone sideways: Run in view', run !== null && run.y + run.height <= h);
      check('phone sideways: buttons are at least 44 px tall', run !== null && run.height >= 44);
      const slowBox = await phone.locator('.slow-btn').boundingBox();
      check('phone sideways: 🐢 is at least 44 px tall', slowBox !== null && slowBox.height >= 44);
      check('phone sideways: Bit opens his bubble while he talks', await visible(phone.locator('.talk.open .bubble')));
      const bubbleBox = await phone.locator('.talk .bubble').boundingBox();
      const zoneBox = await phone.locator('.cm-zone').first().boundingBox();
      check('phone sideways: the open bubble does not cover the yellow zone',
        bubbleBox.x >= zoneBox.x + zoneBox.width || bubbleBox.y >= zoneBox.y + zoneBox.height, JSON.stringify([bubbleBox, zoneBox]));
      check('phone sideways: x: and y: hints are shown', (await phone.locator('.cm-param-hint:visible').allInnerTexts()).join(' ').includes('y:'));
      await phone.locator('.cm-zone').getByText('WHITE').first().click();
      check('phone sideways: a tap on the zone reaches the editor', await visible(phone.locator('.cm-editor.cm-focused')));
      await phone.keyboard.press('End');
      check('phone sideways: symbols hidden until ⌨️ is tapped', !(await phone.locator('.symbols').isVisible()));
      const editorTop = (await phone.locator('.code-pane').boundingBox()).y;
      await phone.locator('.keys-toggle').click();
      check('phone sideways: ⌨️ opens the symbols', await visible(phone.locator('.symbols')));
      check('phone sideways: the symbols float, the code does not move', (await phone.locator('.code-pane').boundingBox()).y === editorTop);
      await phone.locator('.symbols button', { hasText: /^;$/ }).click();
      check('phone sideways: symbol bar types into the zone', (await phone.evaluate(() => window.__bitArcade.code())).includes('WHITE);;'));
      await phone.locator('.keys-toggle').click();
      await phone.evaluate(() => window.__bitArcade.solve());
      await phone.getByRole('button', { name: '▶ Executa', exact: true }).click();
      check('phone sideways: Bit answers', await visible(phone.locator('.talk.open .bubble .success')));
      const answerBox = await phone.locator('.talk .bubble').boundingBox();
      const screenBox = await phone.locator('.machine canvas').boundingBox();
      check('phone sideways: the answer leaves the top of the game in view', answerBox.y > screenBox.y + screenBox.height / 3, JSON.stringify([answerBox, screenBox]));
      check('phone sideways: the answer steps aside by itself', await visible(phone.locator('.talk:not(.open)'), 6000));
      check('phone sideways: the folded ticket shows the success', await visible(phone.locator('.ticket .ticket-mark', { hasText: '✓' })));
      // Lesson 3's last step: five variable boxes and 🐢 under the screen must still fit
      await phone.goto(`${base}#/pong/2/4`);
      await phone.reload();
      await phone.locator('.cm-editor').waitFor();
      await phone.evaluate(() => window.__bitArcade.solve());
      await phone.getByRole('button', { name: '▶ Executa', exact: true }).click();
      await visible(phone.locator('.vars .box', { hasText: 'velX' }));
      await phone.waitForTimeout(300);
      const velBox = await phone.locator('.vars .box', { hasText: 'velX' }).boundingBox();
      check('phone sideways, lesson 3: the new velX box is scrolled into view', velBox !== null && velBox.x + velBox.width <= w, JSON.stringify(velBox));
      check('phone sideways, lesson 3: nothing wider than the screen', (await phone.evaluate(() => document.documentElement.scrollWidth)) <= w);
      const canvasBox = await phone.locator('.machine canvas').boundingBox();
      check('phone sideways, lesson 3: the game fits', canvasBox.y + canvasBox.height <= h, JSON.stringify(canvasBox));
      const slow3 = await phone.locator('.slow-btn').boundingBox();
      check('phone sideways, lesson 3: 🐢 in view and thumb-sized', slow3 !== null && slow3.height >= 44 && slow3.y + slow3.height <= h);
      const runOnTop = await phone.evaluate(() => {
        const b = document.querySelector('.actions .run, .actions .next')?.getBoundingClientRect();
        if (!b) return 'no button';
        const el = document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2);
        return el?.closest('.actions') ? 'ok' : el?.className ?? 'nothing';
      });
      check('phone sideways, lesson 3: nothing covers the action buttons', runOnTop === 'ok', runOnTop);
    }
    await ctx.close();
  }

  // Reduced motion: the frames card holds still
  {
    const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 }, reducedMotion: 'reduce' });
    const still = await ctx.newPage();
    still.on('pageerror', (e) => errors.push(String(e)));
    await still.goto(`${base}#/pong/2/1`);
    await still.locator('.frames-card').waitFor();
    const v1 = await still.locator('.frames-card .box-value').textContent();
    await still.waitForTimeout(1500);
    check('reduced motion: the frames card holds still', (await still.locator('.frames-card .box-value').textContent()) === v1);
    await ctx.close();
  }

  // Intro: first visit to the front page, skippable, remembered; #/intro replays it to the end
  {
    const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 } });
    const fresh = await ctx.newPage();
    fresh.on('pageerror', (e) => errors.push(String(e)));
    await fresh.goto(base);
    check('intro on the first visit', await visible(fresh.locator('.intro')));
    check('intro starts in the dark', !(await fresh.locator('.intro.lit').count()));
    await fresh.keyboard.press('Space');
    check('a key switches the lights on', await visible(fresh.locator('.intro.lit')));
    await fresh.locator('.intro .skip').click();
    check('skip goes to lesson 0', await visible(fresh.locator('.cm-editor'), 5000) && (await fresh.evaluate(() => location.hash)) === '#/pong/0/0');
    await fresh.goto(base);
    await fresh.reload();
    await fresh.waitForTimeout(800);
    check('no intro on the next visit', (await fresh.locator('.intro').count()) === 0);
    await fresh.goto(`${base}#/intro`);
    await fresh.reload();
    check('#/intro replays it', await visible(fresh.locator('.intro')));
    for (let i = 0; i < 6; i++) { await fresh.keyboard.press('Space'); await fresh.waitForTimeout(1350); }
    check('the last beat offers Som-hi!', await visible(fresh.getByRole('button', { name: 'Som-hi! ▶' })));
    await fresh.getByRole('button', { name: 'Som-hi! ▶' }).click();
    check('Som-hi! starts lesson 0', await visible(fresh.locator('.cm-editor'), 5000));
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
