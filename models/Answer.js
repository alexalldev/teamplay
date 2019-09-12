const Sequelize = require('sequelize');
const db = require('../config/database');

const Answer = db.define('answer', {
    AnswerId: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    AnswerText: {
        type: Sequelize.STRING
    },
    Correct: {
        type: Sequelize.BOOLEAN
    },
    Question_Id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        foreignKey : true
    }
});

module.exports = Answer;