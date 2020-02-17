const Sequelize = require("sequelize");
const db = require("../config/database");

const GameResultAnswer = db.define("game_result_answer", {
  GameResultAnswerId: {
    type: Sequelize.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  GameResultAnswerText: {
    type: Sequelize.TEXT
  },
  isCorrect: {
    type: Sequelize.BOOLEAN
  },
  GameResultQuestion_Id: {
    type: Sequelize.INTEGER,
    foreignKey: true
  }
});

module.exports = GameResultAnswer;
