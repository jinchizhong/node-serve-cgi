var assert = require('assert');

var req1 = {
  method: 'GET',
  url: '/aaa/bbb?q=hello',
  httpVersion: '1.1',
  connection: {
    remoteAddress: '127.0.0.1',
    remotePort: 12345,
    localPort: 80
  },
  headers: {
    host: 'example.org',
    authorization: 'Basic xxxx',
    accept: 'text/html',
    'accept-encoding': 'gzip, deflate, sdch'
  }
};

describe('req2env', function () {
  it('req1', function () {
    var cgi = require('../lib/index')({env: {XXX: 'aaa'}});
    var env = cgi.req2env(req1, '/cgi/export.sh', __dirname);
    
    assert.equal(env.GATEWAY_INTERFACE, 'CGI/1.1');
    assert.equal(env.SERVER_PROTOCOL, 'HTTP/1.1');
    assert(env.SERVER_SOFTWARE.match(/node-serve-cgi/));

    assert.equal(env.SCRIPT_NAME, '/cgi/export.sh');
    assert.equal(env.SCRIPT_FILENAME, __dirname + '/cgi/export.sh');
    assert.equal(env.DOCUMENT_ROOT, __dirname);

    assert.equal(env.REQUEST_METHOD, 'GET');
    assert.equal(env.REQUEST_URI, '/aaa/bbb?q=hello');
    assert.equal(env.QUERY_STRING, 'q=hello');

    assert.equal(env.REMOTE_ADDR, '127.0.0.1');
    assert.equal(env.REMOTE_PORT, 12345);
    assert.equal(env.SERVER_PORT, 80);

    assert.equal(env.SERVER_NAME, 'example.org');
    assert.equal(env.AUTH_TYPE, 'Basic');

    assert.equal(env.HTTP_HOST, 'example.org');
    assert.equal(env.HTTP_ACCEPT, 'text/html');
    assert.equal(env.HTTP_ACCEPT_ENCODING, 'gzip, deflate, sdch');

    assert.equal(env.XXX, 'aaa');
  });
});
