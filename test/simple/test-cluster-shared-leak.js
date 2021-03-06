// On some platforms this test triggers an assertion in cluster.js.
// The assertion protects against memory leaks.
// https://github.com/nodejs/node/pull/3510

'use strict';
var common = require('../common');
var assert = require('assert');
var net = require('net');
var cluster = require('cluster');
cluster.schedulingPolicy = cluster.SCHED_NONE;

if (cluster.isMaster) {
  var conn, worker1, worker2;

  worker1 = cluster.fork();
  worker1.on('message', common.mustCall(function() {
    worker2 = cluster.fork();
    worker2.on('online', function() {
      conn = net.connect(common.PORT, common.mustCall(function() {
        worker1.disconnect();
        worker2.disconnect();
      }));
      conn.on('error', function(e) {
        // ECONNRESET is OK
        if (e.code !== 'ECONNRESET')
          throw e;
      });
    });
  }));

  cluster.on('exit', function(worker, exitCode, signalCode) {
    assert(worker === worker1 || worker === worker2);
    assert.strictEqual(exitCode, 0);
    assert.strictEqual(signalCode, null);
    if (Object.keys(cluster.workers).length === 0)
      conn.destroy();
  });

  return;
}

var server = net.createServer(function(c) {
  c.end('bye');
});

server.listen(common.PORT, function() {
  process.send('listening');
});
