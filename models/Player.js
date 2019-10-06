const Sequelize = require('sequelize');
const db = require('../config/database');

const Player = db.define('player', {
	PlayerId: {
		type: Sequelize.INTEGER,
		autoIncrement: true,
		primaryKey: true
	},
	PlayerName: {
		type: Sequelize.STRING
	},
	isCoach: {
		type: Sequelize.BOOLEAN
	},
	Team_Id: {
		type: Sequelize.INTEGER,
		allowNull: false,
		foreignKey: true
	},
	User_Id: {
		type: Sequelize.INTEGER,
		allowNull: false,
		foreignKey: true
	}
});

module.exports = Player;
