// Run with Node and Playwright (PLAYWRIGHT_MODULE may point to an existing installation).
// Optional BUILD_DIR checks the release stylesheet instead of compiling source styles.
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const babel = require('@babel/core');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = path.resolve(__dirname, '..');

// Load the real React components in an isolated browser page, without a backend connection.
const modules = new Map();
function bundle(filename) {
  const id = path.relative(root, filename).replaceAll('\\', '/');
  if (modules.has(id)) return id;
  modules.set(id, '');
  let code = babel.transformFileSync(filename, { babelrc: false, configFile: false,
    presets: [[require.resolve('@babel/preset-env'), { targets: { chrome: '100' }, modules: 'commonjs' }],
      require.resolve('@babel/preset-react')] }).code;
  code = code.replace(/require\(["']([^"']+)["']\)/g, (_, dependency) => {
    if (/\.css$/.test(dependency)) return '({})';
    if (dependency === 'react') return 'window.React';
    if (dependency === 'react-dom') return 'window.ReactDOM';
    assert(dependency.startsWith('.'), `Unexpected dependency: ${dependency}`);
    return `load(${JSON.stringify(bundle(require.resolve(path.resolve(path.dirname(filename), dependency))))})`;
  });
  modules.set(id, `function(module, exports) { ${code}\n }`);
  return id;
}
const tableId = bundle(path.join(root, 'src/components/Table/index.js'));
const clientId = bundle(path.join(root, 'src/components/Table/playerTypesClient.js'));
const bootstrap = `(() => {
  const modules = {${[...modules].map(([id, code]) => `${JSON.stringify(id)}: ${code}`).join(',')}};
  const cache = {};
  function load(id) {
    if (!cache[id]) { cache[id] = { exports: {} }; modules[id](cache[id], cache[id].exports); }
    return cache[id].exports;
  }
  window.TestTable = load(${JSON.stringify(tableId)}).default;
  window.TestClientContext = load(${JSON.stringify(clientId)}).PlayerTypesClientContext;
})();`;

