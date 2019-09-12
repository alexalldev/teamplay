const Sequelize = require('sequelize');
const db = require('../config/database');

const GamePlayCategory = db.define('game_play_category', {
    GamePlayCategoryId: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    Category_Id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        foreignKey : true
    },
    GamePlay_Id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        foreignKey : true
    }
});

module.exports = GamePlayCategory;