import assert from 'node:assert/strict';
import { pickPair, pairKey } from '../functions/_lib/pairing.js';
import { cityKey } from '../functions/_lib/city.js';

const u = (id, gender, age, city_key = null) => ({ id, email: `${id}@x.com`, gender, age, city_key });
const RUNS = 500;

// For the randomly chosen first person `a`, the partner `b` must be the best by priority:
// opposite gender -> smallest age gap -> same city (only as a tie-break).
function assertBestPartner(a, b, users, useCity) {
  const cands = users.filter((x) => x.gender !== a.gender);
  assert.ok(cands.includes(b), 'partner must be of opposite gender');
  const diff = (x) => Math.abs(x.age - a.age);
  for (const c of cands) {
    assert.ok(diff(b) <= diff(c), `age gap must be minimal (picked ${b.id}, but ${c.id} is closer)`);
    if (useCity && diff(c) === diff(b) && a.city_key && c.city_key === a.city_key) {
      assert.equal(b.city_key, a.city_key, `same-city candidate ${c.id} must win the tie`);
    }
  }
}

// ---- 1. Opposite gender is mandatory; closest age wins ----
{
  const users = [u(1, 'female', 25), u(2, 'male', 26), u(3, 'male', 40), u(4, 'female', 41), u(5, 'female', 30)];
  for (let i = 0; i < RUNS; i++) {
    const { a, b } = pickPair(users, new Set());
    assert.notEqual(a.gender, b.gender);
    const best = Math.min(...users.filter((x) => x.gender !== a.gender).map((x) => Math.abs(x.age - a.age)));
    assert.equal(Math.abs(a.age - b.age), best);
  }
}

// ---- 2. Nobody of the opposite gender -> nobody is introduced ----
assert.equal(pickPair([u(1, 'female', 25), u(2, 'female', 25, 'tehran'), u(3, 'female', 26, 'tehran')], new Set(), { useCity: true }), null);
assert.equal(pickPair([u(1, 'male', 30), u(2, 'male', 30)], new Set()), null);

// ---- 3. Already-introduced pairs are skipped / exhausted ----
{
  const users = [u(1, 'female', 25), u(2, 'male', 26), u(3, 'male', 40), u(4, 'female', 41)];
  const used = new Set([pairKey(1, 2), pairKey(3, 4)]);
  for (let i = 0; i < 200; i++) {
    const { a, b } = pickPair(users, used);
    assert.ok(!used.has(pairKey(a.id, b.id)));
  }
  assert.equal(pickPair([u(1, 'female', 25), u(2, 'male', 26)], new Set([pairKey(1, 2)])), null);
}

// ---- 4. City breaks ties between equal age gaps ----
{
  // woman 1 (Tehran, 30): men 2 (Tehran, 31) and 3 (Shiraz, 29) are both 1 year away.
  const users = [u(1, 'female', 30, 'tehran'), u(2, 'male', 31, 'tehran'), u(3, 'male', 29, 'shiraz')];
  const picked = new Set();
  for (let i = 0; i < RUNS; i++) {
    const { a, b } = pickPair(users, new Set(), { useCity: true });
    assertBestPartner(a, b, users, true);
    if (a.id === 1) picked.add(b.id);
  }
  assert.deepEqual([...picked], [2], 'when the woman is picked first she must get the Tehran man');

  // With city disabled the same tie stays random.
  const seen = new Set();
  for (let i = 0; i < RUNS; i++) {
    const { a, b } = pickPair(users, new Set(), { useCity: false });
    if (a.id === 1) seen.add(b.id);
  }
  assert.ok(seen.has(2) && seen.has(3), 'with city disabled, ties stay random');
}

// ---- 5. Age is MORE important than city ----
{
  // woman 1 (Tehran, 30): man 2 is same city but 8 years away, man 3 is another city but 1 year away.
  const users = [u(1, 'female', 30, 'tehran'), u(2, 'male', 38, 'tehran'), u(3, 'male', 31, 'shiraz')];
  const picked = new Set();
  for (let i = 0; i < RUNS; i++) {
    const { a, b } = pickPair(users, new Set(), { useCity: true });
    assertBestPartner(a, b, users, true);
    if (a.id === 1) picked.add(b.id);
  }
  assert.deepEqual([...picked], [3], 'closer age must beat same city');
}

// ---- 6. Missing city never counts as "same city" ----
{
  const users = [u(1, 'female', 30, null), u(2, 'male', 31, null), u(3, 'male', 29, 'shiraz')];
  const seen = new Set();
  for (let i = 0; i < RUNS; i++) {
    const { a, b } = pickPair(users, new Set(), { useCity: true });
    seen.add([a.id, b.id].sort().join('-'));
  }
  assert.ok(seen.has('1-2') && seen.has('1-3'));
}

// ---- 7. City normalization ----
assert.equal(cityKey('تهران'), cityKey(' Tehran '));
assert.equal(cityKey('اصفهان'), cityKey('Esfahan'));
assert.equal(cityKey('Isfahan'), cityKey('esfahan'));
assert.equal(cityKey('بندر عباس'), cityKey('بندرعباس'));
assert.equal(cityKey('Bandar Abbas'), cityKey('بندرعباس'));
assert.equal(cityKey('كرج'), cityKey('کرج')); // Arabic kaf vs Persian kaf
assert.equal(cityKey('ارومیه'), cityKey('Urmia'));
assert.notEqual(cityKey('Tehran'), cityKey('Karaj'));
assert.equal(cityKey('   '), '');
assert.equal(cityKey('New  York'), cityKey('new york'));

console.log('all tests passed');
