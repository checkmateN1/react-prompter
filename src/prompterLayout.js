// Shared with the table CSS through custom properties: geometry and fit cannot drift apart.
export const TABLE_GEOMETRY = Object.freeze({ width: 714, height: 524, columnStep: 721, rowStep: 529, margin: 10, zoom: .65 });
export const TABLE_GRIDS = Object.freeze({ 4: [2, 2], 6: [3, 2], 9: [3, 3], 12: [4, 3], 15: [5, 3] });
export const SCALE_CACHE_KEY = 'startpro.layout-scales.v1';
export const TABLE_STYLE = Object.freeze({
  '--table-width': `${TABLE_GEOMETRY.width}px`, '--table-height': `${TABLE_GEOMETRY.height}px`,
  '--table-column-step': `${TABLE_GEOMETRY.columnStep}px`, '--table-row-step': `${TABLE_GEOMETRY.rowStep}px`,
  '--table-margin': `${TABLE_GEOMETRY.margin}px`, '--table-zoom': TABLE_GEOMETRY.zoom,
});

export function gridSize(count) {
  const [columns, rows] = TABLE_GRIDS[count] || TABLE_GRIDS[12];
  const g = TABLE_GEOMETRY;
  return { width: (g.margin * 2 + (columns - 1) * g.columnStep + g.width) * g.zoom,
    height: (g.margin * 2 + (rows - 1) * g.rowStep + g.height) * g.zoom };
}

export function fitEnvironment(browser = window) {
  const screen = browser.screen || {};
  return {
    width: browser.innerWidth, height: browser.innerHeight, dpi: browser.devicePixelRatio || 1,
    screen: [screen.width, screen.height, screen.availWidth, screen.availHeight, screen.availLeft, screen.availTop],
    display: new URLSearchParams(browser.location.search).get('display') || '',
  };
}

export function calculateScales(environment) {
  const { width, height } = environment;
  if (!(width > 0) || !(height > 0)) return null;
  return Object.fromEntries(Object.keys(TABLE_GRIDS).map(count => {
    const size = gridSize(count);
    return [count, Math.min(1, width / size.width, height / size.height)];
  }));
}

export function createScaleCache(getStorage = () => window.localStorage) {
  let memory;
  return environment => {
    const key = JSON.stringify([TABLE_GEOMETRY, TABLE_GRIDS, environment]);
    if (memory && memory.key === key) return memory.scales;
    const scales = calculateScales(environment);
    if (!scales) return null; // Do not paint a grid against an unknown/zero-sized viewport.
    let saved;
    try { saved = JSON.parse(getStorage().getItem(SCALE_CACHE_KEY)); } catch (_) { /* Optional cache. */ }
    // Validate persisted values against the formula as well as the display key.
    // A damaged but syntactically valid cache must never cause an oversized first frame.
    if (saved && saved.key === key && Object.keys(scales).every(count => saved.scales && saved.scales[count] === scales[count])) {
      memory = { key, scales: saved.scales };
    } else {
      memory = { key, scales };
      try { getStorage().setItem(SCALE_CACHE_KEY, JSON.stringify(memory)); } catch (_) { /* Fit still works without storage. */ }
    }
    return memory.scales;
  };
}

export function managedLayoutStyle(count, environment, scales) {
  if (!scales) return { ...TABLE_STYLE, visibility: 'hidden' };
  const scale = scales[count] || scales[12];
  return { ...TABLE_STYLE, zoom: scale, width: `${environment.width / scale}px`, height: `${environment.height / scale}px` };
}
