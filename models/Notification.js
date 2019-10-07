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
	isInfoNotification: {
		type: Sequelize.BOOLEAN
	},
	isAnswered: {
		type: Sequelize.BOOLEAN
	},
	isViewed: {
		type: Sequelize.BOOLEAN
	},
	InvitationHash: {
		type: Sequelize.STRING
	},
	InvitationType: {
		type: Sequelize.STRING
	}
});

module.exports = Game;
