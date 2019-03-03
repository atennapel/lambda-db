const {
  toNameless,
  toNamed,
  toMinimal,
  vr,
  app,
  abs,
  Type, Pi,
  reduce,
  typeOf,
} = require('./lambda');

const expr = abs([['t', Type], ['x', vr('t')]], vr('x'));
console.log(`${expr}`);
const nl = toNameless(expr);
console.log(`${nl} | ${toMinimal(nl)}`);
const ty = typeOf(nl);
console.log(`${ty} | ${toMinimal(ty)} | ${toNamed(ty)}`);
const re = reduce(nl);
console.log(`${re} | ${toMinimal(re)}`);
const na = toNamed(re);
console.log(`${na}`);
