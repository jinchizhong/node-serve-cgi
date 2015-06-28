var extend = require('extend');
var spawn = require('child_process').spawn;
var info = require('../package.json');
var async = require('async');
var fs = require('fs');
var path = require('path');

var default_options = {
  stderr: console.log,

  mount: '/',
  root: process.env.DOCUMENT_ROOT || process.cwd(),
  index: [],
  roles: {
  },
  redirect_dir: true
};

// copy from https://github.com/kevva/executable/blob/master/index.js
function isExecutable(mode, gid, uid) {
  if (process.platform === 'win32') {
    return true;
  }

  return (mode & parseInt('0001', 8)) ||
    (mode & parseInt('0010', 8)) && process.getgid && gid === process.getgid() ||
    (mode & parseInt('0100', 8)) && process.getuid && uid === process.getuid();
}

module.exports = function(opts) {
  opts = extend({}, default_options, opts);
  opts.root = opts.root.replace(/\/$/, '');
  opts.mount = opts.mount.replace(/\/$/, '');

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
    env.SCRIPT_NAME = script;
    env.SCRIPT_FILENAME = root + script; // non-standard
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
  var match_result = function(fpath, fstats, role) {
    return {
      fpath: fpath,
      isDirectory: fstats.isDirectory(),
      isFile: fstats.isFile(),
      isExecutable: isExecutable(fstats.mode, fstats.gid, fstats.uid),
      role: role,
      cgibin: opts.roles[role]
    };
  };
  var match_role = function(fpath, stats, done) {
    for(var role in opts.roles) {
      if (opts.roles.hasOwnProperty(role)) {
        if (fpath.slice(fpath.length - role.length) === role) {
          done(match_result(fpath, stats, role));
          return;
        }
      }
    }
    done(null);
  };
  var match_index = function(dir_path, done) {
    async.eachSeries(opts.index, function(index, next) {
      var fpath = path.join(dir_path, index);
      fs.stat(fpath, function (err, stats) {
        if (err) {
          next();
        } else {
          if (stats.isFile()) {
            next([fpath, stats]);
          } else {
            next();
          }
        }
      });
    }, function(result) {
      result ? done(result[0], result[1]) : done();
    });
  };
  var match_file = function(fpath, fstats, done) {
    if (fstats.isDirectory()) {
      if (fpath.match(/\/$/) || !opts.redirect_dir) {
        match_index(fpath, function(index_path, index_fstats) {
          if (index_path) {
            match_role(index_path, index_fstats, done);
          } else {
            done(null);
          }
        });
      } else {
        done(match_result(fpath, fstats, null));
      }
    } else {
      match_role(fpath, fstats, done);
    }
  }
  obj.match = function(path, done) {
    if (path === opts.mount || path.slice(0, opts.mount.length + 1) === opts.mount + '/') {
      var sub = path.slice(root.length);
      var fpath = opts.root + sub;
      fs.stat(fpath, function (err, stats) {
        if (err) {
          done();
        } else {
          match_file(fpath, stats, done);
        }
      });
    } else {
      done();
    }
  };
  obj.handle = function(req, res, next) {
    throw 'todo...';
  };

  return obj;
}

