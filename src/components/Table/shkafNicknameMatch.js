const { weightedLevenshtein, substitutionCost, compareStringsPro } = require('./nicknameSimilarity');

// playLogic/play_utils.js:getShkafHash. Keep the order and single replace calls.
function prepareShkafNickname(nick) {
  return typeof nick === 'string'
    ? nick.replace(/[.,`-]/g, '').replace('i', 'l').replace('!', 'l').toLowerCase()
    : '';
}

// A single nickname pair from getSimilarHash: the stored candidate is curNicks[j],
// the requested/current nickname is hashNicks[j]. Do not reverse the denominator.
function matchesShkafNickname(currentNick, storedNick) {
  const current = prepareShkafNickname(currentNick);
  const stored = prepareShkafNickname(storedNick);
  if (!current || !stored) return false;
  const distance = weightedLevenshtein(stored, current, substitutionCost);
  if (distance / stored.length > 0.26) return compareStringsPro(stored, current);
  return true;
}

module.exports = { prepareShkafNickname, matchesShkafNickname };
