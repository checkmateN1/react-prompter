const { prepareShkafNickname, matchesShkafNickname } = require('./shkafNicknameMatch');

test('prepares names in the same order as getShkafHash, including single replacements', () => {
  expect(prepareShkafNickname('Iii!!.,`-')).toBe('ilil!');
  expect(prepareShkafNickname(' A.B,C-D` ')).toBe(' abcd ');
});

test('uses stored candidate length, rather than current name length', () => {
  expect(matchesShkafNickname('abcdef', 'aVeryLongStoredNameUVWXYZ')).toBe(true);
  expect(matchesShkafNickname('aVeryLongStoredNameUVWXYZ', 'abcdef')).toBe(false);
});

test('retains OCR matches and rejects unrelated short names', () => {
  expect(matchesShkafNickname('Gabibbo1', 'Gabibbo]')).toBe(true);
  expect(matchesShkafNickname('foo123', 'xyz789')).toBe(false);
  expect(matchesShkafNickname('A.li!-ce', 'alllce')).toBe(true);
  expect(matchesShkafNickname('', 'name')).toBe(false);
});