async function main() {
  const css = process.env.BUILD_DIR ? (() => {
    const directory = path.resolve(root, process.env.BUILD_DIR);
    const manifest = JSON.parse(fs.readFileSync(path.join(directory, 'asset-manifest.json')));
    return fs.readFileSync(path.join(directory, manifest.entrypoints.find(entry => entry.endsWith('.css'))), 'utf8');
  })() : require('sass').compile(path.join(root, 'src/components/TablesWrapper/style.scss'),
    { logger: { warn() {} } }).css + fs.readFileSync(path.join(root, 'src/components/Table/playerTypes.css'), 'utf8');
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  let checks = 0;
  try {
    const page = await browser.newPage({ viewport: { width: 1600, height: 1200 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setContent('<div id="root"></div>');
    await page.addStyleTag({ content: css });
    await page.addStyleTag({ content: '.main-container { left: 20px; top: 20px; }' });
    await page.addScriptTag({ path: require.resolve('react/umd/react.development.js') });
    await page.addScriptTag({ path: require.resolve('react-dom/umd/react-dom.development.js') });
    await page.addScriptTag({ content: bootstrap });
    await page.evaluate(() => {
      const handlers = {};
      window.requests = [];
      window.reports = [];
      const client = { on: (name, handler) => { handlers[name] = handler; },
        emit: (name, data) => window.requests.push({ name, ...data }) };
      window.renderTable = (count, variant, zoom, imageHeight = 20) => {
        ReactDOM.unmountComponentAtNode(document.getElementById('root'));
        const now = Date.now();
        const players = Array.from({ length: count }, (_, chair) => ({
          isActive: variant === 'max5' ? chair !== 3 : variant === 'max4' ? [0, 1, 2, 4].includes(chair) : true,
          isHero: false, nickname: 'Opponent' + chair, balance: 30,
          isDealer: true, bet: 2, timeTells: 1, enumPosition: chair,
          playerType: { room: 'GG', gametype: 0, nick: 'Opponent' + chair, type: -1,
            handStartedAt: now, serverNow: now, version: 1 },
        }));
        const props = { id: 0, playersCount: count, baraban: {}, handPrompt: {},
          supportReport: data => window.reports.push(data),
          prompt: { handNumber: 100, players, plImgHeight: imageHeight,
            is4max: variant === 'max4', is5max: variant === 'max5' } };
        window.tableProps = props;
        window.updateTable = () => ReactDOM.render(React.createElement(TestClientContext.Provider,
          { value: client }, React.createElement(TestTable, props)), document.getElementById('root'));
        window.updateTable();
        document.querySelector('.main-container').style.setProperty('--table-zoom', zoom);
      };
    });
    for (const [count, variant] of [[3, ''], [6, ''], [8, ''], [9, ''], [6, 'max4'], [6, 'max5']]) {
      for (const zoom of [0.65, 1]) for (const height of [20, 60]) {
        await page.evaluate(args => window.renderTable(...args), [count, variant, zoom, height]);
        // A deliberately overlapping layer, above all existing table decorations.
        await page.evaluate(() => {
          const overlay = document.createElement('div');
          overlay.className = 'overlap-probe';
          overlay.style.cssText = 'position:absolute;inset:0;z-index:99999';
          document.querySelector('.main-container').appendChild(overlay);
        });
        const chairs = await page.locator('.player').evaluateAll(nodes => nodes.map(node =>
          Number(node.className.match(/\bplayer(\d+)\b/)[1])));
        for (const chair of chairs) {
          const selector = `.player.player${chair}`;
          const points = await page.locator(`${selector} .player-type-hitbox`).evaluate(hitbox => {
            const rect = hitbox.getBoundingClientRect();
            const nickname = hitbox.parentElement.getBoundingClientRect();
            if (rect.width <= nickname.width || rect.height <= nickname.height) throw Error('Missing padded hitbox');
            return [0.05, 0.5, 0.95].flatMap(x => [0.05, 0.5, 0.95].map(y =>
              ({ x: rect.x + x * rect.width, y: rect.y + y * rect.height })));
          });
          for (const point of points) {
            const hit = await page.evaluate(({ x, y }) => {
              const node = document.elementFromPoint(x, y);
              return { player: node?.closest('.player')?.className, target: node?.className,
                scrollX, scrollY, elements: document.elementsFromPoint(x, y).map(item => item.className) };
            }, point);
            assert(hit.player?.split(' ').includes(`player${chair}`), `Wrong hit: ${JSON.stringify({ count, variant, zoom, height, chair, point, hit })}`);
            await page.mouse.dblclick(point.x, point.y);
            assert.equal(await page.locator('.player-type-picker').count(), 1);
            assert.equal(await page.locator('.reportButtons').count(), 0);
            assert.equal(await page.evaluate(() => window.requests.at(-1).chair), chair);
            // React 16 installs the Escape listener in a passive effect after paint.
            await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
            await page.keyboard.press('Escape');
            await page.locator('.player-type-picker').waitFor({ state: 'hidden' });
            checks++;
          }
        }
        await page.locator('.overlap-probe').evaluate(node => node.remove());
        const tableRect = await page.locator('.main-container').boundingBox();
        await page.mouse.dblclick(tableRect.x + tableRect.width / 2, tableRect.y + tableRect.height / 2);
        assert.equal(await page.locator('.reportButtons').count(), 1);
        assert.equal(await page.locator('.player-type-hitbox').count(), 0);
        assert.equal(await page.locator('.player').first().evaluate(node => getComputedStyle(node).zIndex), '0');
        await page.locator('.reportNepodskaz').click();
        assert.equal(await page.locator('.reportButtons').count(), 0);
        await page.locator('.player-type-hitbox').last().dblclick();
        assert.equal(await page.locator('.player-type-picker').count(), 1);
        assert.equal(await page.locator('.reportButtons').count(), 0);
        await page.keyboard.press('Escape');
        checks++;
      }
      console.log(`Verified ${count} seats ${variant}: both zoom levels and nickname heights.`);
    }
    // Hand updates must preserve the seat ancestor that catches double clicks.
    assert(await page.evaluate(() => {
      const seat = document.querySelector('.player');
      window.tableProps.prompt = { ...window.tableProps.prompt, handNumber: 101 };
      window.updateTable();
      return document.querySelector('.player') === seat;
    }), 'Seat remounted during hand update');
    assert.deepEqual(errors, []);
    console.log(`${checks} Chrome checks passed: full player hitboxes, overlapping layers, report priority and post-report clicks; seat stable across hands.`);
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
