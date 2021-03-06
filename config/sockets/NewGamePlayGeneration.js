const { Op } = require("sequelize");
const Category = require("../../models/Category");
const Question = require("../../models/Question");
const Answer = require("../../models/Answer");
const Room = require("../../models/Room");
const RoomTeam = require("../../models/RoomTeam");
const RoomPlayer = require("../../models/RoomPlayer");
const GamePlay = require("../../models/GamePlay");
const GamePlayCategory = require("../../models/GamePlayCategory");
const GamePlayQuestion = require("../../models/GamePlayQuestion");
const RoomOfferAnswer = require("../../models/RoomOfferAnswer");
const GameResult = require("../../models/GameResult");
const GameResultCategory = require("../../models/GameResultCategory");
const GameResultQuestion = require("../../models/GameResultQuestion");
const GameResultAnswer = require("../../models/GameResultAnswer");
const TeamResult = require("../../models/TeamResult");
const UserResult = require("../../models/UserResult");
const TeamResultQuestion = require("../../models/TeamResultQuestion");
const UserResultQuestion = require("../../models/UserResultQuestion");
const Game = require("../../models/Game");
const User = require("../../models/User");
const Team = require("../../models/Team");
const GetTeamNamesPoints = require("../../modules/getTeamNamesPoints");
const GetOffersUsersFIOs = require("../../modules/getOffersUsersFIOs");
const GamePlayStructure = require("./GamePlayStructure");

const ANSWERING_TIMERS = [];
const CHECKING_TIMERS = [];

