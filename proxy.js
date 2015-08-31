//!#/usr/bin/env node

var http = require('http');
var https = require('https');
var url = require('url');
var util = require('util');
var fs  = require('fs');
var net = require('net');

var options = {
  key:  fs.readFileSync('./key.pem', 'utf8'),
  cert: fs.readFileSync('./server.crt', 'utf8'),
  ca:   fs.readFileSync('./ca.crt','utf8'),
  requestCert:true,
  rejectUnauthorized:false
};


var httpServer = http.createServer(proxyEntry);
var httpsServer = http.createServer(proxyEntry);

function proxyEntry(req, resp){
  //console.log('http.............',req.url);
  var requrl = url.parse(req.url);

  //console.log(req.method);
  var webheader = JSON.parse(JSON.stringify(req.headers));
  var hoststr = webheader['host'];
  delete webheader.host;
  var weboutreq = {host:hoststr,headers:webheader,path:requrl['path']};
  //console.log(weboutreq);
  var httpWebsite = http.request(weboutreq);
  /*write to web server*/
  req.pipe(httpWebsite);
  //httpWebsite.end();
  httpWebsite.on('response', function(webres){
    //util.log("%s",webres.headers.toString());
    resp.writeHead(webres.statusCode,webres.headers);
    webres.pipe(resp);

    webres.on('end', function(){
    //  console.log("website end, proxy is also end");
      /*close client */
      resp.end();
    });


    webres.on('error', function(err){
      console.log("client is close", client);
      resp.writeHead(400);
      resp.end();
    });

  });

  httpWebsite.on('error', function(err){
    console.log("error",err);
    console.log('stack',err.stack);
    resp.writeHead(400);
    resp.end();
  });

  httpWebsite.on('disconnect', function(client){
    console.log("client is close", client);
    resp.writeHead(400);
    resp.end();
  });

  resp.on('error', function(err){
    console.log('stack',err.stack);
    req.end();
    httpWebsite.end();
  });

  req.on('error', function(err){
    console.log('stack',err.stack);
    resp.end();
    httpWebsite.end();
  });


  /*req.on('end', function(sk){
    console.log('client is end',sk)
    //resp.end();
    //httpWebsite.end();
  });*/

}//entry over

function HttpsProxyEntry(req, resp){
  //console.log('https------------');
  console.log('url--',req.url);
  var requrl = url.parse(req.url);
  //console.log(requrl);
  var webheader = JSON.parse(JSON.stringify(req.headers));
  var hoststr = webheader['host'];
  delete webheader.host;
  var weboutreq = {host:hoststr,headers:webheader,path:requrl['path']};
  //console.log(weboutreq);
  var httpWebsite = https.request(weboutreq);
  /*write to web server*/
  req.pipe(httpWebsite);
  //httpWebsite.end();
  httpWebsite.on('response', function(webres){
    //console.log("%s",webres.headers.toString());
    resp.writeHead(webres.statusCode,webres.headers);
    webres.pipe(resp);

    webres.on('end', function(){
      console.log("https website end, proxy is also end");
      /*close client */
      resp.end();
    });
  });
    // body...

  httpWebsite.on('error', function(err){
    console.log("error",err);
    resp.writeHead(400);
    resp.end();
  });

  httpWebsite.on('disconnect', function(client){
    console.log("client is close", client);
    resp.writeHead(400);
    resp.end();
  });


}//https entry over

httpsServer.on('error', function(err){
  console.log('httpslayer',err);
  console.log(err.stack);
  //resp.end();
  //httpWebsite.end();
});

httpsServer.on('connect', function(request, socket, head){
  var requrl = url.parse(request.url);
  //console.log(request.url);
  var srvUrl = url.parse('https://' + request.url);
  var websiteSocket = net.connect(srvUrl.port, srvUrl.hostname, function() {
    socket.write('HTTP/1.1 200 Connection Established\r\n' +
                    'Proxy-agent: Node-Proxy\r\n' +
                    '\r\n');
    websiteSocket.write(head);
    websiteSocket.pipe(socket);
    socket.pipe(websiteSocket);

    websiteSocket.on('end', function(){
      socket.end();
    });
    websiteSocket.on('error', function(err){
      console.log(err);
      console.log('website', err.stack);
      socket.end();
    });

    socket.on('end', function(){
      websiteSocket.end();
    });
    socket.on('error', function(err){
      console.log(err);
      websiteSocket.end();
    });

  });

});

httpsServer.on('upgrade', function(request, socket, head){
  console.log('upgrade--',socket);
});

//debug("listen");
//httpServer.listen(9090);
httpsServer.listen(9090);

process.on('uncaughtException', function(err) {
  console.log('Caught exception: ' + err);
  console.log(util.inspect(err));
});
