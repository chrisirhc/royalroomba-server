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

  // IDs
  var arr$hpval = {};
  var arr$hpbox = {};
  var arr$hplabel = {};
  var ROOMBAS = [1, 2];
  var x, a;
  for (a = ROOMBAS.length; a--; ) {
    x = ROOMBAS[a];
    arr$hplabel[x] = $("#roomba" + x + "-hp-container .hplabel");
    arr$hpbox[x] = $("#roomba" + x + "-hp-container .hpbox");
    arr$hpval[x] = $("#roomba" + x + "-hp-container .hpval");
  }
  var $speedval = $(".speedval");
  var $radar = $(".radar");
  var $hitscreen = $(".hitscreen");
  var $stunscreen = $(".stunscreen");
  var $speedbox = $(".speedbox");
  var $speedlabel = $(".speedlabel");
  var $timer = $("#timer span");

  var stunnedtimer = null;

  var countdownsounds;

  function countdown() {
    countdownsounds = [
      new Audio("/audio/3.ogg"),
      new Audio("/audio/2.ogg"),
      new Audio("/audio/1.ogg"),
      new Audio("/audio/go.ogg")
    ];
    console.log("countdown");
    countdownsounds[0].play();
    setTimeout(function () {
      countdownsounds[1].play();
    }, 1000);
    setTimeout(function () {
      countdownsounds[2].play();
    }, 2000);
    setTimeout(function () {
      countdownsounds[3].play();
    }, 3000);
  }

  socket.on('message', function (data) {
    var coords;
    /* Coord */
    var datatype = /^([^:]+):(.*)$/.exec(data);
    if (datatype != null) {
      data = datatype[2];
      datatype = datatype[1];
      switch (datatype) {
      // Minimap Coordinates
	  case "coord":
        coords = data.split(",");
        setEnemyPosition(parseInt(coords[0], 10)/20, parseInt(coords[1], 10)/20);
        // rotate the thing
        $radar.css({
          'transform': "rotate(" + coords[2] + "deg)",
          '-webkit-transform': "rotate(" + coords[2] + "deg)",
          '-moz-transform': "rotate(" + coords[2] + "deg)"
        });
      break;
      case "start":
        countdown();
        break;
      // Timer updates
      case "timer":
        $timer.text(data);
        break;
	  // Health updates
      case "hp":
         data = data.split("-");
      var roombaNo = data[0];
      data = data[1];
      var $hpwidth = parseFloat(data)/100.0 * arr$hpbox[roombaNo].width();
      arr$hplabel[roombaNo].text(data);
      arr$hpval[roombaNo].animate({ width: parseInt($hpwidth) }, 100);
      break;
	  // Speed updates
      case "speed":
		var $speedwidth = parseFloat(Math.abs(data))/500.0 * $speedbox.width();
		$speedlabel.text(data);
		$speedval.animate({ width: parseInt($speedwidth) }, 100);
      break;
    // Stunned animation
      case "stun":
        $stunscreen.animate({opacity: 0.7}, 300);
      if (stunnedtimer) {
        clearTimeout(stunnedtimer);
      }
      stunnedtimer = setTimeout(function () {
        $stunscreen.animate({opacity: 0}, 400);
      }, 800);
      break;
	  // Hit Animation
      case "imhit":
        $hitscreen.animate({opacity: 0.7});
      break;
    // End of hit
      case "imhitend":
        $hitscreen.stop(true).animate({opacity: 0});
      break;
	  // Death Animation
      case "death":
      $hitscreen.animate({opacity: 0.9});
      break;
      }
    }
  });
  socket.on('disconnect', function () {
    socketConnected = false;
    /** reconnect **/
    // console.log("disconnected");
    connectAttempt();
  });

  function connectAttempt(wait) {
    // console.log("Connection attempt");
    if(!socketConnected) {
      wait = wait*2 || 1000;
      /** exponential back-off **/
      connectAttemptTimeout = setTimeout(connectAttempt, wait, wait);
      socket.connect();
    }
  };
	
	// get the diplay div
	var $display = $(".display");
	
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
			case 37: $display.text("Start Left"); sendCommand("sl");		break;
			// User pressed "up" arrow
			case 38: $display.text("Start Forward");	sendCommand("sf");	break;
			// User pressed "right" arrow
			case 39: $display.text("Start Right"); sendCommand("sr");	break;
			// User pressed "down" arrow
			case 40: $display.text("Start Backward"); sendCommand("sb");	break;
			// User pressed "space"
			case 32: $display.text("Invoke Brake"); sendCommand("ss");	break;
			// User pressed "r"
			case 82: $display.text("Restart Engine"); sendCommand("su");	break;
		}
	});
	$(document).keyup(function(e){
		switch(e.keyCode){
			// User pressed "left" arrow
			case 37: $display.text("Stop Left");	sendCommand("el");		break;
			// User pressed "up" arrow
			case 38: $display.text("Stop Forward"); sendCommand("ef");	break;
			// User pressed "right" arrow
			case 39: $display.text("Stop Right"); sendCommand("er");		break;
			// User pressed "down" arrow
			case 40: $display.text("Stop Backward"); sendCommand("eb");	break;
			// User pressed "enter"
			case 32: $display.text("Release Brake");	sendCommand("es");	break;
			// User pressed "r"
			case 82: $display.text("Stop Restarting Engine"); sendCommand("eu");	break;
		}
	});

  var paper;
  var playingField;
  var circleMe;
  var circleEnemy;
  var width, height, radius;

  initMap(200,200,0,0);

  function initMap(widtharg, heightarg, enemyPositionX, enemyPositionY) {
    width = widtharg;
    height = heightarg;
    paper = Raphael($(".radar").get(0), width, height);
    radius = Math.min(width,height)/2;
    playingField = paper.circle(width/2, height/2, radius);
    playingField.attr({fill: "#666", opacity: 1.0});
    playingField.attr("stroke-width", 0);
    circleMe = paper.circle(width/2, height/2, 5);
    circleMe.attr({fill: "#17ee00", 'stroke-width': 0});
    setEnemyPosition(enemyPositionX, enemyPositionY);
  }

  function setEnemyPosition(x,y){
    if(circleEnemy){
      circleEnemy.remove();
    }
    /** Check whether it's within the circle **/
    if(Math.sqrt(Math.pow(x,2) + Math.pow(y,2)) < radius) {
      circleEnemy = paper.circle(x+radius, y+radius, 5);
      circleEnemy.attr({fill: "red", 'stroke-width': 0});
    }
  }

	var overlay = Raphael($(".radaroverlay").get(0), width, 200);
	var pie = overlay.g.piechart(width/2,height/2,radius,[15,85],{strokewidth: 0, colors:["none", "white"]});
	pie.attr("opacity", "0.3");

  $(".videofeed").append(
    $("<img/>")
    .attr("src", "/cam/" + window.CONTROLLER_NUMBER)
    .attr("alt", "There is no video feed now.")
  );
});
