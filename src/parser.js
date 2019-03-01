const {
  Var, Abs, App,
} = require('./lambda');

const parseMinimal = s => {
  const ts = s.match(/@|\\|#[0-9]+/g);
  if (ts.length === 0) throw new SyntaxError(`parseMinimal failed on ${s}`);
  let id = 0;
  const stack = [];
  for (let i = ts.length - 1; i >= 0; i--) {
    const c = ts[i];
    if (c === '@') {
      if (stack.length < 2) throw new SyntaxError(`parseMinimal failed on ${s}`);
      stack.push(new App(stack.pop(), stack.pop()));
    } else if (c === '\\') {
      if (stack.length < 1) throw new SyntaxError(`parseMinimal failed on ${s}`);
      stack.push(new Abs(`p\$${id++}`, stack.pop()));
    } else if (c[0] === '#') {
      const n = +c.slice(1);
      if (isNaN(n)) throw new SyntaxError(`parseMinimal failed on ${s}`);
      stack.push(new Var(n));
    } else throw new SyntaxError(`parseMinimal failed on ${s}`);
  }
  if (stack.length !== 1) throw new SyntaxError(`parseMinimal failed on ${s}`);
  return stack.pop();
};

module.exports = {
  parseMinimal,
}
