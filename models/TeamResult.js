const Sequelize = require('sequelize');
const db = require('../config/database');

const TeamResult = db.define('team_result', {
    TeamResultId: {
        type: Sequelize.INTEGER
    },
    TeamName: {
        type: Sequelize.TEXT
    },
    TeamPoints: {
        type: Sequelize.INTEGER
    },
    isAnsweredCorrectly: {
        type: Sequelize.BOOLEAN
    },
    Team_Id: {
        type: Sequelize.INTEGER
    },
    GameResult_Id: {
        type: Sequelize.INTEGER
    },
});

module.exports = TeamResult;