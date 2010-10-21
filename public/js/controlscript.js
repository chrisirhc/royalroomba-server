$(function () {
	var socket;
  var socketConnected = false;
  var socketRetryWait = 0;
  var connectAttemptTimeout = null;

  /** Set this later on as the roomba number **/
  var CONTROLLER_NUMBER = window.CONTROLLER_NUMBER || 1;
	
  window.WEB_SOCKET_SWF_LOCATION = '/lib/socketio/lib/vendor/web-socket-js/WebSocketMain.swf';
  socket = new io.Socket(location.hostname, {
    resource: 'socket.io-controller-' + CONTROLLER_NUMBER
  });
  socket.connect();
  socket.on('connect', function () {
    socketConnected = true;
    if (connectAttemptTimeout) {
      clearTimeout(connectAttemptTimeout);
      connectAttemptTimeout = null;
    }
  });
  socket.on('message', function (data) {
    var coords;
    /* Coord */
    if (data.indexOf("coord:") == 0) {
      coords = data.replace("coord:").split(",");
      setEnemyPosition(coords[0], coords[1]);
    }
  });
  socket.on('disconnect', function () {
    socketConnected = false;
    /** reconnect **/
    console.log("disconnected");
    connectAttempt();
  });

  function connectAttempt(wait) {
    console.log("Connection attempt");
    if(!socketConnected) {
      wait = wait*2 || 1000;
      /** exponential back-off **/
      connectAttemptTimeout = setTimeout(connectAttempt, wait, wait);
      socket.connect();
    }
  };
	
	// get the diplay div
	var display = $("#display");
	
	// function to send
	function sendCommand(c){
		// do something
		try{
			socket.send(c); 
		}catch(exception){
			alert(exception);
		}
	}
  /**
  s denotes start and e denotes end
  lfrb - left, front, right, back
  s - brake
  u - restart (reset engine)
  **/
	
	// Register keypress events on the whole document
	$(document).keydown(function(e){
		switch(e.keyCode){
			// User pressed "left" arrow
			case 37: display.text("Start Left"); sendCommand("sl");		break;
			// User pressed "up" arrow
			case 38: display.text("Start Forward");	sendCommand("sf");	break;
			// User pressed "right" arrow
			case 39: display.text("Start Right"); sendCommand("sr");	break;
			// User pressed "down" arrow
			case 40: display.text("Start Backward"); sendCommand("sb");	break;
			// User pressed "space"
			case 32: display.text("Invoke Brake"); sendCommand("ss");	break;
			// User pressed "r"
			case 82: display.text("Restart Engine"); sendCommand("su");	break;
		}
	});
	$(document).keyup(function(e){
		switch(e.keyCode){
			// User pressed "left" arrow
			case 37: display.text("Stop Left");	sendCommand("el");		break;
			// User pressed "up" arrow
			case 38: display.text("Stop Forward"); sendCommand("ef");	break;
			// User pressed "right" arrow
			case 39: display.text("Stop Right"); sendCommand("er");		break;
			// User pressed "down" arrow
			case 40: display.text("Stop Backward"); sendCommand("eb");	break;
			// User pressed "enter"
			case 32: display.text("Release Brake");	sendCommand("es");	break;
			// User pressed "r"
			case 82: display.text("Stop Restarting Engine"); sendCommand("eu");	break;
		}
	});

  var paper;
  var playingField;
  var circleMe;
  var circleEnemy;
  var width, height, radius;

  initMap(200,200,0,0);

  function initMap(width, height, enemyPositionX, enemyPositionY) {
    paper = Raphael("radar", width, height);
    radius = Math.min(width,height)/2;
    playingField = paper.circle(width/2, height/2, radius);
    playingField.attr({fill: "#000", opacity: 0.5});
    circleMe = paper.circle(width/2, height/2, 5);
    circleMe.attr("fill", "#17ee00");
    setEnemyPosition(enemyPositionX, enemyPositionY);
  }

  function setEnemyPosition(x,y){
    if(circleEnemy){
      circleEnemy.remove();
    }
    /** Check whether it's within the circle **/
    if(Math.sqrt(Math.pow(x,2),Math.pow(y,2))< radius) {
      circleEnemy = paper.circle(x+radius, y+radius, 5);
      circleEnemy.attr("fill", "red");
    }
  }
  $("#videofeed").append(
    $("<img/>")
    .attr("src", "http://" + location.hostname + ":" + (5080 + window.CONTROLLER_NUMBER) + "/")
    .attr("alt", "There is no video feed now.")
  );
});
