const Sequelize = require("sequelize");
const db = require("../config/database");

const GameResultQuestion = db.define("game_result_question", {
    GameResultQuestionId: {
        type: Sequelize.INTEGER
    },
    GameResultQuestionText: {
        type: Sequelize.TEXT
    },
    QuestionImagePath: {
        type: Sequelize.TEXT
    },
    Question_Id: {
        type: Sequelize.INTEGER
    },
    GameResultCategory_Id: {
        type: Sequelize.INTEGER
    }
});

module.exports = GameResultQuestion;
