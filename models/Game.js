const Sequelize = require('sequelize');
const db = require('../config/database');

const Game = db.define('game', {
	GameId: {
		type: Sequelize.INTEGER,
		autoIncrement: true,
		primaryKey: true
	},
	GameName: {
		type: Sequelize.STRING
	},
	GameTag: {
		type: Sequelize.STRING
	},
	SelectionTime: {
		type: Sequelize.INTEGER
	},
	QuizCreatorId: {
		type: Sequelize.INTEGER
	}
});

module.exports = Game;
