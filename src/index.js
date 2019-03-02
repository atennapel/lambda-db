const { toNameless, toNamed, steps, step, pretty } = require('./lambda');
const { initialize, insert, remove, get, normalize, substAll } = require('./database');
const { parseMinimal, parse, parseName } = require('./parser');

const args = process.argv;
if (args.length <= 2) console.log('usage: def name ast OR get name OR remove name OR eval ast');
else {
  const cmd = args[2];
  (async () => {
    try {
      const db = await initialize('./db.db');
      if (cmd === 'def') {
        const name = parseName(args[3]);
        const nl = toNameless(parse(args[4]));
        const n = await normalize(db, nl);
        await insert(db, name, n);
        const o = await get(db, name);
        console.log(`${o.name} (${o.hash}) = ${pretty(toNamed(parseMinimal(o.ast)))}`);
      } else if (cmd === 'get') {
        const name = parseName(args[3]);
        const o = await get(db, name);
        console.log(`${o.name} (${o.hash}) = ${pretty(toNamed(parseMinimal(o.ast)))}`);
      } else if (cmd === 'remove') {
        const name = parseName(args[3]);
        await remove(db, name);
        console.log(`removed ${name}`);
      } else if (cmd === 'eval') {
        const nl = toNameless(parse(args[3]));
        const n = await normalize(db, nl);
        console.log(`${pretty(toNamed(n))}`);
      } else if (cmd === 'steps') {
        const nl = toNameless(parse(args[3]));
        const n = await substAll(db, nl);
        const st = steps(n);
        console.log(st.map((x, i) => `${i+1}. ${pretty(toNamed(x))}`).join('\n'));
      } else if (cmd === 'parse') {
        console.log(`${parse(args[3])}`);
      } else console.log('usage: def name expr OR get name OR remove name OR eval expr OR parse expr');
    } catch(err) {
      console.log(''+err);
    }
  })();
}
