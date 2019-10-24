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

  // const NextRandomQuestion = require("./NextRandomQuestion");
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
                      console.log(
                        "it emited and then it started to find new question"
                      );
                      io.to(`RoomUsers${session.roomId}`).emit("end game");
                      return (canDelete = false);
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
  // TODO: поменять - при каждом запросе ищет все команды
  async function GetTeamsPoints() {
    let sortedTeamNamesPoints = [];
    await RoomTeam.findAll({
      where: { Room_Id: session.roomId },
      raw: true
    })
      .then(async roomTeams => {
        roomTeams.sort(function(a, b) {
          return a.Points - b.Points;
        });
        await Team.findAll({
          where: {
            TeamId: roomTeams.map(roomTeam => roomTeam.Team_Id)
          }
        })
          .then(teams => {
            // .filter заодно убирает команду -1 создателя, тк такой не существует
            sortedTeamNamesPoints = teams.map(team => {
              return {
                TeamId: team.TeamId,
                TeamName: team.TeamName,
                Points: roomTeams
                  .filter(roomTeam => roomTeam.Team_Id == team.TeamId)
                  .map(roomTeam => roomTeam.Points)[0]
              };
            });
          })
          .catch(err => console.log(err));
        // console.log({ session });
      })
      .catch(err => console.log(err));
    return sortedTeamNamesPoints;
  }

  async function checkAnswers(roomTeamId) {
    let result = true;
    // console.log({ session });
    // console.log({ id: roomTeamId });

    await RoomOfferAnswer.findAll({
      where: { RoomTeam_Id: roomTeamId },
      raw: true
    })
      .then(async roomOffersAnswers => {
        // console.log({
        //   offers: roomOffersAnswers,
        //   roomOffersAnswers
        // });
        // console.log({
        //   mapThis: roomOffersAnswers.map(
        //     roomOfferAnswer => roomOfferAnswer.Answer_Id
        //   )
        // });
        if (roomOffersAnswers.length > 0) {
          console.log("it passed");
          const votesAnswers = roomOffersAnswers
            .map(roomOfferAnswer => {
              return {
                Votes: roomOffersAnswers.filter(roomOfferAnswer2 => {
                  // console.log({ roomOfferAnswer, roomOfferAnswer2 });
                  return (
                    roomOfferAnswer2.RoomPlayer_Id ==
                    roomOfferAnswer.RoomPlayer_Id
                  );
                }).length,
                Answer_Id: roomOfferAnswer.Answer_Id
              };
            })
            .sort(function(a, b) {
              return b.Points - a.Points;
            });
          // console.log({ votesAnswers });
          if (
            votesAnswers.length > 1 &&
            votesAnswers[0].Votes == votesAnswers[1].Votes
          )
            result = false;
          else
            await Answer.findOne({
              where: { AnswerId: votesAnswers[0].Answer_Id }
            })
              .then(answer => {
                result = answer.Correct;
              })
              .catch(err => console.log(err));
        } else result = false;
      })
      .catch(err => console.log(err));
    await RoomOfferAnswer.destroy({
      where: {
        RoomTeam_Id: roomTeamId
      }
    });
    return result;
  }

  async function NextRandomQuestion() {
    const { question, answers, type, category } = await GetRandomQuestion();
    // console.log({ id: question.QuestionId });

    // console.log({ sessionBeforeCreatingTimer: session });
    createAnsweringTimer(
      session.roomId,
      // function()
      sendRandomQuestion,
      // this function() params
      question,
      answers,
      type,
      category
    );
  }

  function createAnsweringTimer(
    roomId,
    callback,
    question,
    answers,
    type,
    category
  ) {
    // let addedPoints = 0;
    callback(question, answers, type, category);
    const answeringTimer = {
      timer: setTimeout(async function() {
        const checkingTimer = {
          timer: setTimeout(async function() {
            const canDelete = await DeleteGamePlayQuestion(category, question);
            // console.log({ canDelete });
            if (canDelete) await NextRandomQuestion();
          }, 5 * 1000),
          roomId
        };
        // проверяет ответы отдельной команды. Тк в сессии creatora
        RoomTeam.findAll({ where: { Team_Id: { [Op.gt]: 0 } } })
          .then(async roomTeams => {
            // console.log({ OpgtRoomTeam: roomTeams });
            if (roomTeams) {
              // TODO: позже попробовать переделать под Promise.all() и map()
              let teamIdsAddedPoints = {};
              for await (const roomTeam of roomTeams) {
                const isAnswerCorrect = await checkAnswers(roomTeam.RoomTeamId);
                teamIdsAddedPoints[roomTeam.Team_Id] =
                  question.QuestionCost * isAnswerCorrect;
                await roomTeam
                  .update({
                    Points:
                      roomTeam.Points + question.QuestionCost * isAnswerCorrect
                  })
                  .catch(err => console.log(err));
              }

              const teamNamesPoints = await GetTeamsPoints();
              // console.log({ teamNamesPoints, roomTeams });
              for await (const roomTeam of roomTeams) {
                const userTeamNamePoints = teamNamesPoints.find(
                  teamNamePoints => teamNamePoints.TeamId == roomTeam.Team_Id
                );

                io.to(`RoomTeam${roomTeam.RoomTeamId}`).emit(
                  "BreakBetweenQuestions",
                  answers.filter(answer => answer.Correct),
                  teamNamesPoints,
                  userTeamNamePoints,
                  teamIdsAddedPoints[roomTeam.Team_Id.toString()]
                );
              }
            }
          })
          .catch(err => console.log(err));
        CHECKING_TIMERS.push(checkingTimer);
      }, question.AnswerTime * 1000),
      roomId
    };
    ANSWERING_TIMERS.push(answeringTimer);
  }

  function getRandomInt(max) {
    return Math.floor(Math.random() * Math.floor(max));
  }

  function getTimer(roomId) {}

  socket.on("gameStarted", async () => {
    // console.log({ isRoomCreator: session.isRoomCreator });
    if (session.isRoomCreator) {
      // TODO: roomPlayers, roomTeams destroy при входе в комнату, чтобы не было вдруг there is no roomId in session
      // TODO: проверить работоспособность RemoveGamePlayStructure
      // await RemoveGamePlayStructure();
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
    // console.log({ session });
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
                // console.log("RoomPlayersOffers");
                // console.log(
                //   util.inspect(roomPlayersOffers, {
                //     showHidden: false,
                //     depth: null
                //   })
                // );
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
                  // console.log("usersOffers");
                  // console.log(
                  //   util.inspect(usersOffers, {
                  //     showHidden: false,
                  //     depth: null
                  //   })
                  // );
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
                  // console.log("usersFioOffers");
                  // console.log(
                  //   util.inspect(usersFioOffers, {
                  //     showHidden: false,
                  //     depth: null
                  //   })
                  // );
                });
              });
            })
            .catch(err => console.log(err));
          // console.log("offersUsers");
          // console.log(
          //   util.inspect(usersFioOffers, {
          //     showHidden: false,
          //     depth: null
          //   })
          // );
          console.log({ session });
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

  socket.on("RemoveGamePlayStructure", (roomId, gameId) => {
    GamePlayStructure.Remove(session);
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
}

module.exports = NewGamePlayGeneration;
