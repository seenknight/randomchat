import assert from 'node:assert/strict';
import { pickPair, pairKey } from '../functions/_lib/pairing.js';

const users = [
  { id: 1, email: 'a@x.com', gender: 'female', age: 25 },
  { id: 2, email: 'b@x.com', gender: 'male', age: 26 },
  { id: 3, email: 'c@x.com', gender: 'male', age: 40 },
  { id: 4, email: 'd@x.com', gender: 'female', age: 41 },
  { id: 5, email: 'e@x.com', gender: 'female', age: 30 },
];

// Opposite gender + closest age, over many random runs.
for (let i = 0; i < 500; i++) {
  const { a, b } = pickPair(users, new Set());
  assert.notEqual(a.gender, b.gender, 'must be opposite gender');
  const diff = Math.abs(a.age - b.age);
  const best = Math.min(
    ...users.filter((u) => u.gender !== a.gender).map((u) => Math.abs(u.age - a.age))
  );
  assert.equal(diff, best, 'must be the closest age for the chosen person');
}

// Already-introduced pairs are skipped.
const used = new Set([pairKey(1, 2), pairKey(3, 4)]);
for (let i = 0; i < 200; i++) {
  const { a, b } = pickPair(users, used);
  assert.ok(!used.has(pairKey(a.id, b.id)));
}

// Nobody of the opposite gender -> null.
assert.equal(pickPair([users[0], users[3]], new Set()), null);
// Everything already used -> null.
assert.equal(
  pickPair([users[0], users[1]], new Set([pairKey(1, 2)])),
  null
);

console.log('pairing tests passed');
