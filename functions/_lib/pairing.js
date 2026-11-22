// Picks two users to introduce.
// Rules: opposite gender, closest possible age, never a pair that was already introduced.
// Randomness: the first person is chosen at random; ties on age difference are broken at random.

export function pairKey(a, b) {
  return a < b ? `${a}-${b}` : `${b}-${a}`;
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * @param {{id:number,email:string,gender:'female'|'male',age:number}[]} users
 * @param {Set<string>} usedPairs set of pairKey(a,b)
 * @returns {{a:object,b:object}|null}
 */
export function pickPair(users, usedPairs) {
  for (const a of shuffle(users)) {
    const candidates = users.filter(
      (b) => b.gender !== a.gender && !usedPairs.has(pairKey(a.id, b.id))
    );
    if (candidates.length === 0) continue;

    const minDiff = Math.min(...candidates.map((b) => Math.abs(b.age - a.age)));
    const closest = candidates.filter((b) => Math.abs(b.age - a.age) === minDiff);
    const b = closest[Math.floor(Math.random() * closest.length)];
    return { a, b };
  }
  return null;
}
