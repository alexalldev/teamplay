const Sequelize = require('sequelize');
const db = require('../config/database');

const TeamResultAnswer = db.define('team_results_question', {
    TeamResultQuestionId: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    TeamResult_Id: {
        type: Sequelize.INTEGER
    },
    GameResultQuestion_Id: {
        type: Sequelize.INTEGER
    },
});

module.exports = TeamResultAnswer;