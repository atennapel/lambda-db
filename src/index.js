const {
  vr, abs, app,
} = require('./exprs');

const expr = abs(['f', 'x'], app(vr('f'), vr('x')));
console.log(`${expr}`);
