const Sequelize = require('sequelize');
const db = require('../config/database');

const RoomTeam = db.define('room_team', {
    RoomTeamId: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    Room_Id: {
        type: Sequelize.STRING
    },
    Team_Id: {
        type: Sequelize.INTEGER
    }
});

module.exports = RoomTeam;