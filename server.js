var sys = require('sys'),
http = require('http'),
io = require('socket.io'),
express = require('express'),
amqp = require('amqp'),
logg = "",
mpjegproxy = require('./lib/node-mjpeg-proxy'),

/** Express Server **/
serv = express.createServer();
serv.use(express.staticProvider(__dirname + '/public'));
serv.set('view engine', 'jade');
serv.get('/control/:id', function (req, res, next) {
  res.render("control.jade", {
    locals: {
      roombaId: req.params.id
    }
  });
  res.end();
  return;
});

/** Constants **/
var WEBCAMIPS =
[];
// ["192.168.2.1", ""];

serv.use(function (req, res) {
  res.writeHead(200, {'Content-Type': 'text/html'});
  res.write('<a href="live.html">Live feed</a>\n<a href="control/1">Control 1</a>\n<a href="control/2">Control 2</a>');
  res.write('<h1>Raw log</h1>' + logg);
  res.end();
});

/** Listen to port 3000 **/
serv.listen(3000);

/** Setup webcam, remember, these fail SILENTLY **/
try {
  for (var i = WEBCAMIPS.length; i--;) {
    mpjegproxy.createProxy("http://" + WEBCAMIPS[i] + ":8080/videofeed", {port: 5080 + i + 1});
  }
} catch(e) {
  console.log("Problem initialising feed");
}

/** Setup controls **/
var controllerSocket = io.listen(serv, {
  resource: 'socket.io-controller'
});

/** Assume that AMQP server resides locally **/
var connection = amqp.createConnection({ host: 'localhost' });

/** Timers for reducing the speed **/
var roombasToSlowDown = [];
var clientMap = {};
var roombaStates = {};
var Roomba = function Roomba() {
  /** Default hp **/
  this.hp = 100;
  /** From -500 to 500 **/
  this.speed = 0;

  /** Not sure what the start point should be but here goes nothing **/
  this.enemylocation = [0,0];

  /** Angle at which the roomba is oriented to **/
  this.angle = 0;
};

/** Assume that the roomba has been started **/
for (var i = 0; i < 2; i++) {
  roombaStates[i+1] = new Roomba();
}

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
    // console.log("Received amqp message: " + sys.inspect(message));
    console.log("AMQP: " + message.data.toString() + " - rk: " + message._routingKey);
    logg += ("Received amqp message: " + sys.inspect(message)) + "<br />";
    // Print messages to stdout
    controllerSocket.broadcast("AMQP: " + message.data.toString() + " - rk: " + message._routingKey);

    var messagerk = message._routingKey;
    var messagedata = message.data.toString();
    var client, roombaId, temp;

    var msgType = /^roomba-([^-]+)-([^-]+)/.exec(messagerk);

    if (msgType != null) {
      roombaId = msgType[2];
      msgType = msgType[1];
      client = clientMap[roombaId];

      switch (msgType) {
      /** Empty for now **/
      /** Initialise each roomba controller **/
      case "startup":
      case "enemy":
        temp = messagedata.split(",");
        /** Store the new coords **/
        roombaStates[roombaId].enemylocation[0] = temp[0];
        roombaStates[roombaId].enemylocation[1] = temp[1];
        roombaStates[roombaId].angle = temp[2];

        /** Relay **/
        if (client) {
          client.send("coord:" + messagedata);
        }
      break;
      case "speed":
        roombaStates[roombaId].speed[0] = messagedata;

        /** Remove it as it has gone to 0 **/
        if(messagedata == 0 && (temp = roombasToSlowDown.indexOf("roomba" + roombaId)) != -1) {
            roombasToSlowDown.splice(temp, 1);
        }

        /** Relay **/
        if (client) {
          client.send("speed:" + messagedata);
        }
      break;
      case "sensorout":
        switch (messagedata) {
        case "proxhit":
          ex.publish("roomba" + roombaId, "STUNSPIN");
          client && client.send("imhit");
        break;
        case "justhit"
          client && client.send("imhit");
        break;
        }
      break;
      default:
      }
    }
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
    clientMap[roombaNo] = client;

    /** Send the initialising info when connected **/
    if (roombaStates[roombaNo]) {
      client.send("hp:" + roombaStates[roombaNo].hp);
      client.send("speed:" + roombaStates[roombaNo].speed);
      client.send("coord:" + roombaStates[roombaNo].enemylocation.join(",") +
      "," + roombaStates[roombaNo].angle);
    }

    // new client is here!
    client.on('message', function (message) {
      var temp;
      logg += message + "<br/>";
      switch(message) {
        case "sf":
        controllerSocket.broadcast("Accelerate");
        ex.publish(routingKey, "ACCELERATE");
        /** Remove from roombas to slow down **/
        if ((temp = roombasToSlowDown.indexOf(routingKey)) != -1) {
          roombasToSlowDown.splice(temp, 1);
        }
        break;
        case "ef":
        /** Add to roombas to slow down **/
        if ((temp = roombasToSlowDown.indexOf(routingKey)) == -1) {
          roombasToSlowDown.push(routingKey);
        }
        break;
        /** Back accelerate down **/
        case "sb":
        controllerSocket.broadcast("Deccelerate (Reverse)");
        ex.publish(routingKey, "DECELERATE");
        /** Remove from roombas to slow down **/
        if ((temp = roombasToSlowDown.indexOf(routingKey)) != -1) {
          roombasToSlowDown.splice(temp, 1);
        }
        break;
        /** Back accelerate up **/
        case "sl":
        controllerSocket.broadcast("Turn Left");
        ex.publish(routingKey, "TURN_LEFT");
        if ((temp = roombasToSlowDown.indexOf(routingKey)) != -1) {
          roombasToSlowDown.splice(temp, 1);
        }
        break;
        case "sr":
        controllerSocket.broadcast("Turn Right");
        ex.publish(routingKey, "TURN_RIGHT");
        if ((temp = roombasToSlowDown.indexOf(routingKey)) != -1) {
          roombasToSlowDown.splice(temp, 1);
        }
        break;
        case "ss":
        controllerSocket.broadcast("E Brake");
        ex.publish(routingKey, "STOP");
        break;
        case "su":
        controllerSocket.broadcast("Restart Engine");
        ex.publish(routingKey, "RESET");
        break;
        case "sboost":
        controllerSocket.broadcast("Boost");
        ex.publish(routingKey, "BOOST");
        break;
        default:
        controllerSocket.broadcast("Unused message: " + message);
      }
    });
    client.on('disconnect', function(){
    });
  }); 

  /** Slow down the roombas that are moving **/
  var slowdownInterval = setInterval(function () {
    roombasToSlowDown.forEach(function (roombark) {
      ex.publish(roombark, "SLOW_DOWN");
    });
  }, 500);
});
