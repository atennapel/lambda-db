const {
  vr, abs, app,
  toMinimal,
  toNameless,
  toNamed,
  free,
  reduce,
  substFree,
} = require('./lambda');
const { initialize, insert, remove, get, substAll, normalize } = require('./database');

(async () => {
  try {
    const db = await initialize('./db.db');
    const res = await normalize(db, abs(['x'], app(vr('I'), vr('I'))));
    console.log(''+res);
  } catch(err) {
    console.log(''+err);
  }
})();
