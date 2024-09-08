const loaderUtils = require('loader-utils');

const rider = require('rider');
const stylus = require('stylus');
const autoprefixer = require('autoprefixer');
const postcss = require('postcss');

async function autoPrefixer(css, fileName) {

  let instance = autoprefixer({
    browsers: [
      '> 0%',
      'last 10 version'
    ]
  });
 
  let result = await postcss([ instance ]).process(css);

  result.warnings().forEach(
    function (warning) {
      console.warn(warning.toString());
    }
  );

  return result.css;
};

async function build(content, options) {
    return new Promise(function (resolve, reject) {
        stylus(
          content
        )
        .set('paths', options.paths)
        .set('filename', options.filename)
        .set('compress', options.release)
        .define('url', stylus.resolver({
          paths: options.paths
        }))
        .use(rider())
        .render(function (error, output) {
          if (error) {
            reject(error);
          }
          resolve(output);
          // autoPrefixer(output, options.filename)
          //   .then(function (content) {
          //     resolve(content);
          //   });
        });
    });
};

module.exports = function(source) {
  const options = loaderUtils.getOptions(this);

  options.filename = this.resourcePath;

  let callback = this.async();

  build(source, options).then((result) => {
    callback(null, `module.exports = \`${result}\`;`);
  }).catch((error) => {
    callback(error, error.toString());
  });
};