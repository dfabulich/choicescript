"use strict";

const http = require('http');
const path = require('path');
const {URL} = require('url');
const fs = require('fs');
const child_process = require('child_process');

const dir = __dirname;

let base;

const mimeTypes = {
  '.html': 'text/html',
  '.htm': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.txt': 'text/plain',
}

const requestHandler = (request, response) => {
  //console.log(request.url);
  const requestUrl = new URL(request.url, base);
  const requestPath = requestUrl.pathname;
  let requestFile = path.normalize(`${dir}/${requestPath}`);
  if (!requestFile.startsWith(dir)) {
    response.statusCode = 400;
    response.end();
    return;
  } else if (requestFile.endsWith(path.sep)) {
    requestFile += 'index.html';
  }
  const stream = fs.createReadStream(requestFile);
  const streamError = e => {
    if (e.code === 'ENOENT') {
      response.statusCode = 404;
      response.end('File not found');
    } else if (e.code === 'EISDIR') {
      response.statusCode = 301;
      response.setHeader('Location', requestUrl.pathname + '/');
      response.end();
    } else {
      response.statusCode = 500;
      response.end('Error loading file');
      console.log(e);
    }
  };
  stream.on('error', streamError);
  const mimeType = mimeTypes[path.extname(requestFile).toLowerCase()];
  if (mimeType) {
    response.setHeader('Content-Type', mimeType);
  }
  response.setHeader('Cache-Control', 'max-age=0');
  stream.pipe(response);
}

const server = http.createServer(requestHandler);

function openUrl(url) {
  switch(process.platform) {
    case "win32": {
      child_process.execFile('cmd', ['/c', 'start', '""', url.replace(/&/g, "^&")]);
      break;
    }
    case "darwin": {
      child_process.execFile('open', [url]);
      break;
    }
  }
}

server.listen({port: 0, host:'127.0.0.1'}, (err) => {
  base = `http://localhost:${server.address().port}`;
  console.log(`server is ready: ${base}`);
  console.log(`Press Ctrl-C or close this window to stop the server`);
  openUrl(base);
})