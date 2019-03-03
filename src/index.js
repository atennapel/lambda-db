function Box() {}
Box.prototype.toString = function() { return '#' };
const box = new Box();

function Star() {}
Star.prototype.toString = function() { return '*' };
const star = new Star();

function Var(name) { this.name = name }
Var.prototype.toString = function() { return this.name };
const vr = name => new Var(name);
let id = 0;
const fresh = () => new Var(`\$${id++}`);

function App(left, right) { this.left = left; this.right = right };
App.prototype.toString = function() { return `(${this.left} ${this.right})` };
function app() { return Array.prototype.slice.call(arguments).reduce((x, y) => new App(x, y)) }

function Abs(name, type, body) { this.name = name; this.type = type; this.body = body }
Abs.prototype.toString = function() { return `(\\(${this.name}:${this.type}).${this.body})` };
function abs(ns, body) { return ns.reduceRight((b, [n, t]) => new Abs(n, t, b), body) }

function Pi(name, type, body) { this.name = name; this.type = type; this.body = body }
Pi.prototype.toString = function() { return `(${this.name}:${this.type}) -> ${this.body})` };
function pi(ns, body) { return ns.reduceRight((b, [n, t]) => new Pi(n, t, b), body) }

const contains = (x, t) => {
  if (t instanceof Var) return t.name === x;
  if (t instanceof Abs || t instanceof Pi)
    return contains(x, t.type) || (t.name !== x && contains(x, t.body));
  return false;
};

const flattenApp = t => {
  let c = t;
  const r = [];
  while (c instanceof App) {
    r.push(c.right);
    c = c.left;
  }
  r.push(c);
  return r.reverse();
};
const flattenAbs = t => {
  let c = t;
  const r = [];
  while (c instanceof Abs) {
    r.push([c.name, c.type]);
    c = c.body;
  }
  return [r, c];
};
const flattenPi = t => {
  let c = t;
  const r = [];
  while (c instanceof Pi) {
    r.push([c.name, c.type]);
    c = c.body;
  }
  return [r, c];
};

const wrap = x => x instanceof App || x instanceof Pi || x instanceof Abs ? `(${pretty(x)})` : pretty(x);
const pretty = t => {
  if (t instanceof App) return flattenApp(t).map(wrap).join(' ');
  if (t instanceof Abs) {
    const f = flattenAbs(t);
    return `\\${f[0].map(([n, t]) => `(${n} : ${pretty(t)})`).join('')}. ${pretty(f[1])}`;
  }
  if (t instanceof Pi) {
    const f = flattenPi(t);
    return `${f[0].map(([n, t]) => `(${n} : ${pretty(t)})`).join(' -> ')} -> ${pretty(f[1])}`;
  }
  return `${t}`;
};

const subst = (x, s, t) => {
  if (t instanceof Var) return x === t.name ? s : t;
  if (t instanceof Abs)
    return x === t.name ?
      new Abs(t.name, subst(x, s, t.type), t.body) :
      new Abs(t.name, subst(x, s, t.type), subst(x, s, t.body));
  if (t instanceof Pi)
    return x === t.name ?
      new Pi(t.name, subst(x, s, t.type), t.body) :
      new Pi(t.name, subst(x, s, t.type), subst(x, s, t.body));
  if (t instanceof App)
    return new App(subst(x, s, t.left), subst(x, s, t.right));
  return t;
};

const equals = (a, b) => {
  if (a instanceof Box) return b instanceof Box;
  if (a instanceof Star) return b instanceof Star;
  if (a instanceof Var) return b instanceof Var && a.name === b.name;
  if (a instanceof App)
    return b instanceof App && equals(a.left, b.left) && equals(a.right, b.right);
  if ((a instanceof Abs && b instanceof Abs) || (a instanceof Pi && b instanceof Pi)) {
    if (!equals(a.type, b.type)) return false;
    const x = fresh();
    return equals(subst(a.name, x, a.body), subst(b.name, x, b.body));
  }
  return false;
};

const norm = t => {
  if (t instanceof App) {
    const a = norm(a.left);
    if (a instanceof Abs)
      return norm(subst(a.name, norm(t.right), a.body));
    return new App(a, norm(t.right))
  }
  if (t instanceof Abs) return new Abs(t.name, norm(t.type), norm(t.body));
  if (t instanceof Pi) return new Pi(t.name, norm(t.type), norm(t.body));
  return t;
};

const betaEq = (a, b) => equals(norm(a), norm(b));

const err = msg => { throw new TypeError(msg) };
const check = (env, t) => {
  if (t instanceof Star) return box;
  if (t instanceof Var) return env[t.name] || err(`undefined var ${t}`);
  if (t instanceof App) {
    const a = check(env, t.left);
    if (!(a instanceof Pi)) return err(`not a pi: ${a} in ${t}`);
    const b = check(env, t.right);
    if (!betaEq(a.type, b)) return err(`type mismatch ${a.type} != ${b} in ${t}`);
    return subst(a.name, t.right, a.body);
  }
  if (t instanceof Pi) {
    const ty = check(env, t.type);
    if (!(ty instanceof Box || ty instanceof Star))
      return err(`not # or * in pi type: ${t}, got ${ty}`);
    const nenv = Object.create(env); nenv[t.name] = t.type;
    const bo = check(nenv, t.body);
    if (!(bo instanceof Box || bo instanceof Star))
      return err(`not # or * in pi body: ${t}, got ${bo}`);
    return bo;
  }
  if (t instanceof Abs) {
    const nenv = Object.create(env); nenv[t.name] = t.type;
    const bo = check(nenv, t.body);
    const ty = new Pi(t.name, t.type, bo);
    check(env, ty);
    return ty;
  }
};

// testing
const env = {
  Bool: star,
  True: vr('Bool'),
};
const pair = abs([
  ['a', star],
  ['b', star],
  ['x', vr('a')],
  ['y', vr('b')],
  ['r', star],
  ['f', pi([['x', vr('a')], ['y', vr('b')]], vr('r'))],
], app(vr('f'), vr('x'), vr('y')));
const expr = app(pair, vr('Bool'), vr('Bool'), vr('True'), vr('True'));
console.log(pretty(expr));
const ty = check(env, expr);
console.log(pretty(ty));
