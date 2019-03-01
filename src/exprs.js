function Var(name) { this.name = name }
Var.prototype.toString = function() { return `${this.name}` };
const vr = name => new Var(name);

function Abs(name, body) { this.name = name; this.body = body }
Abs.prototype.toString = function() { return `(\\${this.name}. ${this.body})` };
const abs = (ns, body) => ns.reduceRight((x, y) => new Abs(y, x), body);

function App(left, right) { this.left = left; this.right = right }
App.prototype.toString = function() { return `(${this.left} ${this.right})` };
function app() { return Array.prototype.slice.call(arguments).reduce((x, y) => new App(x, y)) }

const toNameless = (expr, map = {}) => {
  if (expr instanceof Var) return 
  if (expr instanceof Abs)
    return 
  if (expr instanceof App)
    return new App(toNameless(expr.left, map), toNameless(expr.right, map));
};

module.exports = {
  Var, vr,
  Abs, abs,
  App, app,

  toNameless,
};
