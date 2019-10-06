const Sequelize = require('sequelize');
const db = require('../config/database');

const RoomPlayer = db.define('room_player', {
	RoomPlayerId: {
		type: Sequelize.INTEGER,
		autoIncrement: true,
		primaryKey: true
	},
	RoomTag: {
		type: Sequelize.STRING
	},
	UserId: {
		type: Sequelize.INTEGER
	}
});

module.exports = RoomPlayer;
