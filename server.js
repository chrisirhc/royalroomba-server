var sys = require('sys'),
http = require('http'),
io = require('socket.io'),
express = require('express'),
amqp = require('amqp'),
logg = "",

/** Express Server **/
serv = express.createServer(
  express.staticProvider(__dirname),
  function (req, res) {
    res.writeHead(200, {'Content-Type': 'text/html'});
    res.write('<a href="live.html">Live feed</a>\n<a href="control.html">Controls</a>');
    res.write('<h1>Raw log</h1>' + logg);
    res.end();
  }
);

/** Listen to port 3000 **/
serv.listen(3000);

/** Setup controls **/
var controllerSocket = io.listen(serv, {
  resource: 'socket.io-controller'
});

/** Assume that AMQP server resides locally **/
var connection = amqp.createConnection({ host: 'localhost' });

/**
 Wait for connection to become established before setting up sockets.
 **/
connection.addListener('ready', function () {
  console.log("Ready for amqp messages");
  // Create a queue and bind to all messages.
  // Use the default 'amq.topic' exchange
  var q = connection.queue('a');
  // Catch all messages in the default exchange for logging
  q.bind('amq.topic', '#');

  // Receive messages
  q.subscribe(function (message) {
    console.log("Received amqp message: " + sys.inspect(message));
    logg += ("Received amqp message: " + sys.inspect(message)) + "<br />";
    // Print messages to stdout
    controllerSocket.broadcast("AMQP: " + message.data.toString());
  });

  var ex = connection.exchange("amq.topic");
  // ex.publish("aoeu", "hello");

  // socket.io for controllers
  controllerSocket.on('connection', function (client) {
    /** Get the roomba number from the resource url **/
    var roombaNo = client.request.url
      .replace("/socket.io-controller-", "")
      .replace(/\/.*$/, "");
    var routingKey = "roomba" + roombaNo;

    // new client is here!
    client.on('message', function (message) {
      // console.log(message);
      logg += message + "<br/>";
      switch(message) {
        case "sf":
        controllerSocket.broadcast("Accelerate");
        ex.publish(routingKey, "ACCELERATE");
        break;
        /*
         case "ef":
         socket.broadcast("Stop Accelerate");
         break;
         */
        case "sb":
        controllerSocket.broadcast("Deccelerate (Reverse)");
        ex.publish(routingKey, "DECELERATE");
        break;
        /*
         case "eb":
         socket.broadcast("Deccelerate");
         break;
         */
        case "sl":
        controllerSocket.broadcast("Turn Left");
        ex.publish(routingKey, "TURN_LEFT");
        break;
        case "sr":
        controllerSocket.broadcast("Turn Right");
        ex.publish(routingKey, "TURN_RIGHT");
        break;
        case "su":
        controllerSocket.broadcast("Restart Engine");
        ex.publish(routingKey, "RESET");
        default:
        controllerSocket.broadcast("Unused message: " + message);
        break;
      }
    }) 
    client.on('disconnect', function(){
    }) 
  }); 
});
