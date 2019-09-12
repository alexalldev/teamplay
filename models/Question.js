const Sequelize = require('sequelize');
const db = require('../config/database');
const fs = require('fs');

const Question = db.define('question', {
    QuestionId: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    QuestionText: {
        type: Sequelize.STRING
    },
    QuestionCost: {
        type: Sequelize.FLOAT
    },
    QuestionImagePath: {
        type: Sequelize.STRING
    },
    Category_Id: {
        type: Sequelize.STRING,
        allowNull: false,
        foreignKey : true
    }
});

Question.RemoveQuestionImage = function(questionId, callback) {
    Question.findOne({where: {QuestionId: questionId} })
    .then(question =>
      {
        if (question)
        {
            fs.access(__dirname + "/../IMAGES/QUESTIONS_IMAGES/" + question.QuestionImagePath, fs.constants.F_OK, (err) => {
                if (!err)
                {
                    fs.unlink(__dirname + "/../IMAGES/QUESTIONS_IMAGES/" + question.QuestionImagePath, function(err) {
                        if (err)
                            callback(err)
                        else
                            callback(true)
                    });
                }
                else callback(false)
              });
        }
        else callback(null)
      })
    .catch(err => console.log(err))
}

module.exports = Question;