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

function MVar(id, type) { this.id = id; this.type = type; this.def = null }
MVar.prototype.toString = function() { return `?${this.id}` };
const mv = (id, type) => new MVar(id, type);
let mid = 0;
const freshMV = type => new MVar(mid++, type);

function App(left, right, impl = false) { this.left = left; this.right = right; this.impl = impl };
App.prototype.toString = function() { return `(${this.left} ${this.impl ? '{' : ''}${this.right}${this.impl ? '}' : ''})` };
function app() { return Array.prototype.slice.call(arguments).reduce((x, y) => new App(x, y)) }

function Abs(name, type, body, impl = false) { this.name = name; this.type = type; this.body = body; this.impl = impl }
Abs.prototype.toString = function() { return `(\\${this.impl ? '{' : '('}${this.name}:${this.type}${this.impl ? '}' : ')'}.${this.body})` };
function abs(ns, body) { return ns.reduceRight((b, [n, t]) => new Abs(n, t, b), body) }

function Pi(name, type, body, impl = false) { this.name = name; this.type = type; this.body = body; this.impl = impl }
Pi.prototype.toString = function() { return `(${this.impl ? '{' : '('}${this.name}:${this.type}${this.impl ? '}' : ')'} -> ${this.body})` };
function pi(ns, body) { return ns.reduceRight((b, [n, t]) => new Pi(n, t, b), body) }

const contains = (x, t) => {
  if (t instanceof Var) return t.name === x;
  if (t instanceof App)
    return contains(x, t.left) || contains(x, t.right);
  if (t instanceof Abs || t instanceof Pi)
    return contains(x, t.type) || (t.name !== x && contains(x, t.body));
  return false;
};
const containsMV = (x, t) => {
  if (x === t) return true;
  if (t instanceof App)
    return containsMV(x, t.left) || containsMV(x, t.right);
  if (t instanceof Abs || t instanceof Pi)
    return containsMV(x, t.type) || containsMV(x, t.body);
  return false;
};

const flattenApp = t => {
  let c = t;
  const r = [];
  while (c instanceof App && !c.impl) {
    r.push(c.right);
    c = c.left;
  }
  r.push(c);
  return r.reverse();
};
const flattenAbs = t => {
  let c = t;
  const r = [];
  while (c instanceof Abs && !c.impl) {
    r.push([c.name, c.type]);
    c = c.body;
  }
  return [r, c];
};
const flattenPi = t => {
  let c = t;
  const r = [];
  while (c instanceof Pi && !c.impl) {
    r.push([c.name, c.type]);
    c = c.body;
  }
  return [r, c];
};

const wrap = x => x instanceof App || x instanceof Pi || x instanceof Abs ? `(${pretty(x)})` : pretty(x);
const pretty = t => {
  if (t instanceof App) return t.impl ? `${t}` : flattenApp(t).map(wrap).join(' ');
  if (t instanceof Abs) {
    if (t.impl) return `${t}`;
    const f = flattenAbs(t);
    return `\\${f[0].map(([n, t]) => `(${n} : ${pretty(t)})`).join('')}. ${pretty(f[1])}`;
  }
  if (t instanceof Pi) {
    if (t.impl) return `${t}`;
    const f = flattenPi(t);
    return `${f[0].map(([n, t]) => `(${n} : ${pretty(t)})`).join(' -> ')} -> ${pretty(f[1])}`;
  }
  return `${t}`;
};

const prune = t => {
  if (t instanceof MVar) {
    if (!t.def) return t;
    const ty = prune(t.def);
    t.def = ty;
    return ty;
  }
  if (t instanceof App) return new App(prune(t.left), prune(t.right), t.impl);
  if (t instanceof Abs) return new Abs(t.name, prune(t.type), prune(t.body), t.impl);
  if (t instanceof Pi) return new Pi(t.name, prune(t.type), prune(t.body), t.impl);
  return t;
};

