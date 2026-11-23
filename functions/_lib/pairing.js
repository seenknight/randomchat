// Picks two users to introduce. Priorities, strongest first:
//   1. Opposite gender         - mandatory. If nobody qualifies, nobody is introduced.
//   2. Closest possible age
//   3. Same city               - only breaks ties between equally-close ages (and only if useCity)
// Also: a pair that was already introduced is never picked again.
// Randomness: the first person is chosen at random; remaining ties are broken at random.

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

const randomOf = (arr) => arr[Math.floor(Math.random() * arr.length)];

/**
 * @param {{id:number,email:string,gender:'female'|'male',age:number,city_key?:string|null}[]} users
 * @param {Set<string>} usedPairs set of pairKey(a,b)
 * @param {{useCity?:boolean}} [options]
 * @returns {{a:object,b:object}|null}
 */
export function pickPair(users, usedPairs, { useCity = false } = {}) {
  for (const a of shuffle(users)) {
    // 1) opposite gender (mandatory) and not introduced before
    const candidates = users.filter(
      (b) => b.gender !== a.gender && !usedPairs.has(pairKey(a.id, b.id))
    );
    if (candidates.length === 0) continue;

    // 2) closest age
    const minDiff = Math.min(...candidates.map((b) => Math.abs(b.age - a.age)));
    let best = candidates.filter((b) => Math.abs(b.age - a.age) === minDiff);

    // 3) same city, as the last priority
    if (useCity && a.city_key) {
      const sameCity = best.filter((b) => b.city_key && b.city_key === a.city_key);
      if (sameCity.length > 0) best = sameCity;
    }

    return { a, b: randomOf(best) };
  }
  return null;
}
