const sqlite = require('sqlite');
const { hash } = require('./hashing');
const {
  toMinimal,
  isClosed,
  free,
  substFree,
  toNameless,
  reduce,
} = require('./lambda');
const { parseMinimal } = require('./parser');

const initialize = async file => {
  const db = await sqlite.open(file);
  await db.run('create table if not exists defs (name text not null primary key unique, hash text not null, ast text not null)');
  return db;
};

const insert = async (db, name, ast) => {
  if (!isClosed(ast)) throw new Error('AST must be closed before inserting in database');
  const min = toMinimal(ast);
  const hs = await hash(min);
  const data = await db.all('select name, hash, ast from defs where hash = ?', hs);
  for (let i = 0, l = data.length; i < l; i++)
    if (data[i].ast === min) throw new Error('a definition with that AST already exists');
  await db.run('insert into defs (name, hash, ast) values (?, ?, ?)', [name, hs, min]);
  return { name, hash: hs, ast: min };
};

const remove = (db, name) => db.run('delete from defs where name = ?', name);

const get = async (db, name) => {
  const res = await db.get('select name, hash, ast from defs where name = ?', name);
  if (!res) throw new Error(`definition not found: ${name}`);
  return res;
};

const substAll = async (db, ast) => {
  const assoc = await Promise.all(Object.keys(free(ast)).map(name => get(db, name).then(o => [name, o.ast])));
  const env = {};
  for (let i = 0, l = assoc.length; i < l; i++) env[assoc[i][0]] = parseMinimal(assoc[i][1]);
  return substFree(env, ast);
};

const normalize = async (db, ast) => {
  const su = await substAll(db, toNameless(ast));
  return reduce(su);
};

module.exports = {
  initialize,
  insert,
  remove,
  get,
  substAll,
  normalize,
};
