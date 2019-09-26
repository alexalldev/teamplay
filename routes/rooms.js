let { router } = require('../config/routers-config');

const Room = require('../models/Room');
const roomPlayer = require('../models/RoomPlayer');
const User = require('../models/User');

router.post('/createRoom', function (req, res) {
  Room.FindOne({ where: { RoomName: req.body.roomName } }).then(room => {
    if (!room) {
      res.send(false);
    } else {
      Room.create({ RoomName: req.body.roomName })
        .then(createdRoom => {
          console.log('Room ' + req.body.roomName + ' was created');
        })
        .catch(err => {
          console.log('CreateTeamError');
        });
    }
  });
});

router.post('/allRoomPlayers', (req, res) => {
  //передается RoomName
  Room.findOne({ where: { RoomName: req.body.roomName } }).then(room => {
    if (!room) {
      res.send(false);
    } else {
      let roomPlayersArray = [];
      let counter = 0;
      //RoomId/RoomTag
      roomPlayer.findAll({ where: { RoomId: room.RoomID } }).then(roomPlayersModel => {
        roomPlayersModel.forEach(player => {
          User.findOne({ where: { UserId: player.UserID } }).then(user => {
            roomPlayersArray[counter] = `${user.UserName} ${user.Family}`;
            counter++;
          });
        });
      });
    }
  });
});

router.post('/isCreatorOnline', (req, res) => {});
