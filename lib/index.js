var extend = require('extend');
var spawn = require('child_process').spawn;
var info = require('../package.json');
var async = require('async');
var fs = require('fs');
var path = require('path');
var url = require('url');

var default_options = {
  stderr: function(data) {
    process.stdout.write(data);
  },

  mount: null,
  root: process.env.DOCUMENT_ROOT || process.cwd(),
  cwd: null,
  indexes: [],
  roles: {
  },
  env: {},
  redirect_dir: true,

  decorator: function(res, headers, body, done) {
    done(res, headers, body);
  },

  logger: console.log
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
  if (opts.mount != null) {
    opts.mount = opts.mount.replace(/\/$/, '');
  }
  opts.root = path.join(opts.root, '.');
  opts.cwd = opts.cwd || opts.root;

  var obj = function() {
    return obj.handle.apply(this, arguments);
  };
  obj.run = function(cmd, cwd, env, body, cb) {
    var stdout = [];
    var stderr = [];
    var p = spawn(cmd[0], cmd.slice(1), {cwd: cwd, env: env});
    p.stdout.on('data', function(data) {
      stdout.push(data);
    });
    p.stderr.on('data', function(data) {
      stderr.push(data);
      opts.stderr(data);
    });
    if (body) {
      p.stdin.write(body);
    }
    p.stdin.end();
    p.on('close', function (code) {
      cb(code, stdout.join(''), stderr.join(''));
    });
  };
  obj.req2env = function(req, script, root) {
    // req is an instance of http.IncomingMessage
    // for more details: https://nodejs.org/api/http.html#http_http_incomingmessage
    // used fields: method, originalUrl, httpVersion, connection, headers

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
    env.QUERY_STRING = url.parse(req.originalUrl).query || '';
    env.REMOTE_ADDR = req.connection.remoteAddress;
    env.REMOTE_PORT = req.connection.remotePort; // non-standard
    // ignore REMOTE_HOST
    // ignore REMOTE_IDENT
    // ignore REMOTE_USER
    env.REQUEST_METHOD = req.method;
    env.REQUEST_URI = req.originalUrl;
    env.SCRIPT_NAME = script;
    env.SCRIPT_FILENAME = root + script; // non-standard
    env.DOCUMENT_ROOT = root; // non-standard
    env.SERVER_NAME = (req.headers.host || '').split(':')[0];
    env.SERVER_PORT = req.headers.host ? (req.headers.host.split(':')[1] || '80') : req.connection.localPort;
    env.SERVER_PROTOCOL = "HTTP/" + req.httpVersion;
    env.SERVER_SOFTWARE = 'node-' + info.name + '/' + info.version;
    env.REDIRECT_STATUS = 200; // non-standard, php-cgi required

    for (var h in req.headers) {
      if (req.headers.hasOwnProperty(h)) {
        env['HTTP_' + h.toUpperCase().replace(/-/g, '_')] = req.headers[h];
      }
    }

    return extend(env, opts.env);;
  };
  var match_result = function(fpath, fstats, role) {
    return {
      fpath: fpath.slice(opts.root.length),
      isDirectory: fstats.isDirectory(),
      isFile: fstats.isFile(),
      isExecutable: isExecutable(fstats.mode, fstats.gid, fstats.uid),
      role: role,
      cgibin: opts.roles[role],
      cmd: [ opts.roles[role], fpath ]
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
    async.eachSeries(opts.indexes, function(index, next) {
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
    var sub = path.slice(root.length);
    var fpath = opts.root + sub;
    fs.stat(fpath, function (err, stats) {
      if (err) {
        done();
      } else {
        match_file(fpath, stats, done);
      }
    });
  };
  obj.parseOutput = function(stdout) {
    var lines = stdout.replace(/\r\n/g, '\n').split('\n');
    var headers = {};
    while (lines) {
      var x = lines.shift();
      var m = x.match(/^(.*?):(.*)$/);
      if (m) {
        headers[m[1].toLowerCase().replace(/^\s+|\s+$/, '')] = m[2].replace(/^\s+|\s+$/, '');
      } else if (x === '') {
        return [headers, lines.join('\n')];
      } else {
        return [{}, stdout];
      }
    }
    return [{}, stdout];
  };
  obj.send = function(res, headers, body) {
    if (headers.status) {
      res.status(headers.status);
      delete headers.status;
    }
    for (var h in headers) {
      if (headers.hasOwnProperty(h)) {
        res.set(h, headers[h]);
      }
    }
    res.send(body);
  }
  obj.respone = function(res, code, stdout, stderr, env) {
    if (code === 0) {
      var x = obj.parseOutput(stdout);
      opts.decorator(res, x[0], x[1], obj.send);
    } else {
      var headers = {
        status: '500 Internal Server Error',
        'content-type': 'text/plain'
      };
      var body;
      if (res.app.get('env') === 'development') {
        body = 'CGI Error!\n\n' + 'stdout:\n' + stdout.replace(/(^|\n)/g, '$1    ') + 
                                '\nstderr:\n' + stderr.replace(/(^|\n)/g, '$1    ') + '\nenvironments:\n';
        for(var e in env) {
          if (env.hasOwnProperty(e)) {
            body = body + '    ' + e + ': ' + env[e] + '\n';
          }
        }
      } else {
        body = 'CGI Error!';
      }
      opts.decorator(res, headers, body, obj.send);
    }
  };
  obj.handle = function(req, res, next) {
    var mount = (opts.mount != null) ? opts.mount : req.baseUrl;
    if (req.originalUrl.replace(/\?.*/, '') === mount) {
      res.redirect(req.originalUrl.replace(/(\?.*)|$/, '/$1'));
      return;
    }
    if (req.originalUrl.slice(0, mount.length + 1) !== mount + '/') {
      next();
      return;
    }
    obj.match(url.parse(req.originalUrl.slice(mount.length)).pathname, function(matched) {
      if (matched) {
        if (matched.isDirectory) {
          res.redirect(req.originalUrl.replace(/(\?.*)|$/, '/$1'));
        } else {
          var env = obj.req2env(req, matched.fpath, opts.root);
          if (req.rawBody === undefined) {
            console.log('missing req.rawBody, POST requests not work!');
            console.log('see: https://github.com/jinchizhong/express-grab-body for more details.');
          }
          obj.run(matched.cmd, opts.cwd, env, req.rawBody, function(code, stdout, stderr) {
            obj.respone(res, code, stdout, stderr, env);
          });
        }
      } else {
        next();
      }
    });
  };

  return obj;
}

