var extend = require('extend');
var spawn = require('child_process').spawn;
var info = require('../package.json');

var default_options = {
  stderr: console.log,

  mount: {
    '/': process.env.DOCUMENT_ROOT || process.cwd()
  },

  index: [],
  redirect_dir: true
};

module.exports = function(opts) {
  opts = extend({}, default_options, opts);

  var obj = function() {
    return obj.handle.apply(this, arguments);
  };
  obj.run = function(cmd, cwd, env, cb) {
    var stdout = [];
    var p = spawn(cmd[0], cmd.slice(1), {cwd: cwd, env: env});
    p.stdout.on('data', function(data) {
      stdout.push(data);
    });
    p.stderr.on('data', opts.stderr);
    p.on('close', function (code) {
      cb(code, stdout.join(''));
    });
  };
  obj.req2env = function(req, script, root) {
    // req is an instance of http.IncomingMessage
    // for more details: https://nodejs.org/api/http.html#http_http_incomingmessage
    // used fields: method, url, httpVersion, connection, headers

    var script_filename = script[0] === '/' ? script : root + '/' + script;
    var script_name = script_filename.slice(0, root.length) === root ? 
                                    script_filename.slice(root.length) : script_filename;

    var env = {};

    // CGI Variants
    if (req.headers.authorization) {
      env.AUTH_TYPE = req.headers.authorization.split(' ')[0];
    }
    if (req.headers['content-length']) {
      env.CONTENT_LENGTH = req.headers['content-length'];
    }
    if (req.headers['content-type']) {
      env.CONTENT_TYPE = req.headers['content-type'];
    }
    env.GATEWAY_INTERFACE = 'CGI/1.1';
    // ignore PATH_INFO
    // ignore PATH_TRANSLATED
    env.QUERY_STRING = req.url.replace(/.*\?/, '');
    env.REMOTE_ADDR = req.connection.remoteAddress;
    env.REMOTE_PORT = req.connection.remotePort; // non-standard
    // ignore REMOTE_HOST
    // ignore REMOTE_IDENT
    // ignore REMOTE_USER
    env.REQUEST_METHOD = req.method;
    env.REQUEST_URI = req.url;
    env.SCRIPT_NAME = script_name;
    env.SCRIPT_FILENAME = script_filename; // non-standard
    env.DOCUMENT_ROOT = root; // non-standard
    env.SERVER_NAME = (req.headers.host || '').split(':')[0];
    env.SERVER_PORT = req.connection.localPort;
    env.SERVER_PROTOCOL = "HTTP/" + req.httpVersion;
    env.SERVER_SOFTWARE = 'node-' + info.name + '/' + info.version;

    for (var h in req.headers) {
      if (req.headers.hasOwnProperty(h)) {
        env['HTTP_' + h.toUpperCase().replace(/-/g, '_')] = req.headers[h];
      }
    }

    return env;
  };
  obj.handle = function(req, res, next) {
    throw 'todo...';
  };

  return obj;
}
