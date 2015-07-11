var request = require('supertest');
var express = require('express');

var app = express();
app.use('/cgi', require('../lib/index')({
  root: __dirname + '/cgi',
  cwd: '/home',
  roles: {
    '.sh': '/bin/sh'
  }
}));

describe('express', function() {
  it('get /cgi/export.sh', function(done) {
    request(app)
      .get('/cgi/export.sh')
      .expect(200, done);
  });
  it('test cwd', function(done) {
    request(app)
      .get('/cgi/cwd.sh')
      .expect(200, '/home\n', done);
  });
});
