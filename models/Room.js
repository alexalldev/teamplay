const Sequelize = require('sequelize');
const db = require('../config/database');

const Room = db.define('room', {
	RoomId: {
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
	RoomMaxTeamPlayers: {
		type: Sequelize.INTEGER
	},
	Game_Id: {
		type: Sequelize.INTEGER
	},
	RoomCreatorId: {
		type: Sequelize.INTEGER
	}
});

module.exports = Room;
