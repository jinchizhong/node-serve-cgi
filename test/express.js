var request = require('supertest');
var express = require('express');

var app = express();
app.use('/cgi', require('../lib/index')({
  root: __dirname + '/cgi',
  cwd: '/home',
  indexes: ['index.sh'],
  roles: {
    '.sh': '/bin/sh'
  }
}));

describe('express', function() {
  it('get /cgi/export.sh', function(done) {
    request(app)
      .get('/cgi/export.sh')
      .expect(/REQUEST_URI='\/cgi\/export.sh'/)
      .expect(/SCRIPT_NAME='\/export.sh'/)
      .expect(200, done);
  });
  it('test cwd', function(done) {
    request(app)
      .get('/cgi/cwd.sh')
      .expect(200, '/home\n', done);
  });
  it('test redirect mount', function(done) {
    request(app)
      .get('/cgi?aaa=111')
      .expect('Location', '/cgi/?aaa=111')
      .expect(302, done);
  });
  it('test redirect subdir', function(done) {
    request(app)
      .get('/cgi/dir?aaa=111')
      .expect('Location', '/cgi/dir/?aaa=111')
      .expect(302, done);
  });
  it('test index', function(done) {
    request(app)
      .get('/cgi/dir/')
      .expect('cgi/dir/index.sh\n')
      .expect(200, done);
  });
});
