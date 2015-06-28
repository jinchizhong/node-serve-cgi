var assert = require('assert');

describe('cgi', function() {
  it('run', function(done) {
    var cgi = require('../lib/index')({});

    cgi.run([__dirname + '/scripts/export.sh'], __dirname, {}, function(code, stdout) {
      assert.equal(code, 0);
      assert.equal(stdout, 'export PWD=\'/home/jcz/src/serve-cgi/test\'\n');
      done();
    });
  });

  it('error', function(done) {
    var err_cover = false;

    var cgi = require('../lib/index')({stderr: function(data) {
      assert.equal(data, 'test\n');
      err_cover = true;
    }});
    cgi.run([__dirname + '/scripts/error.sh'], __dirname, {}, function(code, stdout) {
      assert.equal(code, 1);
      assert.equal(stdout, '');
      assert(err_cover);
      done();
    });
  });
});
