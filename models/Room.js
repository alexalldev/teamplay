const Sequelize = require('sequelize');
const db = require('../config/database');

const Room = db.define('room', {
	RoomID: {
		type: Sequelize.INTEGER,
		autoIncrement: true,
		primaryKey: true
	},
	RoomTag: {
		type: Sequelize.STRING
	},
	RoomName: {
		type: Sequelize.STRING
	},
	RoomCreatorID: {
		type: Sequelize.INTEGER
	}
});

module.exports = Room;
