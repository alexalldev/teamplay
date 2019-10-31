const Sequelize = require("sequelize");
const db = require("../config/database");

const GameResult = db.define("game_result", {
    GameResultId: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    GameName: {
        type: Sequelize.TEXT
    },
    Timestamp: {
        type: Sequelize.INTEGER
    },
    GamePlay_Id: {
        type: Sequelize.INTEGER
    }
});

module.exports = GameResult;
