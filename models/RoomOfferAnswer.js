const Sequelize = require("sequelize");
const db = require("../config/database");

const RoomOfferAnswer = db.define("room_offer_answers", {
  RoomOfferAnswerId: {
    type: Sequelize.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  Answer_Id: {
    type: Sequelize.STRING
  },
  Room_Id: {
    type: Sequelize.INTEGER
  },
  RoomPlayer_Id: {
    type: Sequelize.INTEGER
  },
  RoomTeam_Id: {
    type: Sequelize.INTEGER
  }
});

module.exports = RoomOfferAnswer;
