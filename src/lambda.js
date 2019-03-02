function Var(name) { this.name = name }
Var.prototype.toString = function() { return `${this.name}` };
const vr = name => new Var(name);

function Abs(name, body) { this.name = name; this.body = body }
Abs.prototype.toString = function() { return `(\\${this.name}. ${this.body})` };
const abs = (ns, body) => ns.reduceRight((x, y) => new Abs(y, x), body);

function App(left, right) { this.left = left; this.right = right }
App.prototype.toString = function() { return `(${this.left} ${this.right})` };
function app() { return Array.prototype.slice.call(arguments).reduce((x, y) => new App(x, y)) }

const flattenApp = expr => {
  const r = [];
  let c = expr;
  while (c instanceof App) {
    r.push(c.right);
    c = c.left;
  }
  r.push(c);
  return r.reverse();
};
const flattenAbs = expr => {
  const args = [];
  let c = expr;
  while (c instanceof Abs) {
    args.push(c.name);
    c = c.body;
  }
  return [args, c];
};

const pretty = expr => {
  if (expr instanceof Var) return `${expr.name}`;
  if (expr instanceof Abs) {
    const f = flattenAbs(expr);
    return `\\${f[0].join(' ')}. ${pretty(f[1])}`;
  }
  if (expr instanceof App) {
    const f = flattenApp(expr);
    return `${f.map(x => x instanceof Abs || x instanceof App ? `(${pretty(x)})` : pretty(x)).join(' ')}`;
  }
};

const toMinimal = expr => {
  if (expr instanceof Var) return `#${expr.name}`;
  if (expr instanceof Abs) return `\\${toMinimal(expr.body)}`;
  if (expr instanceof App)
    return `@${toMinimal(expr.left)}${toMinimal(expr.right)}`;
};

const toNameless = (expr, id = 0, map = {}) => {
  if (expr instanceof Var)
    return typeof map[expr.name] === 'number' ? new Var(id - 1 - map[expr.name]) : expr;
  if (expr instanceof Abs) {
    const nmap = Object.create(map);
    nmap[expr.name] = id;
    return new Abs(expr.name, toNameless(expr.body, id + 1, nmap));
  }
  if (expr instanceof App)
    return new App(toNameless(expr.left, id, map), toNameless(expr.right, id, map));
};

const toNamed = (expr, id = 0, map = {}, fresh = { id: 0 }) => {
  if (expr instanceof Var) {
    const name = expr.name;
    if (typeof name === 'string') return expr;
    return map[id - 1 - name] || expr;
  }
  if (expr instanceof Abs) {
    let name = expr.name;
    if (free(expr)[name]) name = `x\$${fresh.id++}`;
    const nmap = Object.create(map);
    nmap[id] = new Var(name);
    return new Abs(name, toNamed(expr.body, id + 1, nmap, fresh));
  }
  if (expr instanceof App)
    return new App(toNamed(expr.left, id, map, fresh), toNamed(expr.right, id, map, fresh));
};

const free = (expr, map = {}) => {
  if (expr instanceof Var) {
    if (typeof expr.name === 'number') return map;
    map[expr.name] = true;
    return map;
  }
  if (expr instanceof Abs)
    return free(expr.body, map);
  if (expr instanceof App)
    return free(expr.right, free(expr.left, map));
};

const shift = (d, c, expr) => {
  if (expr instanceof Var) {
    const k = expr.name;
    if (typeof k !== 'number') return expr;
    return k < c ? expr : new Var(k + d); 
  }
  if (expr instanceof Abs)
    return new Abs(expr.name, shift(d, c + 1, expr.body));
  if (expr instanceof App)
    return new App(shift(d, c, expr.left), shift(d, c, expr.right));
};

const subst = (j, s, expr) => {
  if (expr instanceof Var) {
    const k = expr.name;
    if (typeof k !== 'number') return expr;
    return k === j ? s : expr;
  }
  if (expr instanceof Abs)
    return new Abs(expr.name, subst(j + 1, shift(1, 0, s), expr.body));
  if (expr instanceof App)
    return new App(subst(j, s, expr.left), subst(j, s, expr.right));
};

const open = (abs, u) => shift(-1, 0, subst(0, shift(1, 0, u), abs.body));

const step = expr => {
  if (expr instanceof Var) return null;
  if (expr instanceof Abs) {
    //const b = step(expr.body);
    //if (b) return new Abs(expr.name, b);
    const body = expr.body;
    if (body instanceof App && body.right instanceof Var && body.right.name === 0)
      return body.left;
    return null;
  }
  if (expr instanceof App) {
    const left = step(expr.left);
    if (left) return new App(left, expr.right);
    const right = step(expr.right);
    if (right) return new App(expr.left, right);
    if (expr.left instanceof Abs)
      return open(expr.left, expr.right);
    //const right = step(expr.right);
    //if (right) return new App(expr.left, right);
    return null;
  }
};

const stepTop = expr => step(expr) || expr;

const reduce = expr => {
  let p = expr;
  let c = expr;
  while (c) {
    p = c;
    c = step(c);
  }
  return p;
};

const steps = expr => {
  const r = [];
  let c = expr;
  while (c) {
    r.push(c)
    c = step(c);
  }
  return r;
};

const substFree = (env, expr) => {
  if (expr instanceof Var) return env[expr.name] || expr;
  if (expr instanceof Abs)
    return new Abs(expr.name, substFree(env, expr.body));
  if (expr instanceof App)
    return new App(substFree(env, expr.left), substFree(env, expr.right));
};

const isClosed = (expr, id = 0) => {
  if (expr instanceof Var) {
    const name = expr.name;
    if (typeof name === 'string') return false;
    return name < id;
  }
  if (expr instanceof Abs) return isClosed(expr.body, id + 1);
  if (expr instanceof App)
    return isClosed(expr.left, id) && isClosed(expr.right, id);
};

module.exports = {
  Var, vr,
  Abs, abs,
  App, app,

  pretty,

  toMinimal,
  toNameless,
  toNamed,

  free,
  reduce,
  step: stepTop,
  steps,

  substFree,
  isClosed,
};
