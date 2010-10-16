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
    res.write('<a href="live.html">Live feed</a>\n<a href="control.html">Controls</a>');
    res.write('<h1>Raw log</h1>' + logg);
    res.end();
  }
);

serv.listen(3000);

var socket = io.listen(serv); 

/** Assume that AMQP server resides locally **/
var connection = amqp.createConnection({ host: 'localhost' });
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
    console.log("Received amqp message: " + sys.inspect(message));
    logg += ("Received amqp message: " + sys.inspect(message)) + "<br />";
    // Print messages to stdout
    socket.broadcast("AMQP: " + message.data.toString());
  });

  var ex = connection.exchange("amq.topic");
  // ex.publish("aoeu", "hello");

  // socket.io 
  socket.on('connection', function (client){
    // new client is here!
    client.on('message', function (message){
      // console.log(message);
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
        case "su":
        socket.broadcast("Restart Engine");
        ex.publish("roomba1", "RESET");
        default:
        socket.broadcast("Unused message: " + message);
        break;
      }
    }) 
    client.on('disconnect', function(){
    }) 
  }); 
});
