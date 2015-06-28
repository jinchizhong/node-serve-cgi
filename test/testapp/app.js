var express = require('express');
var cgi = require('../../lib/index')({
  root: __dirname + '/../cgi',
  roles: {
    '.sh': '/bin/sh'
  },
  indexes: ['index.sh']
});

var app = express();
app.use('/cgi', cgi);

app.listen(3000);
