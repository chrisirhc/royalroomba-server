Royal Roomba
============
This is a project for CS4348 under the _Robotics_ theme.

Structure
---------
### Mobile (royalroomba-mobile)
(Do we want to call this the Sensor module?)
Running on Android, this will provide the additional sensors that we need on the roomba via a Nexus One attached to the top of the roomba via a contraption.

### Roombacomm (royalroomba-roombamanager)
This is the controller that sends commands to the roombas via Bluetooth. It also receives input from the sensors attached to the roomba such as the Wall sensor and the bumper sensor.
http://github.com/iamjt/royalroomba-roombamanager/

### Server (royalroomba-server)
This keeps track of the world state.
http://github.com/chrisirhc/royalroomba-server/

Team
----
* Chris Chua (chrisirhc)
* Fan Roufang
* Ho Yit Chun
* Khoo Jing Ting (iamjt)
* Kristal Chan
