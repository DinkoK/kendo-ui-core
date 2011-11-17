#!/usr/bin/env node

var http       = require("http"),
    faye       = require("faye"),
    static     = require("node-static"),
    path       = require("path"),
    fs         = require("fs"),
    builder = require("xmlbuilder"),
    WEBROOT    = path.dirname(__filename),
    bayeux     = new faye.NodeAdapter({mount: "/faye", timeout: 100000});

var fileServer = new static.Server(WEBROOT);

var server = http.createServer(function(request, response) {
    request.addListener('end', function (argument) {
        fileServer.serve(request, response);
    });
});

bayeux.attach(server);

server.listen(8080);

function log(statCode, url, ip, err) {
    var logStr = statCode + ' - ' + url + ' - ' + ip;

    if (err) {
        logStr += ' - ' + err;
    }
    console.log(logStr);
}
