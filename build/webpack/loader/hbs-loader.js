const yox = require('yox');
const html2js = require('html2js');

module.exports = function(source) {
  let callback = this.async();
  try {
    let code = html2js(
      source,
      {
        mode: 'compress'
      }
    );
    code = code.replace(/\\'/g, '\'');
    code = code.substring(1, code.length - 1);
    code = yox.compile(code, true);
    callback(null, `module.exports = ${code};`);
  }
  catch (error) {
    callback(error, error.toString());
  }
};