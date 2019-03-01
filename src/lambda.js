function Var(name) { this.name = name }
Var.prototype.toString = function() { return `${this.name}` };
const vr = name => new Var(name);

function Abs(name, body) { this.name = name; this.body = body }
Abs.prototype.toString = function() { return `(\\${this.name}. ${this.body})` };
const abs = (ns, body) => ns.reduceRight((x, y) => new Abs(y, x), body);

function App(left, right) { this.left = left; this.right = right }
App.prototype.toString = function() { return `(${this.left} ${this.right})` };
function app() { return Array.prototype.slice.call(arguments).reduce((x, y) => new App(x, y)) }

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

const reduce = expr => {
  if (expr instanceof Var) return expr;
  if (expr instanceof Abs)
    return new Abs(expr.name, reduce(expr.body));
  if (expr instanceof App) {
    const fn = reduce(expr.left);
    return fn instanceof Abs ?
      reduce(open(fn, expr.right)) :
      new App(fn, reduce(expr.right));
  }
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

  toMinimal,
  toNameless,
  toNamed,

  free,
  reduce,

  substFree,
  isClosed,
};
