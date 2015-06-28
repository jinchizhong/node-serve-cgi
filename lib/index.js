var extend = require('extend');
var spawn = require('child_process').spawn;

var default_options = {
  stderr: console.log,

  index: [],
  redirect_dir: true
};

module.exports = function(opts) {
  opts = extend({}, default_options, opts);

  var obj = function() {
    return obj._handle.apply(this, arguments);
  };
  obj._handle = function(req, res, next) {
    throw 'todo...';
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

  return obj;
}
