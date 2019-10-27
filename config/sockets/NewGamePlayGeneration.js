const util = require("util");
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
const User = require("../../models/User");
const Team = require("../../models/Team");

const ANSWERING_TIMERS = [];
const CHECKING_TIMERS = [];

function NewGamePlayGeneration(socket, io) {
  const { session } = socket.request;
  const GamePlayStructure = require("./GamePlayStructure");

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
                  // console.log({
                  //   gamePlayCategories,
                  //   gamePlayCategory,
                  //   randomInd
                  // });
                  await Category.findOne({
                    where: {
                      CategoryId: gamePlayCategory.Category_Id
                    },
                    raw: true
                  })
                    .then(async category => {
                      // console.log({ category });
                      await GamePlayQuestion.findAll({
                        where: {
                          GamePlayCategory_Id:
                            gamePlayCategory.GamePlayCategoryId
                        },
                        raw: true
                      })
                        .then(async gamePlayQuestions => {
                          // console.log({
                          //   gamePlayQuestions,
                          //   len: gamePlayQuestions.length
                          // });
                          const randomInd2 = getRandomInt(
                            gamePlayQuestions.length
                          );
                          const gamePlayQuestion =
                            gamePlayQuestions[randomInd2];
                          // console.log({
                          //   gamePlayQuestion,
                          //   randomInd2
                          // });
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
                          // }
                        })
                        .catch(err => console.log(err));
                    })
                    .catch(err => console.log(err));
                  // }
                })
                .catch(err => console.log(err));
          })
          .catch(err => console.log(err));
      })
      .catch(err => console.log(err));
    // console.log("result: ");
    // console.log(
    //   util.inspect(result, {
    //     showHidden: false,
    //     depth: null
    //   })
    // );
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
                  // console.log({
                  //   idToDestroy: gamePlayQuestion.Question_Id
                  // });

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

  async function GetTeamsPoints() {
    let sortedTeamNamesPoints = [];
    await RoomTeam.findAll({
      where: { Room_Id: session.roomId },
      raw: true
    })
      .then(async roomTeams => {
        await Team.findAll({
          where: {
            TeamId: roomTeams.map(roomTeam => roomTeam.Team_Id)
          }
        })
          .then(teams => {
            // .filter заодно убирает команду -1 создателя, тк такой не существует
            sortedTeamNamesPoints = teams
              .map(team => {
                return {
                  TeamId: team.TeamId,
                  TeamName: team.TeamName,
                  Points: roomTeams
                    .filter(roomTeam => roomTeam.Team_Id == team.TeamId)
                    .map(roomTeam => roomTeam.Points)[0]
                };
              })
              .sort(function(a, b) {
                return b.Points - a.Points;
              });
          })
          .catch(err => console.log(err));
      })
      .catch(err => console.log(err));
    return sortedTeamNamesPoints;
  }

  async function checkTeamAnswers(roomTeamId) {
    let result = false;
    await RoomOfferAnswer.findAll({
      where: { RoomTeam_Id: roomTeamId },
      raw: true
    })
      .then(async roomOffersAnswers => {
        if (roomOffersAnswers.length > 0)
          await Answer.findAll({
            where: {
              AnswerId: roomOffersAnswers.map(
                roomOfferAnswer => roomOfferAnswer.Answer_Id
              )
            },
            raw: true
          })
            .then(async answers => {
              const correctAnswersIds = answers
                .filter(answer => answer.Correct)
                .map(answer => answer.AnswerId);

              const votesAnswers = {};
              for (const roomOfferAnswer of roomOffersAnswers) {
                // { Answer_Id : roomOfferAnswer with this Answer_Id }
                votesAnswers[
                  roomOfferAnswer.Answer_Id
                ] = roomOffersAnswers.filter(roomOfferAnswer2 => {
                  return (
                    roomOfferAnswer2.RoomPlayer_Id ==
                    roomOfferAnswer.RoomPlayer_Id
                  );
                });
              }

              let maxVotedAnswer = { Answer_Id: 0, Votes: [] };
              for (const [answerId, votes] of Object.entries(votesAnswers)) {
                if (votes.length > maxVotedAnswer.Votes.length)
                  maxVotedAnswer = { Answer_Id: answerId, Votes: votes };
              }

              const dominantVotesAnswers = {};
              for (const [answerId, votes] of Object.entries(votesAnswers)) {
                if (votes.length == maxVotedAnswer.Votes.length)
                  dominantVotesAnswers[answerId] = votes;
              }
              if (
                Object.keys(dominantVotesAnswers).length ==
                correctAnswersIds.length
              ) {
                result = true;
                for (const [answerId, votes] of Object.entries(
                  dominantVotesAnswers
                )) {
                  if (!correctAnswersIds.includes(parseInt(answerId, 10))) {
                    console.log("result false");
                    result = false;
                    break;
                  }
                }
              }
            })
            .catch(err => console.log(err));
      })
      .catch(err => console.log(err));

    await RoomOfferAnswer.destroy({
      where: {
        RoomTeam_Id: roomTeamId
      }
    }).catch(err => console.log(err));
    return result;
  }

  async function AddRoomTeamsPoints(roomTeams, question) {
    const teamIdsAddedPoints = {};
    for await (const roomTeam of roomTeams) {
      const isAnswerCorrect = await checkTeamAnswers(roomTeam.RoomTeamId);
      teamIdsAddedPoints[roomTeam.Team_Id] =
        question.QuestionCost * isAnswerCorrect;
      await roomTeam
        .update({
          Points: roomTeam.Points + question.QuestionCost * isAnswerCorrect
        })
        .catch(err => console.log(err));
    }
    return teamIdsAddedPoints;
  }
  function checkAnswers(question) {
    RoomTeam.findAll({ where: { Team_Id: { [Op.gt]: 0 } } })
      .then(async roomTeams => {
        if (roomTeams) {
          const teamIdsAddedPoints = await AddRoomTeamsPoints(
            roomTeams,
            question
          );

          const teamNamesPoints = await GetTeamsPoints();
          for (const roomTeam of roomTeams) {
            io.to(`RoomTeam${roomTeam.RoomTeamId}`).emit(
              "BreakBetweenQuestions",
              teamNamesPoints,
              teamNamesPoints.find(
                teamNamePoints => teamNamePoints.TeamId == roomTeam.Team_Id
              ),
              teamIdsAddedPoints[roomTeam.Team_Id.toString()]
            );
          }
        }
      })
      .catch(err => console.log(err));
  }

  function runTimers(RoomId, callback, question, answers, type, category) {
    callback(question, answers, type, category);
    const answeringTimer = {
      timer: setTimeout(async function() {
        const checkingTimer = {
          timer: setTimeout(async function() {
            const canDelete = await DeleteGamePlayQuestion(category, question);
            if (canDelete) await NextRandomQuestion();
          }, 5 * 1000),
          RoomId
        };
        // проверяет ответы отдельной команды. Тк в сессии creator
        checkAnswers(question);
        CHECKING_TIMERS.push(checkingTimer);
      }, question.AnswerTime * 1000),
      RoomId
    };
    ANSWERING_TIMERS.push(answeringTimer);
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

  socket.on("gameStarted", async () => {
    if (session.isRoomCreator) {
      // TODO: roomPlayers, roomTeams destroy при входе в комнату, чтобы не было вдруг there is no roomId in session
      await GamePlayStructure.Create(session);
      await NextRandomQuestion();
    }
  });

  async function getCanStartGameMessage() {
    let message = "true";
    await RoomTeam.findAll({
      where: { Room_Id: session.roomId },
      raw: true
    })
      .then(roomTeams => {
        // создатель считается за команду с Team_Id -1
        if (roomTeams.length == 1) message = "noTeams";
        else if (
          roomTeams.filter(
            roomTeam => roomTeam.ReadyState == false && roomTeam.Team_Id > 0
          ).length > 0
        )
          message = "teamsNotReady";
      })
      .catch(err => console.log(err));
    // console.log({ message });
    return message;
  }

  socket.on("getCanStartGame", async function() {
    if (session.isRoomCreator)
      socket.emit("receiveCanStartGame", await getCanStartGameMessage());
  });

  socket.on("writeOffers", async offerIds => {
    let usersFioOffers = [];
    if (offerIds) {
      await RoomTeam.findOne({
        where: { Room_Id: session.roomId, Team_Id: session.TeamId }
      })
        .then(async roomTeam => {
          // console.log({ roomTeam });
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
                  Answer_Id: offerId
                }).catch(err => console.log(err));
              }
              await RoomOfferAnswer.findAll({
                where: {
                  RoomTeam_Id: roomTeam.RoomTeamId
                },
                raw: true
              }).then(async roomOfferAnswers => {
                let usersOffers = [];

                const roomPlayersOffers = await roomOfferAnswers.map(
                  roomOfferAnswer => {
                    return {
                      RoomPlayerId: roomOfferAnswer.RoomPlayer_Id,
                      Offers: roomOfferAnswers
                        .filter(
                          roomOfferAnswer2 =>
                            roomOfferAnswer2.RoomPlayer_Id ==
                            roomOfferAnswer.RoomPlayer_Id
                        )
                        .map(roomOfferAnswer3 => roomOfferAnswer3.Answer_Id)
                    };
                  }
                );

                await RoomPlayer.findAll({
                  where: {
                    RoomPlayersId: roomPlayersOffers.map(
                      roomPlayerOffer => roomPlayerOffer.RoomPlayerId
                    )
                  },
                  raw: true
                }).then(roomPlayers => {
                  // console.log({ roomPlayers });
                  usersOffers = roomPlayers.map(roomPlayer => {
                    return {
                      UserId: roomPlayer.User_Id,
                      Offers: roomPlayersOffers.filter(
                        roomPlayerOffer =>
                          roomPlayerOffer.RoomPlayerId ==
                          roomPlayer.RoomPlayersId
                      )[0].Offers
                    };
                  });
                });
                await User.findAll({
                  where: {
                    UserId: usersOffers.map(userOffer => userOffer.UserId)
                  },
                  raw: true
                }).then(async users => {
                  usersFioOffers = users.map(user => {
                    return {
                      UserFIO: `${user.UserFamily} ${user.UserName.slice(
                        0,
                        1
                      )}. ${user.UserLastName.slice(0, 1)}.`,
                      Offers: usersOffers.filter(
                        userOffers => userOffers.UserId == user.UserId
                      )[0].Offers
                    };
                  });
                });
              });
            })
            .catch(err => console.log(err));

          console.log(`session emit to RoomTeam ${roomTeam.RoomTeamId}`);
          io.to(`RoomTeam${roomTeam.RoomTeamId}`).emit(
            "sendOffersChanges",
            usersFioOffers
          );
        })
        .catch(err => console.log(err));
    }
  });

  socket.on("GamePreparation", current => {
    io.to(`RoomPlayers${session.roomId}`).emit("GamePreparationTick", current);
  });

  socket.on("StopGamePreparation", () => {
    if (session.isRoomCreator)
      io.to(`RoomPlayers${session.roomId}`).emit("StopGamePreparationTick");
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
    GamePlay.findOne({ where: { Room_Id: session.roomId } })
      .then(gamePlay => {
        GamePlayCategory.findAll({
          where: { GamePlay_Id: gamePlay.GamePlayId }
        })
          .then(gamePlayCategories => {
            const answerTimer = ANSWERING_TIMERS.find(
              answeringTimer => answeringTimer.RoomId == session.roomId
            );
            if (answerTimer) clearTimeout(answerTimer.timer);

            const checkTimer = CHECKING_TIMERS.find(
              checkingTimer => checkingTimer.RoomId == session.roomId
            );
            if (checkTimer) clearTimeout(checkTimer.timer);
            GamePlayQuestion.destroy({
              where: {
                GamePlayCategory_Id: gamePlayCategories.map(
                  gamePlayCategory => gamePlayCategory.GamePlayCategoryId
                )
              }
            }).catch(err => console.log(err));
            GamePlayCategory.destroy({
              where: { GamePlay_Id: gamePlay.GamePlayId }
            }).catch(err => console.log(err));
            if (gamePlay) gamePlay.destroy().catch(err => console.log(err));
            io.to(`RoomUsers${session.roomId}`).emit("GameFinished");
          })
          .catch(err => console.log(err));
      })
      .catch(err => console.log(err));
  }

  socket.on("FinishGame", () => {
    console.log({ session });
    if (session.isRoomCreator) {
      FinishGame();
    }
  });
}

module.exports = NewGamePlayGeneration;