function NewGamePlayGeneration(socket, io) {
  const { session } = socket.request;
  async function GetRandomQuestion() {
    let result = {};
    await Room.findOne({ where: { RoomId: session.roomId }, raw: true })
      .then(async room => {
        await GamePlay.findOne({
          where: { Game_Id: room.Game_Id, Room_Id: room.RoomId }
        })
          .then(async gamePlay => {
            if (gamePlay)
              await GamePlayCategory.findAll({
                where: { GamePlay_Id: gamePlay.dataValues.GamePlayId },
                raw: true
              })
                .then(async gamePlayCategories => {
                  const randomInd = getRandomInt(gamePlayCategories.length);
                  const gamePlayCategory = gamePlayCategories[randomInd];

                  await Category.findOne({
                    where: {
                      CategoryId: gamePlayCategory.Category_Id
                    },
                    raw: true
                  })
                    .then(async category => {
                      await GamePlayQuestion.findAll({
                        where: {
                          GamePlayCategory_Id:
                            gamePlayCategory.GamePlayCategoryId
                        },
                        raw: true
                      })
                        .then(async gamePlayQuestions => {
                          const randomInd2 = getRandomInt(
                            gamePlayQuestions.length
                          );
                          const gamePlayQuestion =
                            gamePlayQuestions[randomInd2];

                          await Question.findOne({
                            where: {
                              QuestionId: gamePlayQuestion.Question_Id
                            },
                            raw: true
                          })
                            .then(async question => {
                              await Answer.findAll({
                                where: {
                                  Question_Id: question.QuestionId
                                },
                                raw: true
                              })
                                .then(async answers => {
                                  let type = "checkbox";
                                  session.GamePlayId =
                                    gamePlay.dataValues.GamePlayId;
                                  if (answers.length == 1) type = "text";
                                  await gamePlay
                                    .update({
                                      CurrentQuestionId: question.QuestionId
                                    })
                                    .then(() => {
                                      result = {
                                        question,
                                        answers,
                                        type,
                                        category
                                      };
                                    })
                                    .catch(err => console.log(err));
                                })
                                .catch(err => console.log(err));
                            })
                            .catch(err => console.log(err));
                        })
                        .catch(err => console.log(err));
                    })
                    .catch(err => console.log(err));
                })
                .catch(err => console.log(err));
          })
          .catch(err => console.log(err));
      })
      .catch(err => console.log(err));
    return result;
  }
  async function DeleteGamePlayQuestion(category, question) {
    let canDelete = true;
    await GamePlay.findOne({ where: { Room_Id: session.roomId }, raw: true })
      .then(async gamePlay => {
        await GamePlayCategory.findOne({
          where: {
            Category_Id: category.CategoryId,
            GamePlay_Id: gamePlay.GamePlayId
          }
        }).then(async gamePlayCategory => {
          await GamePlayQuestion.count({
            where: {
              GamePlayCategory_Id:
                gamePlayCategory.dataValues.GamePlayCategoryId
            }
          })
            .then(async gamePlayQuestionsNum => {
              await GamePlayQuestion.findOne({
                where: {
                  Question_Id: question.QuestionId,
                  GamePlayCategory_Id:
                    gamePlayCategory.dataValues.GamePlayCategoryId
                }
              })
                .then(async gamePlayQuestion => {
                  await gamePlayQuestion
                    .destroy()
                    .catch(err => console.log(err));
                })
                .catch(err => console.log(err));
              if (gamePlayQuestionsNum == 1) {
                await gamePlayCategory.destroy();
                await GamePlayCategory.count({
                  where: {
                    GamePlay_Id: gamePlay.GamePlayId
                  }
                })
                  .then(async gamePlayCategoriesNum => {
                    if (gamePlayCategoriesNum == 0) {
                      FinishGame();
                      canDelete = false;
                    }
                  })
                  .catch(err => console.log(err));
              }
            })
            .catch(err => console.log(err));
        });
      })
      .catch(err => console.log(err));
    return canDelete;
  }

  function sendRandomQuestion(question, answers, type, category) {
    io.to(`RoomPlayers${session.roomId}`).emit(
      "sendQuestion",
      question,
      answers,
      type,
      false,
      category.CategoryName
    );
    io.to(`RoomCreators${session.roomId}`).emit(
      "sendQuestion",
      question,
      answers.filter(answer => answer.Correct),
      type,
      true,
      category.CategoryName
    );
  }

  async function checkTeamAnswers(roomTeamId) {
    let result = false;
    await RoomOfferAnswer.findAll({
      where: { RoomTeam_Id: roomTeamId },
      raw: true
    })
      .then(async roomOffersAnswers => {
        if (roomOffersAnswers.length > 0)
          await GamePlay.findOne({
            where: {
              GamePlayId: session.GamePlayId
            }
          })
            .then(async gamePlay => {
              await Answer.findAll({
                where: {
                  Question_Id: gamePlay.CurrentQuestionId
                },
                raw: true
              })
                .then(currQuestionAnswers => {
                  const rightAnswersIds = currQuestionAnswers
                    .filter(answer => {
                      return answer.Correct;
                    })
                    .map(answer => answer.AnswerId);
                  const votesAnswers = Array.from(
                    new Set(
                      roomOffersAnswers.map(
                        roomOfferAnswer => roomOfferAnswer.Answer_Id
                      )
                    )
                  ).map(answerIdToFind => {
                    return {
                      answerId: answerIdToFind,
                      count: roomOffersAnswers.filter(
                        roomOfferAnswer =>
                          answerIdToFind == roomOfferAnswer.Answer_Id
                      ).length
                    };
                  });
                  let max = votesAnswers[0];
                  for (let i = 1; i < votesAnswers.length; i++) {
                    if (votesAnswers[i].count > max.count) {
                      max = votesAnswers[i];
                    }
                  }
                  const maxVotedAnswerIds = [];
                  for (let i = 0; i < votesAnswers.length; i++) {
                    if (votesAnswers[i].count == max.count) {
                      maxVotedAnswerIds.push(votesAnswers[i].answerId);
                    }
                  }
                  if (rightAnswersIds.length == maxVotedAnswerIds.length) {
                    result = true;
                    for (
                      let i = 0, len = rightAnswersIds.length;
                      i < len;
                      i++
                    ) {
                      if (!maxVotedAnswerIds.includes(rightAnswersIds[i])) {
                        result = false;
                        break;
                      }
                    }
                  }
                })
                .catch(err => console.log(err));
            })
            .catch(err => console.log(err));
      })
      .catch(err => console.log(err));

    return result;
  }

  async function AddRoomTeamsPoints(roomTeams, question) {
    const roomTeamIdsAddedPoints = {};
    for await (const roomTeam of roomTeams) {
      const isAnswerCorrect = await checkTeamAnswers(roomTeam.RoomTeamId);
      roomTeamIdsAddedPoints[roomTeam.RoomTeamId] =
        question.QuestionCost * isAnswerCorrect;
      await roomTeam
        .update({
          Points: roomTeam.Points + question.QuestionCost * isAnswerCorrect
        })
        .catch(err => console.log(err));
    }
    return roomTeamIdsAddedPoints;
  }
  function checkAnswers(question, roomId) {
    RoomTeam.findAll({ where: { Team_Id: { [Op.gt]: 0 }, Room_Id: roomId } })
      .then(async roomTeams => {
        if (roomTeams) {
          const roomTeamIdsAddedPoints = await AddRoomTeamsPoints(
            roomTeams,
            question
          );

          const teamNamesPoints = await GetTeamNamesPoints(session.roomId);
          // FIXME: можно сделать намного меньше обращений к базе. Сохранять в таблицу TeamResult
          // только на дисконнекте или при конце игры. Так как эти данные не нужны на на протяжении игры
          // и незачем их так часто обновлять
          for await (const roomTeam of roomTeams) {
            await GamePlay.update(
              {
                isAnsweredCorrectly: !!roomTeamIdsAddedPoints[
                  roomTeam.RoomTeamId.toString()
                ]
              },
              {
                where: {
                  GamePlayId: session.GamePlayId
                }
              }
            ).catch(err => console.log(err));
            await Promise.all([
              GamePlay.findOne({
                where: { GamePlayId: session.GamePlayId },
                raw: true
              })
                .then(async gamePlay => {
                  await GameResult.findOne({
                    where: { GamePlay_Id: gamePlay.GamePlayId },
                    raw: true
                  })
                    .then(async gameResult => {
                      await TeamResult.findOne({
                        where: {
                          Team_Id: roomTeam.Team_Id,
                          GameResult_Id: gameResult.GameResultId
                        }
                      })
                        .then(async teamResult => {
                          await teamResult
                            .update({ TeamPoints: roomTeam.Points })
                            .catch(err => console.log(err));
                          await GameResultCategory.findOne({
                            where: {
                              GameResult_Id: gameResult.GameResultId,
                              Category_Id: question.Category_Id
                            },
                            raw: true
                          })
                            .then(async gameResultCategory => {
                              await GameResultQuestion.findOne({
                                where: {
                                  GameResultCategory_Id:
                                    gameResultCategory.GameResultCategoryId,
                                  Question_Id: question.QuestionId
                                },
                                raw: true
                              })
                                .then(async gameResultQuestion => {
                                  await TeamResultQuestion.findOne({
                                    where: {
                                      TeamResult_Id: teamResult.TeamResultId,
                                      GameResultQuestion_Id:
                                        gameResultQuestion.GameResultQuestionId
                                    }
                                  })
                                    .then(async teamResultQuestion => {
                                      await teamResultQuestion
                                        .update({
                                          isAnsweredCorrectly: !!roomTeamIdsAddedPoints[
                                            roomTeam.RoomTeamId.toString()
                                          ]
                                        })
                                        .then(
                                          async updatedTeamResultQuestion => {
                                            await UserResult.findAll({
                                              where: {
                                                TeamResult_Id:
                                                  teamResult.TeamResultId
                                              }
                                            })
                                              .then(async usersResults => {
                                                await UserResultQuestion.findOne(
                                                  {
                                                    where: {
                                                      UserResult_Id: usersResults.map(
                                                        userResult =>
                                                          userResult.UserResultId
                                                      ),
                                                      GameResultQuestion_Id:
                                                        updatedTeamResultQuestion.GameResultQuestion_Id
                                                    }
                                                  }
                                                )
                                                  .then(
                                                    async userResultQuestion => {
                                                      await userResultQuestion
                                                        .update({
                                                          isAnsweredCorrectly:
                                                            updatedTeamResultQuestion.isAnsweredCorrectly
                                                        })
                                                        .catch(err =>
                                                          console.log(err)
                                                        );
                                                    }
                                                  )
                                                  .catch(err =>
                                                    console.log(err)
                                                  );
                                              })
                                              .catch(err => console.log(err));
                                          }
                                        )
                                        .catch(err => console.log(err));
                                    })
                                    .catch(err => console.log(err));
                                })
                                .catch(err => console.log(err));
                            })
                            .catch(err => console.log(err));
                        })
                        .catch(err => console.log(err));
                    })
                    .catch(err => console.log(err));
                })
                .catch(err => console.log(err)),
              RoomOfferAnswer.destroy({
                where: {
                  Room_Id: roomId
                }
              }).catch(err => console.log(err))
            ]);
            io.to(`RoomTeam${roomTeam.RoomTeamId}`).emit(
              "BreakBetweenQuestions",
              teamNamesPoints,
              teamNamesPoints.find(
                teamNamePoints => teamNamePoints.TeamId == roomTeam.Team_Id
              ),
              roomTeamIdsAddedPoints[roomTeam.RoomTeamId.toString()],
              false
            );
          }

          io.to(`RoomCreators${session.roomId}`).emit(
            "BreakBetweenQuestions",
            teamNamesPoints,
            null,
            0,
            true
          );
        }
      })
      .catch(err => console.log(err));
  }

  function runTimers(RoomId, callback, question, answers, type, category) {
    callback(question, answers, type, category);
    GamePlay.findOne({ where: { GamePlayId: session.GamePlayId } })
      .then(gamePlay => {
        if (gamePlay) {
          gamePlay.update({ isAnsweringTime: true });
          const answeringTimer = {
            timer: setTimeout(async function() {
              gamePlay.update({ isAnsweringTime: false });
              const checkingTimer = {
                timer: setTimeout(async function() {
                  const canDelete = await DeleteGamePlayQuestion(
                    category,
                    question
                  );
                  if (canDelete) {
                    await NextRandomQuestion();
                  }
                }, 5 * 1000),
                RoomId
              };
              checkAnswers(question, RoomId);
              CHECKING_TIMERS.push(checkingTimer);
            }, question.AnswerTime * 1000),
            RoomId
          };
          ANSWERING_TIMERS.push(answeringTimer);
        }
      })
      .catch(err => console.log(err));
  }

  async function NextRandomQuestion() {
    GamePlay.findOne({ where: { Room_Id: session.roomId } }).then(
      async gamePlay => {
        if (gamePlay) {
          const {
            question,
            answers,
            type,
            category
          } = await GetRandomQuestion();
          runTimers(
            session.roomId,
            sendRandomQuestion,
            question,
            answers,
            type,
            category
          );
        }
      }
    );
  }

  function getRandomInt(max) {
    return Math.floor(Math.random() * Math.floor(max));
  }

  function createGameResultStructure(gamePlayResult) {
    Game.findOne({
      where: { GameId: gamePlayResult.gamePlay.Game_Id },
      raw: true
    })
      .then(async game => {
        await GameResult.create({
          GameName: game.GameName,
          Timestamp: gamePlayResult.gamePlay.StartTime,
          GamePlay_Id: gamePlayResult.gamePlay.GamePlayId
        })
          .then(async gameResult => {
            RoomTeam.belongsTo(Team, { foreignKey: "Team_Id" });
            Team.hasMany(RoomTeam, { foreignKey: "Team_Id" });
            RoomTeam.findAll({
              where: { Room_Id: session.roomId },
              include: [Team]
            })
              .then(roomTeams => {
                TeamResult.bulkCreate(
                  roomTeams
                    .filter(roomTeam => roomTeam.team)
                    .map(roomTeam => {
                      return {
                        TeamName: roomTeam.team.TeamName,
                        TeamPoints: 0,
                        Team_Id: roomTeam.team.TeamId,
                        GameResult_Id: gameResult.GameResultId
                      };
                    }),
                  { returning: true }
                )
                  .then(async teamsResults => {
                    await GameResultCategory.bulkCreate(
                      gamePlayResult.categories.map(category => {
                        return {
                          GameResultCategoryName: category.CategoryName,
                          Category_Id: category.CategoryId,
                          GameResult_Id: gameResult.GameResultId
                        };
                      }),
                      { returning: true }
                    )
                      .then(async gameResultCategories => {
                        const questionsResult = [];
                        for (const questionsCategory of gamePlayResult.questionsCategories) {
                          for (const question of questionsCategory.questions) {
                            questionsResult.push({
                              GameResultQuestionText: question.QuestionText,
                              QuestionImagePath: question.QuestionImagePath,
                              Question_Id: question.QuestionId,
                              GameResultCategory_Id: gameResultCategories.find(
                                gameResultCategory =>
                                  gameResultCategory.Category_Id ==
                                  questionsCategory.categoryId
                              ).GameResultCategoryId
                            });
                          }
                        }
                        await GameResultQuestion.bulkCreate(questionsResult, {
                          returning: true
                        })
                          .then(async gameResultQuestions => {
                            const teamResultsQuestionsArr = [];
                            for (const teamResult of teamsResults) {
                              for (const gameResultQuestion of gameResultQuestions) {
                                teamResultsQuestionsArr.push({
                                  TeamResult_Id: teamResult.TeamResultId,
                                  isAnsweredCorrectly: false,
                                  GameResultQuestion_Id:
                                    gameResultQuestion.GameResultQuestionId
                                });
                              }
                            }
                            TeamResultQuestion.bulkCreate(
                              teamResultsQuestionsArr,
                              { returning: true }
                            )
                              .then(teamsResultsQuestions => {
                                RoomPlayer.belongsTo(User, {
                                  foreignKey: "User_Id"
                                });
                                User.hasMany(RoomPlayer, {
                                  foreignKey: "User_Id"
                                });
                                RoomPlayer.findAll({
                                  where: { Room_Id: session.roomId },
                                  include: [User]
                                })
                                  .then(roomPlayersUsers => {
                                    UserResult.bulkCreate(
                                      roomPlayersUsers.map(roomPlayerUser => {
                                        return {
                                          UserNickname: `user${roomPlayerUser.user.UserId}`,
                                          UserFIO: `${
                                            roomPlayerUser.user.UserFamily
                                          } ${roomPlayerUser.user.UserName.slice(
                                            0,
                                            1
                                          )}. ${roomPlayerUser.user.UserLastName.slice(
                                            0,
                                            1
                                          )}.`,
                                          IsCreator:
                                            roomPlayerUser.isRoomCreator,
                                          Timestamp: gameResult.Timestamp,
                                          User_Id: roomPlayerUser.user.UserId,
                                          TeamResult_Id: teamsResults.find(
                                            teamResult =>
                                              teamResult.Team_Id ==
                                                roomPlayerUser.user.Team_Id &&
                                              teamResult.GameResult_Id ==
                                                gameResult.GameResultId
                                          )
                                            ? teamsResults.find(
                                                teamResult =>
                                                  teamResult.Team_Id ==
                                                    roomPlayerUser.user
                                                      .Team_Id &&
                                                  teamResult.GameResult_Id ==
                                                    gameResult.GameResultId
                                              ).TeamResultId
                                            : -1
                                        };
                                      })
                                    )
                                      .then(usersResults => {
                                        const usersResultsQuestionsArr = [];
                                        for (const teamResultQuestion of teamResultsQuestionsArr) {
                                          for (const userResult of usersResults) {
                                            usersResultsQuestionsArr.push({
                                              isAnsweredCorrectly: false,
                                              UserResult_Id:
                                                userResult.UserResultId,
                                              GameResultQuestion_Id:
                                                teamResultQuestion.GameResultQuestion_Id
                                            });
                                          }
                                        }
                                        UserResultQuestion.bulkCreate(
                                          usersResultsQuestionsArr
                                        ).catch(err => console.log(err));
                                      })
                                      .catch(err => console.log(err));
                                  })
                                  .catch(err => console.log(err));
                                Answer.findAll({
                                  where: {
                                    Question_Id: gameResultQuestions.map(
                                      gameResultQuestion =>
                                        gameResultQuestion.Question_Id
                                    )
                                  }
                                })
                                  .then(answers => {
                                    GameResultAnswer.bulkCreate(
                                      answers.map(answer => {
                                        return {
                                          GameResultAnswerText:
                                            answer.AnswerText,
                                          isCorrect: answer.Correct,
                                          GameResultQuestion_Id: gameResultQuestions.find(
                                            gameResultQuestion =>
                                              gameResultQuestion.Question_Id ==
                                              answer.Question_Id
                                          ).GameResultQuestionId
                                        };
                                      })
                                    ).catch(err => console.log(err));
                                  })
                                  .catch(err => console.log(err));
                              })
                              .catch(err => console.log(err));
                          })
                          .catch(err => console.log(err));
                      })
                      .catch(err => console.log(err));
                  })
                  .catch(err => console.log(err));
              })
              .catch(err => console.log(err));
          })
          .catch(err => console.log(err));
      })
      .catch(err => console.log(err));
  }

  socket.on("gameStarted", async () => {
    if (session.isRoomCreator && session.roomId) {
      await GamePlay.findOne({ where: { Room_Id: session.roomId } }).then(
        async gamePlay => {
          if (!gamePlay) {
            const teamNamesPoints = await GetTeamNamesPoints(session.roomId);
            for (const teamNamePoints of teamNamesPoints) {
              io.to(`RoomTeam${teamNamePoints.RoomTeam_Id}`).emit(
                "sendTeamPoints",
                teamNamePoints.Points
              );
            }
            const gamePlayResult = await GamePlayStructure.Create(session);
            await NextRandomQuestion();
            // занесение необходимых данных в game_results tables
            createGameResultStructure(gamePlayResult);
          }
        }
      );
    }
  });

  async function getCanStartGameMessage() {
    let message = "true";
    await RoomTeam.findAll({
      where: { Room_Id: session.roomId, Team_Id: { [Op.gt]: 0 } },
      raw: true
    })
      .then(roomTeams => {
        if (roomTeams.length < 1) message = "noTeams";
        else if (
          roomTeams.filter(roomTeam => roomTeam.ReadyState == false).length > 0
        )
          message = "teamsNotReady";
      })
      .catch(err => console.log(err));
    return message;
  }

  socket.on("getCanStartGame", async function() {
    if (session.isRoomCreator)
      socket.emit("receiveCanStartGame", await getCanStartGameMessage());
  });

  socket.on("writeOffers", async offerIds => {
    if (offerIds) {
      await RoomTeam.findOne({
        where: { RoomTeamId: session.roomTeamId }
      })
        .then(async roomTeam => {
          await RoomOfferAnswer.destroy({
            where: {
              RoomPlayer_Id: session.roomPlayersId
            }
          })
            .then(async () => {
              for await (const offerId of offerIds) {
                await RoomOfferAnswer.create({
                  RoomPlayer_Id: session.roomPlayersId,
                  RoomTeam_Id: roomTeam.RoomTeamId,
                  Room_Id: session.roomId,
                  Answer_Id: offerId
                }).catch(err => console.log(err));
              }
              console.log(`session emit to RoomTeam ${roomTeam.RoomTeamId}`);
              io.to(`RoomTeam${roomTeam.RoomTeamId}`).emit(
                "sendOffersChanges",
                await GetOffersUsersFIOs(roomTeam.RoomTeamId)
              );
            })
            .catch(err => console.log(err));
        })
        .catch(err => console.log(err));
    }
  });

  socket.on("GamePreparation", current => {
    io.to(`RoomPlayers${session.roomId}`).emit("GamePreparationTick", current);
  });

  socket.on("getGroupStatus", player => {
    RoomTeam.findOne({
      where: { Room_Id: player.RoomId, Team_Id: player.TeamId },
      raw: true
    }).then(roomTeam => {
      if (roomTeam)
        io.to(`RoomUsers${session.roomId}`).emit(
          "sendGroupStatus",
          player.TeamId,
          roomTeam.ReadyState
        );
    });
  });

  socket.on("GroupReadyClick", () => {
    RoomPlayer.findOne({
      where: {
        RoomPlayersId: session.roomPlayersId,
        Room_Id: session.roomId,
        Team_Id: session.TeamId,
        isGroupCoach: true
      }
    })
      .then(groupCoach => {
        if (groupCoach) {
          RoomTeam.findOne({
            where: { Room_Id: session.roomId, Team_Id: session.TeamId }
          })
            .then(roomTeam => {
              if (roomTeam)
                roomTeam
                  .update({
                    ReadyState: !roomTeam.ReadyState
                  })
                  .then(() => {
                    socket.emit("MyGroupReadyState", roomTeam.ReadyState);
                    io.to(`RoomUsers${session.roomId}`).emit(
                      "GroupReady",
                      roomTeam.ReadyState,
                      session.TeamId
                    );
                  });
            })
            .catch(err => console.log(err));
        }
      })
      .catch(err => console.log(err));
  });

  function FinishGame() {
    GamePlay.findAll({ where: { Room_Id: session.roomId } })
      .then(gamePlays => {
        const gamePlayIds = gamePlays.map(gamePlay => gamePlay.GamePlayId);
        GamePlayCategory.findAll({
          where: { GamePlay_Id: gamePlayIds }
        })
          .then(gamePlayCategories => {
            const answerTimers = ANSWERING_TIMERS.filter(
              answeringTimer => answeringTimer.RoomId == session.roomId
            );
            if (answerTimers.length > 0)
              answerTimers.map(answerTimer => clearTimeout(answerTimer.timer));
            const checkTimers = CHECKING_TIMERS.filter(
              checkingTimer => checkingTimer.RoomId == session.roomId
            );
            if (checkTimers.length > 0)
              checkTimers.map(checkTimer => clearTimeout(checkTimer.timer));
            GamePlayQuestion.destroy({
              where: {
                GamePlayCategory_Id: gamePlayCategories.map(
                  gamePlayCategory => gamePlayCategory.GamePlayCategoryId
                )
              }
            }).catch(err => console.log(err));
            GamePlayCategory.destroy({
              where: {
                GamePlay_Id: gamePlayIds
              }
            }).catch(err => console.log(err));

            if (gamePlays.length > 0) {
              GamePlay.destroy({
                where: {
                  GamePlayId: gamePlayIds
                }
              }).catch(err => console.log(err));
            }
            io.to(`RoomUsers${session.roomId}`).emit("GameFinished");
          })
          .catch(err => console.log(err));
      })
      .catch(err => console.log(err));
    RoomTeam.findAll({
      where: {
        Room_Id: session.roomId
      }
    }).then(roomTeams => {
      Promise.all(
        roomTeams.map(async roomTeam => roomTeam.update({ Points: 0 }))
      );
    });
  }

  socket.on("FinishGame", () => {
    if (session.isRoomCreator) {
      FinishGame();
    }
  });
}

module.exports = NewGamePlayGeneration;
