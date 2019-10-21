const Sequelize = require("sequelize");
const db = require("../config/database");

const RoomPlayer = db.define("room_player", {
  RoomPlayersId: {
    type: Sequelize.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  isRoomCreator: {
    type: Sequelize.BOOLEAN
  },
  isGroupCoach: {
    type: Sequelize.BOOLEAN
  },
  Room_Id: {
    type: Sequelize.INTEGER
  },
  User_Id: {
    type: Sequelize.INTEGER
  },
  Team_Id: {
    type: Sequelize.INTEGER
  }
});

module.exports = RoomPlayer;
