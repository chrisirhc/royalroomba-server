$(function () {
  window.WEB_SOCKET_SWF_LOCATION = '/lib/socketio/lib/vendor/web-socket-js/WebSocketMain.swf';

  roombaDisplay(1);
  roombaDisplay(2);

  function roombaDisplay(n) {
    var socket;
    var socketConnected = false;
    var socketRetryWait = 0;
    var connectAttemptTimeout = null;

    var $roomba = $("#roomba" + n);

    socket = new io.Socket(location.hostname, {
      resource: 'socket.io-controller-' + n
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
    var $hpval = $(".hpval", $roomba);
    var $speedval = $(".speedval", $roomba);
    var $radar = $(".radar", $roomba);
    var $hitscreen = $(".hitscreen", $roomba);
    var $hpbox = $(".hpbox", $roomba);
    var $speedbox = $(".speedbox", $roomba);
    var $hplabel = $(".hplabel", $roomba);
    var $speedlabel = $(".speedlabel", $roomba);

    socket.on('message', onMessage);

    function onMessage(data) {
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
          // Health updates
          case "hp":
            var $hpwidth = parseFloat(data)/100.0 * $hpbox.width();
          $hplabel.text($hpwidth);
          $hpval.animate({ width: parseInt($hpwidth) }, 100);
          break;
          // Speed updates
          case "speed":
            var $speedwidth = parseFloat(data)/500.0 * $speedbox.width();
          $speedlabel.text($speedwidth);
          $speedval.animate({ width: parseInt($speedwidth) }, 100);

          break;
          // Hit Animation
          case "imhit":
            $hitscreen.animate({opacity: 0.7}, undefined, undefined, function () {
            $hitscreen.animate({opacity: 0});
          });
          break;
          // Death Animation
          case "death":
            $hitscreen.animate({opacity: 0.7});
          break;
        }
      }
    }
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

    var paper;
    var playingField;
    var circleMe;
    var circleEnemy;
    var width, height, radius;

    initMap(200,200,0,0);

    function initMap(widtharg, heightarg, enemyPositionX, enemyPositionY) {
      width = widtharg;
      height = heightarg;
      paper = Raphael($(".radar", $roomba).get(0), width, height);
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
      if(Math.sqrt(Math.pow(x,2) + Math.pow(y,2)) < radius) {
        circleEnemy = paper.circle(x+radius, y+radius, 5);
        circleEnemy.attr("fill", "red");
      }
    }

    var overlay = Raphael($(".radaroverlay", $roomba).get(0), width, 200);
    var pie = overlay.g.piechart(width/2,height/2,radius,[15,85],{strokewidth: 0, colors:["none", "grey"]});
    pie.attr("opacity", "0.5");

    $(".videofeed", $roomba).append(
      $("<img/>")
      .attr("src", "/cam/" + n)
      .attr("alt", "There is no video feed now.")
    );
  }
});
