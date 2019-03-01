const {
  Var,
  Abs,
  abs,
  App,
} = require('./lambda');

const SYMBOLS = '()\\.';
const START = 0;
const NAME = 1;
const tokenize = s => {
  let state = START;
  const r = [];
  let t = '';
  for (let i = 0, l = s.length; i <= l; i++) {
    const c = s[i] || ' ';
    if (state === START) {
      if (SYMBOLS.indexOf(c) >= 0) r.push(c);
      else if (/[a-z0-9]/i.test(c)) t += c, state = NAME;
      else if (/\s/.test(c)) continue;
      else throw new SyntaxError(`unexpected char ${c}`);
    } else if (state === NAME) {
      if (!/[a-z0-9]/i.test(c))
        r.push(t), t = '', i--, state = START;
      else t += c;
    }
  }
  if (state !== START)
    throw new SyntaxError('invalid end state');
  return r;
};

const matchfn = (a, fn) => {
  if (a.length && fn(a[a.length - 1]))
    return true;
  return false;
};
const match = (a, x) => {
  if (a.length && a[a.length - 1] === x) {
    a.pop();
    return true;
  }
  return false;
};

const isCon = x => {
  if (x[0] === '"') throw new SyntaxError(`invalid name: ${JSON.stringify(x.slice(1))}`);
  const s = x.split('.');
  if (s.length === 0 || s.indexOf('') >= 0) throw new SyntaxError(`invalid name: ${x}`);
  return /[A-Z]/.test(s[s.length - 1][0]);
};

const parseExpr = a => {
  // console.log(a.slice().reverse().join(' '));
  if (a.length === 0) throw new SyntaxError('empty');
  if (match(a, '(')) {
    const es = [];
    while (true) {
      if (a.length === 0) throw new SyntaxError('missing )');
      if (match(a, ')')) break;
      es.push(parseExpr(a));
    }
    if (es.length === 0) throw new SyntaxError('empty');
    if (es.length === 1) return es[0];
    return es.reduce((x, y) => new App(x, y));
  } else if (match(a, '\\')) {
    const args = [];
    while (!match(a, '.')) args.push(parseName(a));
    if (args.length === 0)
      throw new SyntaxError('abs without parameters');
    const es = [];
    let br = 0;
    while (true) {
      if (a.length === 0) break;
      if (a[a.length - 1] === '(') br++;
      if (a[a.length - 1] === ')') {
        if (br === 0) break;
        br--;
      }
      es.push(a.pop());
    }
    es.unshift('('); es.push(')');
    const body = parseExpr(es.reverse());
    return abs(args, body);
  } else if (matchfn(a, x => !/[a-z0-9]/i.test(x[0])))
    throw new SyntaxError(`unexpected ${a.pop()}`);
  const x = a.pop();
  return new Var(x);
};

const parseName = ts => {
  if (ts.length === 0)
    throw new SyntaxError('name expected but got nothing');
  const x = ts.pop();
  if (!/[a-z0-9]/i.test(x))
    throw new SyntaxError(`name expected but got ${x}`);
  return x;
};

const parseExprTop = s => {
  const ts = tokenize(s);
  ts.unshift('('); ts.push(')');
  return parseExpr(ts.reverse());
};

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

const parseNameTop = x => {
  if (/^[a-z0-9]+$/i.test(x)) return x;
  throw new SyntaxError(`invalid name: ${x}`);
};

module.exports = {
  parse: parseExprTop,
  parseMinimal,
  parseName: parseNameTop,
};
