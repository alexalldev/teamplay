const Sequelize = require('sequelize');
const db = require('../config/database');

const UserResultAnswer = db.define('user_results_answer', {
    UserResultAnswerId: {
        type: Sequelize.INTEGER
    },
    isCorrect: {
        type: Sequelize.BOOLEAN
    },
    GameResultQuestion_Id: {
        type: Sequelize.INTEGER
    },
    GameResultAnswer_Id: {
        type: Sequelize.INTEGER
    }
});

module.exports = UserResultAnswer;