const Sequelize = require('sequelize');
const db = require('../config/database');

const UserResultAnswer = db.define('user_results_question', {
    UserResultQuestionId: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    UserResult_Id: {
        type: Sequelize.INTEGER
    },
    GameResultQuestion_Id: {
        type: Sequelize.INTEGER
    }
});

module.exports = UserResultAnswer;