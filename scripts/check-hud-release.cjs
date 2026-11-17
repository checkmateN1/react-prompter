const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { pathToFileURL } = require('url');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const version = require('../public/VERSION.json').version.replace(/\.0$/, '');
const build = path.resolve(__dirname, '..', process.env.BUILD_DIR || `prompter_v${version}`);
const fileMode = process.env.HUD_FILE_MODE === '1';
const settingsKey = 'prompter.hud.settings.v1';
const snapshotsKey = 'prompter.hud.snapshots.v1';

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1500, height: 900 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    if (!fileMode) await page.route('**/*', route => {
      const url = new URL(route.request().url());
      if (url.hostname !== 'prompter.test') return route.abort();
      const name = path.join(build, decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname));
      if (!name.startsWith(build + path.sep) || !fs.existsSync(name)) return route.fulfill({ status: 404 });
      const types = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json' };
      return route.fulfill({ path: name, contentType: types[path.extname(name)] || 'application/octet-stream' });
    });
    const address = fileMode ? pathToFileURL(path.join(build, 'index.html')).href : 'http://prompter.test/';
    const findWrapper = () => page.evaluate(() => {
      const queue = [document.getElementById('root')._reactRootContainer._internalRoot.current];
      while (queue.length) {
        const fiber = queue.shift();
        if (fiber.stateNode?.startListener) { window.wrapper = fiber.stateNode; return; }
        if (fiber.child) queue.push(fiber.child);
        if (fiber.sibling) queue.push(fiber.sibling);
      }
      throw Error('TablesWrapper not found');
    });
    await page.goto(address);
    await findWrapper();
    await page.locator('.hud-menu__toggle').click();
    const buttonStyles = await page.evaluate(() => {
      const props = ['font', 'color', 'backgroundColor', 'border', 'borderRadius', 'padding'];
      const read = selector => {
        const css = getComputedStyle(document.querySelector(selector));
        return Object.fromEntries(props.map(key => [key, css[key]]));
      };
      const transform = new DOMMatrixReadOnly(getComputedStyle(document.querySelector('.hud-menu__toggle')).transform);
      return { hud: read('.hud-menu__toggle'), sizings: read('.sizings-hide:not(.hud-menu__toggle)'), b: transform.b, c: transform.c };
    });
    assert.deepEqual(buttonStyles.hud, buttonStyles.sizings);
    assert.equal(buttonStyles.b, -1, 'HUD text must read from bottom to top');
    assert.equal(buttonStyles.c, 1);
    assert.equal(await page.locator('.hud-menu__heading strong').filter({ hasText: /^HUD$/ }).count(), 0);
    await page.getByLabel('spins', { exact: true }).check();
    assert.equal(await page.locator('.hud-menu input[type=checkbox]:disabled').count(), 4);
    await page.getByRole('button', { name: 'Загрузить тестовое', exact: true }).click();
    await page.waitForSelector('.player-hud');
    assert.equal(await page.locator('.player-hud').count(), 2);
    assert.equal(await page.locator('.player-hud__stat').count(), 12);
    assert.equal(await page.locator('.player-hud[data-seat="2"]').count(), 0);
    assert.equal(await page.locator('[data-table-id="0"] .prompt-moves tr').count(), 3);
    await page.locator('.player-hud__stat').first().hover();
    await page.waitForSelector('.hud-tooltip');
    assert.match(await page.locator('.hud-tooltip').textContent(), /VPIP.*Тестовые/);
    await page.locator('.player-hud__stat').first().dblclick();
    assert.equal(await page.locator('.reportButtons, .player-type-picker').count(), 0);

    // Seed a live fixture, preserving independent rendering channels and cached images.
    await page.evaluate(() => {
      window.fixture = JSON.parse(JSON.stringify(window.wrapper.state.hudPreview.state));
      window.fixture.table0.players[0].img = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Zl1sAAAAASUVORK5CYII=';
      window.fixture.table0.players[0].handsCount = 71;
      window.fixture.handEV0 = { marker: 'ev' };
      window.fixture.shkaf_table0 = { marker: 'shkaf' };
      window.wrapper.setState({ ...window.fixture, isConnectionHide: true, tableCount: '4' });
    });
    await page.getByRole('button', { name: 'Вернуться к живому столу' }).click();
    await page.evaluate(() => window.wrapper.setState({ table0: { ...window.wrapper.state.table0,
      players: window.wrapper.state.table0.players.map(player => ({ ...player, img: undefined, handsCount: null })) } }));
    for (let slot = 0; slot < 10; slot++) {
      await page.getByLabel('Слот состояния').selectOption(String(slot));
      await page.evaluate(slot => window.wrapper.setState({ table0: { ...window.wrapper.state.table0, pot: slot + 10 } }), slot);
      await page.getByRole('button', { name: 'Считать состояние', exact: true }).click();
    }
    const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), snapshotsKey);
    assert.equal(saved.spins.length, 10);
    assert.deepEqual(saved.spins.map(value => value.state.table0.pot), [10,11,12,13,14,15,16,17,18,19]);
    assert.equal(saved.spins[0].state.table0.players[0].handsCount, 71);
    assert(saved.spins[0].state.table0.players[0].img);
    assert.equal(saved.spins[0].state.handEV0.marker, 'ev');
    assert.equal(saved.spins[0].state.shkaf_table0.marker, 'shkaf');
    assert(!JSON.stringify(saved).includes('token'));
    await page.getByLabel('Слот состояния').selectOption('3');
    await page.getByRole('button', { name: 'Загрузить тестовое', exact: true }).click();
    await page.evaluate(() => {
      window.wrapper.setState({ table0: { ...window.fixture.table0, pot: 999 } });
      window.wrapper.clearAllPrompts();
    });
    assert.match(await page.locator('[data-table-id="0"] .pot').textContent(), /13 BB/);
    assert(await page.getByRole('button', { name: 'Считать состояние', exact: true }).isDisabled());

    // Drag under both the legacy zoom and the managed grid scale.
    for (const managed of [false, true]) {
      await page.evaluate(managed => window.wrapper.setState({ managedByStartPro: managed, tableCount: '12' }), managed);
      const hud = page.locator('[data-table-id="0"] .player-hud').first();
      const before = await hud.boundingBox();
      await page.mouse.move(before.x + 12, before.y + 12);
      await page.mouse.down();
      await page.mouse.move(before.x + 52, before.y + 42, { steps: 5 });
      await page.mouse.up();
      const after = await hud.boundingBox();
      assert(Math.abs(after.x - before.x - 40) < 2, 'drag x must match screen pointer at any scale');
      assert(Math.abs(after.y - before.y - 30) < 2, 'drag y must match screen pointer at any scale');
      const top = await page.evaluate(({ x, y }) => document.elementFromPoint(x + 10, y + 10)?.closest('.player-hud') !== null, after);
      assert(top, 'HUD must win hit testing');
    }
    await page.getByLabel('Шрифт HUD').selectOption('mono');
    const setRange = async (name, value) => {
      await page.getByLabel(name, { exact: true }).evaluate((input, value) => {
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, String(value));
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }, value);
    };
    await setRange('Размер шрифта', 30);
    await setRange('Непрозрачность подложки', 35);
    await setRange('Ширина', 210);
    await setRange('Высота', 100);
    const settings = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), settingsKey);
    assert.equal(settings.fontSize, 30);
    assert.equal(settings.opacity, 35);
    assert.equal(settings.width, 210);
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Экспорт настроек', exact: true }).click();
    const download = await downloadPromise;
    assert.match(download.suggestedFilename(), /^prompter-hud-settings-\d{4}-\d{2}-\d{2}\.json$/);
    const exported = JSON.parse(fs.readFileSync(await download.path(), 'utf8'));
    assert.equal(exported.format, 'prompter-hud-settings');
    assert.equal(exported.version, 1);
    assert.equal(exported.settings.font, settings.font);
    assert.equal(exported.settings.fontSize, settings.fontSize);
    assert.equal(exported.settings.opacity, settings.opacity);
    assert.equal(exported.settings.width, settings.width);
    assert.equal(exported.settings.height, settings.height);
    assert.deepEqual(exported.settings.positions.spins[0], settings.positions.spins[0]);
    assert.deepEqual(exported.settings.positions.spins[1], { x: 504, y: 122 });
    assert.deepEqual(exported.coordinates, { space: 'table', width: 714, height: 524 });
    await page.reload();
    await findWrapper();
    await page.locator('.hud-menu__toggle').click();
    await page.getByLabel('Слот состояния').selectOption('3');
    await page.getByRole('button', { name: 'Загрузить тестовое', exact: true }).click();
    assert.match(await page.locator('[data-table-id="0"] .pot').textContent(), /13 BB/);
    const reloaded = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), settingsKey);
    assert.deepEqual(reloaded, settings);
    assert.equal(await page.getByLabel('Шрифт HUD').inputValue(), 'mono');
    await page.getByLabel('spins', { exact: true }).uncheck();
    assert.equal(await page.locator('.player-hud').count(), 0);
    await page.getByLabel('spins', { exact: true }).check();
    await page.getByRole('button', { name: 'Вернуться к живому столу' }).click();
    await page.evaluate(() => {
      const saved = JSON.parse(localStorage.getItem('prompter.hud.snapshots.v1')).spins[0].state;
      window.wrapper.setState({ ...saved, table0: { ...saved.table0, gameType: '6max' } });
    });
    assert.equal(await page.locator('.player-hud').count(), 0, 'explicit cash game must never activate spins HUD');
    await page.getByRole('button', { name: 'Считать состояние', exact: true }).click();
    assert.match(await page.locator('.hud-menu__status').textContent(), /нет активной игры spins/);
    await page.evaluate(() => {
      window.wrapper.setState({ table0: { ...window.wrapper.state.table0, gameType: 'spins' } });
      window.originalSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = function(key, value) {
        if (key === 'prompter.hud.snapshots.v1') throw new DOMException('Full', 'QuotaExceededError');
        return window.originalSetItem.call(this, key, value);
      };
    });
    await page.getByRole('button', { name: 'Считать состояние', exact: true }).click();
    assert.match(await page.locator('.hud-menu__status').textContent(), /Недостаточно места/);
    assert.deepEqual(await page.evaluate(key => JSON.parse(localStorage.getItem(key)), snapshotsKey), saved);
    await page.evaluate(() => { Storage.prototype.setItem = window.originalSetItem; });
    await page.getByLabel('Слот состояния').selectOption('0');
    await page.getByRole('button', { name: 'Загрузить тестовое', exact: true }).click();
    await page.getByRole('button', { name: 'Сбросить позиции', exact: true }).click();
    await page.evaluate(() => window.wrapper.setState({ tableCount: '4', isConnectionHide: true }));
    fs.mkdirSync(path.resolve(__dirname, '../tmp'), { recursive: true });
    await page.screenshot({ path: path.resolve(__dirname, `../tmp/hud-${fileMode ? 'file' : 'release'}.png`) });
    assert.deepEqual(errors, []);
    console.log(`HUD release ${version}: demo, tooltips, 10 slots, cached images, live isolation, scaled dragging, persistence, game filtering passed (${fileMode ? 'file' : 'http'}).`);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
