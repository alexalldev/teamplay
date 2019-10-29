const Sequelize = require('sequelize');
const db = require('../config/database');

const GameResultCategory = db.define('game_result_category', {
    GameResultCategoryId: {
        type: Sequelize.INTEGER
    },
    GameResultCategoryName: {
        type: Sequelize.TEXT
    },
    Category_Id: {
        type: Sequelize.INTEGER
    },
    GameResult_Id: {
        type: Sequelize.INTEGER
    }
});

module.exports = GameResultCategory;