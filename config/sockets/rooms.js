const Room = require('../../models/Room');

function createRoom (socket, io) {
  socket.on('createRoom', function (roomName, creatorID) {
    console.log(roomName, creatorID);
    GameTag = roomName.replace(/[^a-zA-Zа-яА-Я ]/g, '').toLowerCase().replace(/\s/g, '-');

    Room.findOrCreate({ where: { RoomName: GameTag, RoomCreatorID: creatorID } })
      .then(([ game, created
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
}

module.exports = createRoom;
