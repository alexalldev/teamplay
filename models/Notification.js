const Sequelize = require('sequelize');
const db = require('../config/database');

const Game = db.define('notification', {
    notificationId: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    senderId: {
        type: Sequelize.INTEGER
    },
    receiverId: {
        type: Sequelize.INTEGER
    },
    header: {
        type: Sequelize.STRING
    },
    mainText: {
        type: Sequelize.STRING
    },
    isNotification: {
        type: Sequelize.BOOLEAN
    },
    isRead: {
        type: Sequelize.BOOLEAN
    }
});

module.exports = Game;