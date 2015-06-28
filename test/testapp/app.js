var express = require('express');
var cgi = require('../../lib/index')({
  root: __dirname + '/..',
  roles: {
    '.sh': '/bin/sh'
  }
});

var app = express();
app.use(cgi);

app.listen(3000);
