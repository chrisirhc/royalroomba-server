var sys = require('sys'),
http = require('http'),
io = require('socket.io'),
express = require('express'),
amqp = require('amqp'),
logg = "";
/*
socket.on('clientMessage', function(message) {
  console.log(message);
});
*/

var connection = amqp.createConnection({ host: 'localhost' });
// Wait for connection to become established.
connection.addListener('ready', function () {
  console.log("Ready for amqp messages");
  // Create a queue and bind to all messages.
  // Use the default 'amq.topic' exchange
  var q = connection.queue('x');
  // Catch all messages
  q.bind('roomba1');

  // Receive messages
  q.subscribe(function (message) {
    // Print messages to stdout
    console.log(message);
  });

  var ex = connection.exchange();
  ex.publish("roomba-collide-1", "BUMP_LEFT");

  // ex.publish("roomba-enemy-1", "10,200,100");
  // ex.publish("roomba-sensorin-1", "horn");
  /*
  ex.publish("roomba1", "byebye");
  ex.publish("boo", "never");
  var tester = connection.exchange("tester", {type: "direct"});
  tester.publish("one", "never");
  var abc = connection.exchange("amq.topic");
  abc.publish("aoeu.hah", "another");
  */
});
