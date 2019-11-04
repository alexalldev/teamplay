const Sequelize = require('sequelize');
const db = require('../config/database');

const GameResultAnswer = db.define('game_result_answer', {
    GameResultAnswerId: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    GameResultAnswerText: {
        type: Sequelize.TEXT
    },
    GameResultQuestion_Id: {
        type: Sequelize.INTEGER
    }
});

module.exports = GameResultAnswer;