const subst = (x, s, t) => {
  if (t instanceof Var) return x === t.name ? s : t;
  if (t instanceof Abs)
    return x === t.name ?
      new Abs(t.name, subst(x, s, t.type), t.body, t.impl) :
      new Abs(t.name, subst(x, s, t.type), subst(x, s, t.body), t.impl);
  if (t instanceof Pi)
    return x === t.name ?
      new Pi(t.name, subst(x, s, t.type), t.body, t.impl) :
      new Pi(t.name, subst(x, s, t.type), subst(x, s, t.body), t.impl);
  if (t instanceof App)
    return new App(subst(x, s, t.left), subst(x, s, t.right), t.impl);
  return t;
};

const equals = (a, b) => {
  if (a === b) return true;
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
    return new App(a, norm(t.right), t.impl)
  }
  if (t instanceof Abs) return new Abs(t.name, norm(t.type), norm(t.body), t.impl);
  if (t instanceof Pi) return new Pi(t.name, norm(t.type), norm(t.body), t.impl);
  return t;
};

const betaEq = (a, b) => equals(norm(a), norm(b));

const bind = (a, b) => {
  if (containsMV(a, b)) return err(`occurs fail: ${a} in ${b}`);
  a.def = b;
};
const unify = (a_, b_) => {
  const a = norm(prune(a_));
  const b = norm(prune(b_));
  console.log(`unify: ${pretty(a)} ~ ${pretty(b)}`);
  if (a === b) return;
  if (a instanceof MVar) return bind(a, b);
  if (b instanceof MVar) return bind(b, a);
  if (a instanceof Var && b instanceof Var && a.name === b.name) return;
  if (a instanceof App && b instanceof App) {
    unify(a.left, b.left);
    return unify(a.right, b.right);
  }
  if (a instanceof Abs && b instanceof Abs) {
    unify(a.type, b.type);
    const x = fresh();
    return unify(subst(a.name, x, a.body), subst(b.name, x, b.body));
  }
  if (a instanceof Pi && b instanceof Pi) {
    unify(a.type, b.type);
    const x = fresh();
    return unify(subst(a.name, x, a.body), subst(b.name, x, b.body));
  }
  return err(`unable to unify ${a} ~ ${b}`);
};

const err = msg => { throw new TypeError(msg) };
const check = (env, t) => {
  console.log(`check: ${pretty(t)}`);
  if (t instanceof MVar) return prune(t.type);
  if (t instanceof Star) return box;
  if (t instanceof Var) return env[t.name] ? prune(env[t.name]) : err(`undefined var ${t}`);
  if (t instanceof App) {
    if (t.impl) {
      const a = check(env, t.left);
      if (!(a instanceof Pi) || !a.impl) return err(`not an implicit pi: ${a} in ${t}`);
      const b = check(env, t.right);
      unify(a.type, b)
      return prune(subst(a.name, t.right, a.body));
    } else {
      const a = check(env, t.left);
      if (!(a instanceof Pi)) return err(`not a pi: ${a} in ${t}`);
      if (a.impl) {
        const mv = freshMV(a.type);
        const r = check(env, new App(subst(t.left.name, mv, t.left.body), t.right));
        return prune(r);
      } else {
        const b = check(env, t.right);
        unify(a.type, b);
        return prune(subst(a.name, t.right, a.body));
      }
    }
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
    const ty = new Pi(t.name, t.type, bo, t.impl);
    check(env, ty);
    return prune(ty);
  }
};

// testing
const env = {
  Bool: star,
  Nat: star,
  True: vr('Bool'),
  Zero: vr('Nat'),
};
const pair = abs([
  ['a', star],
  ['b', star],
  ['x', vr('a')],
  ['y', vr('b')],
  ['r', star],
  ['f', pi([['x', vr('a')], ['y', vr('b')]], vr('r'))],
], app(vr('f'), vr('x'), vr('y')));
const expr =
  app(
    new Abs('a', star, new Abs('b', star, abs([['x', vr('a')], ['y', vr('b')]], new Abs('r', star, abs([['f', pi([['x', vr('a')], ['y', vr('b')]], vr('r'))]], app(vr('f'), vr('x'), vr('y'))), true)), true), true),
    vr('True'),
    vr('Zero'),
    abs([['x', vr('Bool')], ['y', vr('Nat')]], vr('x')),
  );
console.log(pretty(expr));
const ty = prune(check(env, expr));
console.log(pretty(ty));
