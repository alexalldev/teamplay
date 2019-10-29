const Sequelize = require('sequelize');
const db = require('../config/database');

const GameResultQuestion = db.define('game_result_question', {
    GameResultQuestionId: {
        type: Sequelize.INTEGER
    },
    GameResultQuestionText: {
        type: Sequelize.TEXT
    },
    QuestionImagePath: {
        type: Sequelize.TEXT
    },
    GameResultCategory_Id: {
        type: Sequelize.INTEGER
    }
});

module.exports = GameResultQuestion;