var sys = require('sys'),
http = require('http'),
io = require('socket.io'),
express = require('express'),
amqp = require('amqp'),
logg = "",

serv = express.createServer(
  express.staticProvider(__dirname),
  function (req, res) {
    res.writeHead(200, {'Content-Type': 'text/html'});
    res.write('<h1>Hello world</h1>' + logg); 
    res.end();
  }
);

serv.listen(3000);

var socket = io.listen(serv); 

// server.listen(3000);


/*
socket.on('clientMessage', function(message) {
  console.log(message);
});
*/

var connection = amqp.createConnection({ host: 'www.vorce.net' });
// Wait for connection to become established.
connection.addListener('ready', function () {
  console.log("Ready for amqp messages");
  // Create a queue and bind to all messages.
  // Use the default 'amq.topic' exchange
  var q = connection.queue('a');
  // Catch all messages
  q.bind('#');
  /*
  q.bind('aoeu');
  q.bind('aoeu.*');
  */

  // Receive messages
  q.subscribe(function (message) {
    // Print messages to stdout
    console.log(message.data.toString());
  });

  var ex = connection.exchange();
  // ex.publish("aoeu", "hello");

  // socket.io 
  socket.on('connection', function(client){
    // new client is here! 
    client.on('message', function(message){
      console.log(message);
      logg += message + "<br/>";
      switch(message) {
        case "sf":
        socket.broadcast("Accelerate");
        ex.publish("roomba1", "ACCELERATE");
        break;
        /*
        case "ef":
        socket.broadcast("Stop Accelerate");
        break;
        */
        case "sb":
        socket.broadcast("Deccelerate (Reverse)");
        ex.publish("roomba1", "DECELERATE");
        break;
        /*
        case "eb":
        socket.broadcast("Deccelerate");
        break;
        */
        case "sl":
        socket.broadcast("Turn Left");
        ex.publish("roomba1", "TURN_LEFT");
        break;
        case "sr":
        socket.broadcast("Turn Right");
        ex.publish("roomba1", "TURN_RIGHT");
        break;
      }
    }) 
    client.on('disconnect', function(){
    }) 
  }); 
});
