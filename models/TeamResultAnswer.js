const Sequelize = require('sequelize');
const db = require('../config/database');

const TeamResultAnswer = db.define('team_results_answer', {
    TeamResultAnswerId: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    isCorrect: {
        type: Sequelize.BOOLEAN
    },
    GameResultQuestion_Id: {
        type: Sequelize.INTEGER
    },
    GameResultAnswer_Id: {
        type: Sequelize.INTEGER
    },
});

module.exports = TeamResultAnswer;