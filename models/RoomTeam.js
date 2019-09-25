const Sequelize = require('sequelize');
const db = require('../config/database');

const RoomTeam = db.define('room_team', {
    RoomPlayers_ID: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    Room_ID: {
        type: Sequelize.STRING
    },
    Team_ID: {
        type: Sequelize.INTEGER
    }
});

module.exports = RoomTeam;