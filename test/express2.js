var request = require('supertest');
var express = require('express');

var app = express();
app.use('/cgi', require('../lib/index')({
  mount: '/',
  root: __dirname,
  indexes: ['index.sh'],
  roles: {
    '.sh': '/bin/sh'
  }
}));

describe('express2', function() {
  it('get /cgi/export.sh', function(done) {
    request(app)
      .get('/cgi/export.sh')
      .expect(/REQUEST_URI='\/cgi\/export.sh'/)
      .expect(/SCRIPT_NAME='\/cgi\/export.sh'/)
      .expect(200, done);
  });
});
