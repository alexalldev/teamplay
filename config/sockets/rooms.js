const Room = require("../../models/Room");
const RoomPlayer = require("../../models/RoomPlayer");
const User = require("../../models/User");
const Team = require("../../models/Team");
function roomsSocket(socket, io) {
  const session = socket.request.session;
  socket.on("createRoom", function(roomName, gameId, roomMaxTeamPlayers) {
    if (roomName && gameId && roomMaxTeamPlayers) {
      if (roomName.charAt(roomName.length - 1) == " ")
        roomName = roomName.substr(0, roomName.length - 1);
      const roomTag = roomName
        .replace(/[^a-zA-Zа-яА-Я0-9 ]/g, "")
        .toLowerCase()
        .replace(/\s/g, "-");
      Room.findOrCreate({
        where: { RoomTag: roomTag },
        defaults: {
          RoomName: roomName,
          Game_Id: gameId,
          RoomMaxTeamPlayers: roomMaxTeamPlayers,
          RoomCreatorId: session.passport.user
        }
      })
        .then(([room, created]) => {
          if (created) {
            socket.emit("roomAdded", created);
          } else {
            socket.emit("Info", "Комната с таким названием существует");
          }
        })
        .catch(err => console.log(err));
    }
  });

  socket.on("getRoomPlayers", function() {
    RoomPlayer.findAll({ where: { Room_Id: session.roomId }, raw: true }).then(
      async room => {
        socket.emit("sendRoomPlayers", await findRoomPlayers(room));
      }
    );
  });

  socket.on("getCreatorStatus", function() {
    if (session.roomId)
      Room.findOne({ where: { RoomId: session.roomId }, raw: true })
        .then(room => {
          RoomPlayer.findOne({
            where: { Room_Id: session.roomId },
            raw: true
          }).then(roomPlayer => {
            if (roomPlayer)
              User.findOne({ where: { UserId: roomPlayer.User_Id }, raw: true })
                .then(user => {
                  if (user)
                    socket.emit(
                      "RecieveCreatorStatus",
                      io.ClientsStore.creatorById(room.RoomCreatorId)
                        ? true
                        : false
                    );
                  else console.log("rooms.js: There is no user");
                })
                .catch(err => console.log(err));
            else console.log("rooms.js: There is no room creator");
          });
        })
        .catch(err => console.log(err));
    else console.log("rooms.js: There is no roomId in session");
  });

  socket.on("deleteRoom", function(roomId) {
    if (session.passport.user)
      RoomPlayer.destroy({ where: { Room_Id: roomId } })
        .then(() => {
          Room.destroy({
            where: { RoomCreatorId: session.passport.user, RoomId: roomId }
          })
            .then(room => {
              if (room)
                io.to("RoomUsers" + session.roomId).emit("roomDeleted", true);
              else socket.emit("roomDeleted", "You cant delete this room");
            })
            .catch(err => console.log(err));
        })
        .catch(err => console.log(err));
    else console.log("There is no roomId in session");
  });

  async function findRoomPlayers(room) {
    let roomPlayersArray = [];
    let counter = 0;
    for await (const player of room) {
      if (!player.isRoomCreator)
        await User.findOne({
          where: { UserId: player.User_Id },
          raw: true
        }).then(async user => {
          await Team.findOne({
            where: { TeamId: user.Team_Id },
            raw: true
          }).then(team => {
            roomPlayersArray[counter] = {
              RoomPlayersId: player.RoomPlayersId,
              UserName: user.UserName,
              UserFamily: user.UserFamily,
              UserLastName: user.UserLastName,
              RoomId: player.Room_Id,
              TeamId: player.Team_Id,
              TeamName: player.isRoomCreator ? "" : team.TeamName,
              isRoomCreator: player.isRoomCreator,
              isGroupCoach: player.isGroupCoach
            };
            counter++;
          });
        });
    }
    return roomPlayersArray;
  }
}
module.exports = roomsSocket;
