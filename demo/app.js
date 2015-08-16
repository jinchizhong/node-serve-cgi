var express = require('express');
var bodyGrab = require('express-grab-body');
var cgi = require('../lib/index')({
  root: __dirname + '/../test/cgi',
  roles: {
    '.sh': '/bin/sh'
  },
  indexes: ['index.sh']
});

var app = express();
app.use(bodyGrab.init());
app.use(bodyGrab.grab());
app.use('/cgi', cgi);

app.listen(3000);
