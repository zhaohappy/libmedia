var fs = require('fs');
var path = require('path');

exports.port = 9000;
exports.protocol = 'http';
exports.tlsOptions = {
  key: fs.readFileSync(path.join(__dirname, './test/key.pem')),
  cert: fs.readFileSync(path.join(__dirname, './test/cert.pem'))
};
exports.directoryIndexes = true;
exports.documentRoot = __dirname;
exports.getLocations = function () {
  return [
    {
      location: /.html$/,
      handler: [
        file(),
        proxyNoneExists(),
        function (context) {
          var header = context.header;
          header['Cross-Origin-Embedder-Policy'] = 'require-corp';
          header['Cross-Origin-Opener-Policy'] = 'same-origin';
          header['Cross-Origin-Embedder-Policy-Report-Only'] = 'true';
        }
      ]
    },
    {
      location: /.js$/,
      handler: [
        file(),
        proxyNoneExists(),
        function (context) {
          var header = context.header;
          header['Cross-Origin-Embedder-Policy'] = 'require-corp';
        }
      ]
    },
    {
      location: /.wasm$/,
      handler: [
        file(),
        proxyNoneExists(),
        function (context) {
          var header = context.header;
          header['Content-Type'] = 'application/wasm';
        }
      ]
    },
    {
      location: /^.*$/,
      handler: [
        file(),
        proxyNoneExists(),
        function (context) {
          var header = context.header;
          header['Access-Control-Allow-Origin'] = '*';
          header['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS';
          header['Content-Length'] = context.content.length;
          if (context.request.method === 'OPTIONS' || context.request.method === 'HEAD') {
            header['X-Content-Length'] = context.content.length;
            context.content = null;
          }
          else {
            let range = context.request.rawHeaders.find((value) => {
              return value.indexOf('bytes=') >= 0;
            });
            if (range) {
              range = range.replace('bytes=', '');
              let start = Math.max(+range.substr(0, range.lastIndexOf('-')), 0);
              let endStr = range.substr(range.lastIndexOf('-') + 1);
              let end = endStr ? Math.min(+endStr, context.content.length - 1) : context.content.length;
              context.content = context.content.slice(start, end + 1);
              header['Content-Length'] = context.content.length;
            }
          }
        }
      ]
    }
  ];
};


exports.injectResource = function ( res ) {
  for ( var key in res ) {
    global[ key ] = res[ key ];
  }
};
