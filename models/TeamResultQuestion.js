const Sequelize = require("sequelize");
const db = require("../config/database");

const TeamResultQuestion = db.define("team_results_question", {
    TeamResultQuestionId: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    isAnsweredCorrectly: {
        type: Sequelize.BOOLEAN
    },
    TeamResult_Id: {
        type: Sequelize.INTEGER
    },
    GameResultQuestion_Id: {
        type: Sequelize.INTEGER
    }
});

module.exports = TeamResultQuestion;
