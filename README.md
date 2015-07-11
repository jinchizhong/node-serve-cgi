#node-serve-cgi

Serve cgi by express or node

Install
-------

    npm install serve-cgi

Usage
-----

    var app = require('express')();
    var cgi = require('serve-cgi')({
      root: __dirname + '/cgi-bin',
      roles: {
        '.php': '/usr/bin/php5-cgi',
        '.sh': '/bin/sh'
      },
      indexes: ['index.php', 'index.sh']
    });

    app.use('/cgi-bin', cgi);

    // dir structure
    //  app.js
    //  cgi-bin/
    //  └── index.php

Options
-------

`root`: (default: `process.env.DOCUMENT_ROOT || process.cwd`) The root of cgi dir.
Notice: express will transfor url automaticly, for example:

    app.use('/cgi-bin', cgi)
    // 127.0.0.1/cgi-bin/hello.sh  =>  #{root}/hello.sh

    app.use(cgi)
    // 127.0.0.1/cgi-bin/hello.sh  =>  #{root}/cgi-bin/hello.sh

`indexes`: (default: empty) An array of index filenames, when a directory is matched serve-cgi will try them in order. 
If none of index exists, serve-cgi will do nothing(jump to next middleware, if no middleware deal it, then 404)

`roles`: As you see in `Usage`

`redirect_dir`: (default `true`) If this is `true`, when you access 127.0.0.1/cgi/dir, you will jump to 127.0.0.1/cgi/dir/.
This will be help in most case.

`decorator`: (default: do nothing) After cgi is invoked, you can decorate the result of cgi. 
For example, use layout decared in node.

    // default implement
    var decorator = function(headers, body, done) {
      // headers is an Object
      // headers.status is cgi status
      // headers['content-type'] is content-type
      // take care here, do not decorate binary data
      done(headers, body);
    };

`env`: (default: {}) Set custom env into cgi, envs here has high priority. for example you can cover DOCUMENT\_ROOT here.

`logger`: (default: console.log) Where to output logs about serve-cgi.
`stderr`: (default: process.stdout.write) Where to output stderr of cgi.
