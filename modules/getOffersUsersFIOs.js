const RoomOfferAnswer = require("../models/RoomOfferAnswer");
const RoomPlayer = require("../models/RoomPlayer");
const User = require("../models/User");

let offersUsersFIOs = [];

module.exports = async function getOffersUsersFIOs(roomTeamId) {
  RoomOfferAnswer.belongsTo(RoomPlayer, {
    foreignKey: "RoomPlayer_Id"
  });
  RoomPlayer.hasMany(RoomOfferAnswer, {
    foreignKey: "RoomPlayer_Id"
  });
  RoomPlayer.belongsTo(User, {
    foreignKey: "User_Id"
  });
  User.hasMany(RoomPlayer, {
    foreignKey: "User_Id"
  });
  await RoomOfferAnswer.findAll({
    where: {
      RoomTeam_Id: roomTeamId
    },
    include: [
      {
        model: RoomPlayer,
        include: [User]
      }
    ]
  })
    .then(offersRoomPlayersUsers => {
      offersUsersFIOs = offersRoomPlayersUsers.map(offerRoomPlayerUser => {
        const { user } = offerRoomPlayerUser.room_player;
        return {
          Answer_Id: offerRoomPlayerUser.Answer_Id,
          UserFIO: `${user.UserFamily} ${user.UserName.slice(
            0,
            1
          )}. ${user.UserLastName.slice(0, 1)}.`
        };
      });
    })
    .catch(err => console.log(err));
  return offersUsersFIOs;
};
