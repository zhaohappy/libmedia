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
    callback(null, `module.exports = ` + code);
  }
  catch (error) {
    callback(error, error.toString());
  }
};