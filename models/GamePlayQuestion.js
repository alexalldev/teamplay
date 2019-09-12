const Sequelize = require('sequelize');
const db = require('../config/database');

const GamePlayQuestion = db.define('game_play_question', {
    GamePlayQuestionId: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    Question_Id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        foreignKey : true
    },
    GamePlayCategory_Id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        foreignKey : true
    }
});

module.exports = GamePlayQuestion;