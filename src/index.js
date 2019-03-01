const {
  vr, abs, app,
  toMinimal,
  toNameless,
  toNamed,
  free,
  reduce,
  substFree,
} = require('./lambda');

const env = {
  I: toNameless(abs(['x'], vr('x'))),
  K: toNameless(abs(['x', 'y'], vr('x'))),
  S: toNameless(abs(['x', 'y', 'z'],
    app(app(vr('x'), vr('z')), app(vr('y'), vr('z'))))),
};

const expr = app(vr('K'), vr('I'));
console.log(`${expr}`);
const nm = toNameless(expr);
console.log(`${nm}`);
console.log(`${toMinimal(nm)}`);
const su = substFree(env, expr);
console.log(`${su}`);
console.log(`${toMinimal(su)}`);
const re = reduce(su);
console.log(`${re}`);
console.log(`${toMinimal(re)}`);
const nm2 = toNamed(re);
console.log(`${nm2}`);

