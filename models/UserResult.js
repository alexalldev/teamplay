const Sequelize = require('sequelize');
const db = require('../config/database');

const UserResultAnswer = db.define('user_result', {
    UserResultId: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    UserNickname: {
        type: Sequelize.TEXT
    },
    UserFIO: {
        type: Sequelize.TEXT
    },
    CorrectAnsweredQuestionsNum: {
        type: Sequelize.INTEGER
    },
    IsCreator: {
        type: Sequelize.BOOLEAN
    },
    Timestamp: {
        type: Sequelize.INTEGER
    },
    User_Id: {
        type: Sequelize.INTEGER
    },
    TeamResult_Id: {
        type: Sequelize.INTEGER
    }
});

module.exports = UserResultAnswer;