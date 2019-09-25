const Sequelize = require('sequelize');
const db = require('../config/database');

const RoomPlayer = db.define('room_player', {
    RoomPlayers_ID: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    RoomTag: {
        type: Sequelize.STRING
    },
    UserID: {
        type: Sequelize.INTEGER
    }
});

module.exports = RoomPlayer;