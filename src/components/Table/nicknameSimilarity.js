/* eslint-disable strict */
'use strict';

// Shared with the cabinet: preserve its OCR costs and second-chance comparison.
function toLowerSafe(value) {
  return String(value ?? "").toLowerCase();
}

function buildVariants(str, maxLeftTrim, maxRightTrim) {
  const variants = new Set();
  const len = str.length;

  for (let left = 0; left <= maxLeftTrim; left += 1) {
    for (let right = 0; right <= maxRightTrim; right += 1) {
      const start = Math.min(left, len);
      const end = Math.max(start, len - right);
      variants.add(str.slice(start, end));
    }
  }

  return Array.from(variants);
}

function isSimilarByWindow(base, variant, minRatio) {
  if (!base.length) return false;
  if (variant.length > base.length) return false;
  if (variant.length / base.length < minRatio) return false;

  const maxStart = base.length - variant.length;
  for (let start = 0; start <= maxStart; start += 1) {
    let matches = 0;
    for (let i = 0; i < variant.length; i += 1) {
      if (base[start + i] === variant[i]) matches += 1;
    }
    if (matches / base.length >= minRatio) return true;
  }

  return false;
}

// Compares two nicknames with tolerance for 1-2 noisy characters at edges
// and small shifts between strings.
function compareStringsPro(a, b) {
  const minRatio = 0.8;
  const maxRightTrim = 2;

  const aLower = toLowerSafe(a);
  const bLower = toLowerSafe(b);

  if (!aLower || !bLower) return false;

  const maxLeftTrimA = aLower.length > 11 ? 3 : 2;
  const maxLeftTrimB = bLower.length > 11 ? 3 : 2;

  const aVariants = buildVariants(aLower, maxLeftTrimA, maxRightTrim);
  const bVariants = buildVariants(bLower, maxLeftTrimB, maxRightTrim);

  for (const aVar of aVariants) {
    if (!aVar) continue;
    if (isSimilarByWindow(bLower, aVar, minRatio)) return true;
  }

  for (const bVar of bVariants) {
    if (!bVar) continue;
    if (isSimilarByWindow(aLower, bVar, minRatio)) return true;
  }

  return false;
}

// Функция для обрезки строки с правой стороны
function trimStringFromEnd(inputString, maxLength) {
  return inputString.length > maxLength ? inputString.slice(-maxLength) : inputString;
}

function weightedLevenshtein(s1, s2, substitutionCost) {
  s1 = trimStringFromEnd(s1, 6);
  s2 = trimStringFromEnd(s2, 6);
  const m = s1.length;
  const n = s2.length;
  const dp = Array.from(Array(m + 1), () => Array(n + 1).fill(0));

  // Инициализация базовых случаев
  for (let i = 0; i <= m; i++) {
    dp[i][0] = i; // Стоимость удаления
  }
  for (let j = 0; j <= n; j++) {
    dp[0][j] = j; // Стоимость вставки
  }

  // Основной цикл
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const char1 = s1[i - 1];
      const char2 = s2[j - 1];

      const cost = char1 === char2 ? 0 : (substitutionCost[`${char1}${char2}`] || 1);

      dp[i][j] = Math.min(
          dp[i - 1][j] + 1,      // Удаление
          dp[i][j - 1] + 1,      // Вставка
          dp[i - 1][j - 1] + cost // Замена
      );
    }
  }

  return dp[m][n];
}

// Функция для создания матрицы похожести символов
function createSubstitutionCost(pairs) {
  const cost = {};
  for (const [pair, value] of Object.entries(pairs)) {
    const k = pair.replace(/\s+/g, ''); // "l ]" -> "l]"
    cost[k] = value;
  }
  return cost;
}

const similarPairs = {
  // 1 / l / I / | / ] / [
  '1 l': 0.15, 'l 1': 0.15,
  '1 I': 0.15, 'I 1': 0.15,
  '1 |': 0.15, '| 1': 0.15,
  'l I': 0.10, 'I l': 0.10,
  'l |': 0.10, '| l': 0.10,
  'I |': 0.10, '| I': 0.10,

  // вот это прямо под твой кейс Gabibbo1 vs Gabibbo]
  '1 ]': 0.20, '] 1': 0.20,
  'l ]': 0.25, '] l': 0.25,
  'I ]': 0.25, '] I': 0.25,
  '| ]': 0.25, '] |': 0.25,
  '[ ]': 0.35, '] [': 0.35,

  // 1 / l / I / | / ] / [  (+ i как палочка)
  '1 i': 0.20, 'i 1': 0.20,
  'l i': 0.15, 'i l': 0.15,
  'I i': 0.15, 'i I': 0.15,
  '| i': 0.15, 'i |': 0.15,

  // если i часто путается с ]/[ в твоем OCR/шрифтах
  '] i': 0.25, 'i ]': 0.25,
  '[ i': 0.25, 'i [': 0.25,

  // 0 / O / o / Q / D (частые OCR подмены)
  '0 O': 0.15, 'O 0': 0.15,
  '0 o': 0.15, 'o 0': 0.15,
  'O o': 0.10, 'o O': 0.10,
  '0 Q': 0.25, 'Q 0': 0.25,
  'O Q': 0.25, 'Q O': 0.25,
  '0 D': 0.35, 'D 0': 0.35, // иногда "0" читают как "D" в жирных шрифтах

  // 5 / S, 2 / Z, 8 / B, 6 / G, 9 / g / q
  '5 S': 0.20, 'S 5': 0.20,
  '5 s': 0.20, 's 5': 0.20,
  '2 Z': 0.20, 'Z 2': 0.20,
  '2 z': 0.20, 'z 2': 0.20,
  '8 B': 0.20, 'B 8': 0.20,
  '6 G': 0.35, 'G 6': 0.35,
  '9 g': 0.35, 'g 9': 0.35,
  '9 q': 0.35, 'q 9': 0.35,

  'u V': 0.50, 'V u': 0.50,
  'v V': 0.20, 'V v': 0.20,

  '( {': 0.20, '{ (': 0.20,
  ') }': 0.20, '} )': 0.20,
};

const substitutionCost = createSubstitutionCost(similarPairs);

const isNicknameString = value => typeof value === 'string' && value.trim().length > 0;

// Keep the cabinet's full-name threshold; window matching below uses six characters.
function isSimilarStringsComplex(str1, str2) {
  if (!isNicknameString(str1) || !isNicknameString(str2)) return false;
  const distance = weightedLevenshtein(str1, str2, substitutionCost);
  return distance / str1.length <= 0.26 || compareStringsPro(str1, str2);
}

function compareNicknameSuffix(a, b) {
  if (!isNicknameString(a) || !isNicknameString(b)) return false;
  const current = trimStringFromEnd(a.trim().toLowerCase(), 6);
  const candidate = trimStringFromEnd(b.trim().toLowerCase(), 6);
  const distance = weightedLevenshtein(current, candidate, substitutionCost);
  return distance / current.length <= 0.26 || compareStringsPro(current, candidate);
}

module.exports = { weightedLevenshtein, substitutionCost, trimStringFromEnd, compareStringsPro,
  isNicknameString, isSimilarStringsComplex, compareNicknameSuffix };
