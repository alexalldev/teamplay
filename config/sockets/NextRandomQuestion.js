const Category = require("../../models/Category");
const Question = require("../../models/Question");
const Answer = require("../../models/Answer");
const Room = require("../../models/Room");
const GamePlay = require("../../models/GamePlay");
const GamePlayCategory = require("../../models/GamePlayCategory");
const GamePlayQuestion = require("../../models/GamePlayQuestion");

function getRandomInt(max) {
    return Math.floor(Math.random() * Math.floor(max));
  }

module.exports = async function NextRandomQuestion(socket, io, session) {

    await Room.findOne({ where: { RoomId: session.roomId }, raw: true })
        .then(room => {
          GamePlay.findOne({
            // проверка по roomId
            where: { Game_Id: room.Game_Id, Room_Id: room.RoomId }
          })
            .then(gamePlay => {
              if (gamePlay)
                GamePlayCategory.findAll({
                  where: { GamePlay_Id: gamePlay.dataValues.GamePlayId }
                })
                  .then(gamePlayCategories => {
                    if (gamePlayCategories.length > 0) {
                      const gamePlayCategory =
                        gamePlayCategories[
                          getRandomInt(gamePlayCategories.length)
                        ];
                      Category.findOne({
                        where: {
                          CategoryId: gamePlayCategory.dataValues.Category_Id
                        },
                        raw: true
                      })
                        .then(category => {
                          GamePlayQuestion.findAll({
                            where: {
                              GamePlayCategory_Id:
                                gamePlayCategory.dataValues.GamePlayCategoryId
                            },
                            raw: true
                          })
                            .then(gamePlayQuestions => {
                              if (gamePlayQuestions.length > 0) {
                                const gamePlayQuestion =
                                  gamePlayQuestions[
                                    getRandomInt(gamePlayQuestions.length)
                                  ];
                                Question.findOne({
                                  where: {
                                    QuestionId: gamePlayQuestion.Question_Id
                                  }
                                })
                                  .then(question => {
                                    Answer.findAll({
                                      where: {
                                        Question_Id:
                                          question.dataValues.QuestionId
                                      },
                                      raw: true
                                    })
                                      .then(answers => {
                                        let type = "checkbox";
                                        session.GamePlayId =
                                          gamePlay.dataValues.GamePlayId;
                                        if (answers.length == 1) type = "text";
                                        io.to(
                                          `RoomPlayers${session.roomId}`
                                        ).emit(
                                          "sendQuestion",
                                          question.dataValues,
                                          answers,
                                          type,
                                          false,
                                          category.CategoryName
                                        );
                                        io.to(
                                          `RoomCreators${session.roomId}`
                                        ).emit(
                                          "sendQuestion",
                                          question.dataValues,
                                          answers.filter(
                                            answer => answer.Correct
                                          ),
                                          type,
                                          true,
                                          category.CategoryName
                                        );
                                        gamePlay
                                          .update({
                                            CurrentQuestionId:
                                              question.dataValues.QuestionId
                                          })
                                          .catch(err => console.log(err));
                                      })
                                      .catch(err => console.log(err));

                                    // TODO: когда все ответили удалить вопрос
                                  })
                                  .catch(err => console.log(err));
                              } else gamePlayCategory.destroy();
                            })
                            .catch(err => console.log(err));
                        })
                        .catch(err => console.log(err));
                    } else
                      socket
                        .to(`RoomUsers${session.roomId}`)
                        .emit("game ended");
                  })
                  .catch(err => console.log(err));
            })
            .catch(err => console.log(err));
        })
        .catch(err => console.log(err));
  }