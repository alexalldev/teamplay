const Room = require('../../models/Room');
const roomPlayer = require('../../models/RoomPlayer');
const User = require('../../models/User');
function roomsSocket(socket, io) {
  socket.on('createRoom', function (roomName, creatorID) {
    console.log(roomName, creatorID);
    gameTag = roomName.replace(/[^a-zA-Zа-яА-Я ]/g, '').toLowerCase().replace(/\s/g, '-');

    Room.findOrCreate({ where: { RoomTag: gameTag, RoomName: roomName, RoomCreatorID: creatorID } })
      .then(([game, created
      ]) => {
        if (created == true) {
          console.log('room was created');
          io.emit('roomAdded');
        } else {
          console.log('Room is already exists');
          io.emit('roomExists');
        }
      })
      .catch(err => console.log(err));
  });

  socket.on('getConnectedUsers', function (roomTag) {
    let users = {};
    roomPlayer.findAll({ where: { RoomTag: roomTag } }).then(room => {
      if (!room) {
        users.err = 'room not found';
      } else {
        findConnectedUsers(room, users);
      }
    });
  });

  async function findConnectedUsers(room, users) {
    let roomPlayersArray = [];
    let counter = 0;
    const result = async () => {
      await asyncForEach(room, async player => {
        await User.findOne({ where: { UserId: player.UserID } }).then(user => {
          roomPlayersArray[counter] = user.get();
          counter++;
        });
      });
      users.result = roomPlayersArray;
      io.emit('sendConnectedUsers', users);
    };
    result();
  }

  async function asyncForEach(array, callback) {
    for (let index = 0; index < array.length; index++) {
      await callback(array[index], index, array);
    }
  }

  socket.on('getCreatorStatus', function (creatorId) {
    io.emit('sendCreatorStatus', io.ClientsStore.userById(creatorId) ? true : false);
  });
}
module.exports = roomsSocket;
