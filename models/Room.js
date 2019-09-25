const Sequelize = require('sequelize');
const db = require('../config/database');

const Room = db.define('room', {
    RoomID: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    RoomName: {
        type: Sequelize.STRING
    }
});

module.exports = Room;