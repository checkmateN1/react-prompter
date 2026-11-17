// Exercise the complete production bundle, not separately compiled React components.
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { pathToFileURL } = require('url');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const releaseVersion = require('../public/VERSION.json').version.replace(/\.0$/, '');
const build = path.resolve(__dirname, '..', process.env.BUILD_DIR || `prompter_v${releaseVersion}`);
const fileMode = process.env.PLAYER_RELEASE_FILE_MODE === '1';

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1500, height: 900 } });
    const errors = [];
    let iconSheetLoaded = false;
    let iconsChecked = false;
    page.on('pageerror', error => errors.push(error.message));
    page.on('response', response => {
      if (response.url().endsWith('/player_types_icons.png') && response.status() === 200) iconSheetLoaded = true;
    });
    if (!fileMode) await page.route('**/*', route => {
      const url = new URL(route.request().url());
      if (url.hostname !== 'prompter.test') return route.abort();
      const name = path.join(build, decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname));
      if (!name.startsWith(build + path.sep) || !fs.existsSync(name)) return route.fulfill({ status: 404 });
      const types = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json' };
      return route.fulfill({ path: name, contentType: types[path.extname(name)] || 'application/octet-stream' });
    });
    await page.goto(fileMode ? pathToFileURL(path.join(build, 'index.html')).href : 'http://prompter.test/');
    await page.waitForSelector('.main-container');
    await page.evaluate(() => {
      const queue = [document.getElementById('root')._reactRootContainer._internalRoot.current];
      while (queue.length) {
        const fiber = queue.shift();
        if (fiber.stateNode?.startListener) { window.wrapper = fiber.stateNode; break; }
        if (fiber.child) queue.push(fiber.child);
        if (fiber.sibling) queue.push(fiber.sibling);
      }
      if (!window.wrapper) throw Error('TablesWrapper not found in production tree');
      const handlers = {};
      let version = 1;
      window.sent = [];
      window.testClient = { on: (event, handler) => { handlers[event] = handler; },
        emit: (event, payload) => {
          window.sent.push({ event, payload });
          if (event === 'AdaptGetPlayersType' || event === 'AdaptSetPlayersType') {
            queueMicrotask(() => handlers[event + 'Result']({ ...payload, ok: true,
              nicks: payload.nicks || [payload.nick], types: [payload.type ?? -1], versions: [++version],
              handStartedAt: window.testHandStartedAt, serverNow: Date.now() }));
          }
        } };
      window.configure = (metadata, connected, managed, textNames = false) => {
        clearInterval(window.streamTimer);
        const now = Date.now();
        window.testHandStartedAt = now;
        const players = Array.from({ length: 6 }, (_, chair) => ({
          isActive: true, isHero: chair === 4, nickname: textNames ? 'Opponent' + chair : '', balance: 30, isDealer: chair === 0,
          img: textNames ? undefined : 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Zl1sAAAAASUVORK5CYII=',
          handsCount: 20, enumPosition: chair, timeTells: 1,
          playerType: metadata ? { room: 'GG', gametype: 0, nick: 'Opponent' + chair,
            type: -1, version: 1, handStartedAt: now, serverNow: now } : undefined,
        }));
        const state = { isConnected: connected, client: window.testClient, tableCount: '12',
          managedByStartPro: managed, debugKeepPrompts: true, isConnectionHide: true };
        for (let id = 0; id < 12; id++) {
          state['table' + id] = { players, handNumber: textNames ? 101 : 100, plImgHeight: 20, plImgWidth: 111 };
          state['playersCount' + id] = 6;
        }
        window.wrapper.setState(state);
        window.streamTimer = setInterval(() => {
          const update = {};
          for (let id = 0; id < 12; id++) {
            const current = window.wrapper.state['table' + id];
            update['table' + id] = { ...current, players: current.players.map(player => ({ ...player,
              img: undefined, handsCount: null, balance: player.balance === 30 ? 29 : 30,
              playerType: player.playerType ? { ...player.playerType, serverNow: Date.now() } : undefined,
            })) };
          }
          window.wrapper.setState(update);
        }, 40);
      };
    });
    for (const managed of [false, true]) for (const [metadata, connected] of [[true, true], [false, true], [true, false]]) {
      await page.evaluate(args => window.configure(...args), [metadata, connected, managed]);
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      const player = page.locator('.main-container').first().locator('.player.player0 .nickname');
      const box = await player.boundingBox();
      const point = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
      const target = await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.className, point);
      await page.mouse.click(point.x, point.y);
      await page.waitForTimeout(100); // Incoming frames arrive between the two human clicks.
      await page.mouse.click(point.x, point.y, { clickCount: 2 });
      await page.waitForTimeout(300); // Keep streaming frames after the palette opens.
      const result = { managed, metadata, connected, target,
        picker: await page.locator('.player-type-picker').count(),
        report: await page.locator('.reportButtons').count(),
        message: await page.locator('.player-type-picker__error').allTextContents() };
      console.log(JSON.stringify(result));
      assert.equal(result.picker, 1, 'Opponent double click must always open the palette');
      assert.equal(result.report, 0);
      if (metadata && connected) {
        if (!iconsChecked) {
          assert.equal(await page.locator('.player-type-icon').count(), 4);
          const styles = await page.locator('.player-type-picker__option').evaluateAll(buttons => buttons.map(button => ({
            color: getComputedStyle(button).color, label: button.getAttribute('aria-label'),
            icon: button.querySelector('.player-type-icon').className,
          })));
          assert.deepEqual(styles.map(style => style.color), ['rgb(50, 186, 105)', 'rgb(57, 137, 239)', 'rgb(237, 83, 83)', 'rgb(96, 96, 96)']);
          assert.deepEqual(styles.map(style => style.label), ['Фиш', 'Рег', 'RTA', 'Без типа']);
          const fish = page.locator('.player-type-picker [aria-label="Фиш"]');
          await fish.hover();
          await page.waitForTimeout(220);
          assert.notEqual(await fish.locator('.player-type-icon').evaluate(node => getComputedStyle(node).transform), 'none');
          await page.emulateMedia({ reducedMotion: 'reduce' });
          assert.equal(await fish.locator('.player-type-icon').evaluate(node => getComputedStyle(node).transform), 'none');
          await page.emulateMedia({ reducedMotion: 'no-preference' });
          await page.mouse.move(0, 0);
          await page.waitForTimeout(220);
          fs.mkdirSync(path.join(__dirname, '../tmp'), { recursive: true });
          await page.locator('.player-type-picker').screenshot({ path: path.join(__dirname, `../tmp/player-types-palette-${fileMode ? 'file' : 'release'}.png`) });
          assert(iconSheetLoaded, 'Original PNG sprite must load from the production build');
          iconsChecked = true;
        }
        await page.locator('.player-type-picker [aria-label="Рег"]').click();
        await page.locator('.player-type-picker').waitFor({ state: 'hidden' });
        const request = await page.evaluate(() => window.sent.filter(item => item.event === 'AdaptSetPlayersType').at(-1));
        assert.equal(request.payload.nick, 'Opponent0');
        assert.equal(request.payload.type, 0);
        assert.equal(await player.evaluate(node => node.style.getPropertyValue('--player-type-accent')), '#3989ef');
      } else {
        if (!connected) assert(result.message.join(' ').includes('Нет соединения'));
        else assert.deepEqual(result.message, []);
        assert.equal(await page.locator('.player-type-picker button:disabled').count(), 4);
      }
      await page.keyboard.press('Escape');
    }
    // Distinguish seat routing from the separate metadata gate with five visible nicknames.
    for (const metadata of [false, true]) {
      await page.evaluate(args => window.configure(...args), [metadata, true, false, true]);
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      for (const chair of [0, 1, 2, 3, 5]) {
        const player = page.locator('.main-container').first().locator(`.player.player${chair} .nickname`);
        assert.equal(await player.locator('.nickname__text').textContent(), 'Opponent' + chair);
        assert.notEqual(await player.evaluate(node => getComputedStyle(node).color), 'rgba(0, 0, 0, 0)');
        const box = await player.boundingBox();
        const x = box.x + box.width / 2, y = box.y + box.height / 2;
        const hitChair = await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)
          ?.closest('.player')?.className.match(/\bplayer(\d+)\b/)?.[1], { x, y });
        assert.equal(Number(hitChair), chair);
        await page.evaluate(() => { window.sent = []; });
        await page.mouse.dblclick(x, y);
        await page.locator('.player-type-picker').waitFor();
        assert.equal(await page.locator('.reportButtons').count(), 0);
        const disabled = await page.locator('.player-type-picker button:disabled').count();
        assert.equal(disabled, metadata ? 0 : 4);
        if (metadata) {
          await page.locator('.player-type-picker [aria-label="Рег"]').click();
          await page.locator('.player-type-picker').waitFor({ state: 'hidden' });
          const request = await page.evaluate(() => window.sent.filter(item => item.event === 'AdaptSetPlayersType').at(-1));
          assert.equal(request.payload.chair, chair);
          assert.equal(request.payload.nick, 'Opponent' + chair);
          assert.equal(request.payload.tableId, 0);
        } else {
          assert.equal(await page.evaluate(() => window.sent.length), 0);
          await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
          await page.keyboard.press('Escape');
          await page.locator('.player-type-picker').waitFor({ state: 'hidden' });
        }
        console.log(JSON.stringify({ visibleNick: 'Opponent' + chair, hitChair: Number(hitChair), metadata, disabled }));
      }
    }
    await page.evaluate(() => clearInterval(window.streamTimer));
    console.log(JSON.stringify({ errors }));
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
