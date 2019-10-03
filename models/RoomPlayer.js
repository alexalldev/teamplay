const Sequelize = require('sequelize');
const db = require('../config/database');

const RoomPlayer = db.define('room_player', {
    RoomPlayers_Id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    Room_Id: {
        type: Sequelize.STRING
    },
    User_Id: {
        type: Sequelize.INTEGER
    },
    Team_Id: {
        type: Sequelize.INTEGER
    },
    isRoomCreator: {
        type: Sequelize.BOOLEAN
    },
    isGroupCoach: {
        type: Sequelize.BOOLEAN
    }
});

module.exports = RoomPlayer;