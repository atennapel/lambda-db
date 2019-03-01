const hashLib = require('murmurhash-native').murmurHash128;

const hash = txt => new Promise((resolve, reject) => {
  hashLib(txt, (err, hs) => {
    if (err) return reject(err);
    resolve(hs);
  });
});

module.exports = {
  hash,
};
