var assert = require('assert');

var cgi = require('../lib/index')({
  root: __dirname,
  roles: {
    '.sh': '/bin/sh',
    '.js': '/usr/bin/node'
  },
  indexes: ['index.sh']
});

describe('match', function (){
  it('file', function(done) {
    cgi.match('/scripts/export.sh', function (result) {
      assert.equal(result.fpath, '/scripts/export.sh');
      assert.equal(result.isDirectory, false);
      assert.equal(result.isFile, true);
      assert.equal(result.isExecutable, true);
      assert.equal(result.role, '.sh');
      assert.equal(result.cgibin, '/bin/sh');
      done();
    });
  });
  it('file non executable', function(done) {
    cgi.match('/self.js', function (result) {
      assert.equal(result.fpath, '/self.js');
      assert.equal(result.isDirectory, false);
      assert.equal(result.isFile, true);
      assert.equal(result.isExecutable, false);
      assert.equal(result.role, '.js');
      assert.equal(result.cgibin, '/usr/bin/node');
      done();
    });
  });
  it('directory', function(done) {
    cgi.match('/cgi', function (result) {
      assert.equal(result.fpath, '/cgi');
      assert.equal(result.isDirectory, true);
      assert.equal(result.isFile, false);
      done();
    });
  });
  it('directory/ + has index', function(done) {
    cgi.match('/cgi/', function (result) {
      assert.equal(result.fpath, '/cgi/index.sh');
      assert.equal(result.isDirectory, false);
      assert.equal(result.isFile, true);
      done();
    });
  });
  it('directory/ + no index', function(done) {
    cgi.match('/scripts/', function (result) {
      assert.equal(result, null);
      done();
    });
  });
  it('not exists', function(done) {
    cgi.match('/not_exists', function (result) {
      assert.equal(result, null);
      done();
    });
  });
});
