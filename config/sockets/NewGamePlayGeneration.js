const Category = require("../../models/Category");
const Question = require("../../models/Question");
const Answer = require("../../models/Answer");
const Room = require("../../models/Room");
const RoomTeam = require("../../models/RoomTeam");
const RoomPlayer = require("../../models/RoomPlayer");
const Game = require("../../models/Game");
const GamePlay = require("../../models/GamePlay");
const GamePlayCategory = require("../../models/GamePlayCategory");
const GamePlayQuestion = require("../../models/GamePlayQuestion");
const RoomOfferAnswer = require("../../models/RoomOfferAnswer");
const User = require("../../models/User");
const util = require("util");

function NewGamePlayGeneration(socket, io) {
  const { session } = socket.request;

  function getRandomInt(max) {
    return Math.floor(Math.random() * Math.floor(max));
  }

  socket.on("gameStarted", async roomId => {
    if (session.isRoomCreator) {
      // TODO: roomPlayers, roomTeams destroy при входе в комнату, чтобы не было вдруг there is no roomId in session

      // TODO: проверить работоспособность RemoveGamePlayStructure
      // await RemoveGamePlayStructure();

      await CreateGamePlayStructure();

      Room.findOne({ where: { RoomId: roomId }, raw: true })
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
  });

  socket.on("writeOffers", async offerIds => {
    let usersFioOffers = [];
    if (offerIds) {
      await RoomTeam.findOne({
        where: { Room_Id: session.roomId, Team_Id: session.TeamId }
      })
        .then(async roomTeam => {
          console.log({ offerIds });
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
              // .then(async () => {
              await RoomOfferAnswer.findAll({
                where: {
                  RoomTeam_Id: roomTeam.RoomTeamId
                },
                raw: true
              }).then(async roomOfferAnswers => {
                // roomPlayer answerid roomteamid
                // OFFERS == ANSWER_IDS ARRAY !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
                console.log({ roomOfferAnswers });
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
                // найти все ответы для определенного roomPlayerId в roomOfferAnswers
                console.log("RoomPlayersOffers");
                console.log(
                  util.inspect(roomPlayersOffers, {
                    showHidden: false,
                    depth: null
                  })
                );
                await RoomPlayer.findAll({
                  where: {
                    RoomPlayersId: roomPlayersOffers.map(
                      roomPlayerOffer => roomPlayerOffer.RoomPlayerId
                    )
                  },
                  raw: true
                }).then(roomPlayers => {
                  console.log({ roomPlayers });
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
                  console.log("usersOffers");
                  console.log(
                    util.inspect(usersOffers, {
                      showHidden: false,
                      depth: null
                    })
                  );
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
                  console.log("usersFioOffers");
                  console.log(
                    util.inspect(usersFioOffers, {
                      showHidden: false,
                      depth: null
                    })
                  );
                });
              });
              // })
              // .catch(err => console.log(err));
              // }
            })
            .catch(err => console.log(err));
          console.log("offersUsers");
          console.log(
            util.inspect(usersFioOffers, {
              showHidden: false,
              depth: null
            })
          );
          // TODO: emit to somebody?
          socket.emit("sendOffersChanges", usersFioOffers);
        })
        .catch(err => console.log(err));
    }
  });

  socket.on("GamePreparation", current => {
    io.to(`RoomPlayers${session.roomId}`).emit("GamePreparationTick", current);
  });

  socket.on("RemoveGamePlayStructure", (roomId, gameId) => {
    RemoveGamePlayStructure();
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
  // TODO: будет удалять каждый игрок, хотя можно сделать, чтобы удалял запрос только коуча, если коуч вышел, то следующего игрока в команде,
  // пока таковой не будет найден.
  // TODO: подумать чтобы сделать его более ассинхронным, вместо for or -> promise.all
  async function RemoveGamePlayStructure() {
    await Room.findOne({ where: { RoomId: session.roomId } })
      .then(async room => {
        await GamePlay.findOne({
          where: { Game_Id: room.Game_Id, Room_Id: room.RoomId }
        })
          .then(async gamePlay => {
            if (gamePlay) {
              await GamePlayCategory.findAll({
                where: { GamePlay_Id: gamePlay.dataValues.GamePlayId }
              })
                .then(async gamePlayCategories => {
                  if (gamePlayCategories.length > 0)
                    for await (const gamePlayCategory of gamePlayCategories) {
                      await GamePlayQuestion.destroy({
                        where: {
                          GamePlayCategory_Id:
                            gamePlayCategory.dataValues.GamePlayCategoryId
                        }
                      });
                      await gamePlayCategory.destroy();
                    }
                })
                .catch(err => console.log(err));
              await GamePlay.RemoveStreamImage(
                gamePlay.dataValues.GamePlayId,
                function() {}
              );
              await gamePlay.destroy();
            }
          })
          .catch(err => console.log(err));
      })
      .catch(err => console.log(err));
  }

  async function CreateGamePlayStructure() {
    /*                          GamePlay Structure                      */
    await Room.findOne({ where: { RoomId: session.roomId } }).then(
      async room => {
        await Game.findOne({ raw: true, where: { GameId: room.Game_Id } })
          .then(async game => {
            if (game)
              await GamePlay.findOrCreate({
                raw: true,
                where: { Game_Id: game.GameId, Room_Id: room.RoomId },
                defaults: {
                  GamePlayId: 0,
                  CurrentQuestionId: 0,
                  StartTime: getUnixTime(),
                  StopTime: 0,
                  Room_Id: room.RoomId
                }
              })
                .then(async ([gamePlay, created]) => {
                  await Category.findAll({
                    raw: true,
                    where: { Game_Id: game.GameId }
                  })
                    .then(async categories => {
                      if (categories.length > 0)
                        for await (const C of categories) {
                          await GamePlayCategory.findOrCreate({
                            raw: true,
                            where: {
                              Category_Id: C.CategoryId,
                              GamePlay_Id: gamePlay.GamePlayId
                            }
                          })
                            .then(async ([gamePlayCategory, created]) => {
                              await Question.findAll({
                                raw: true,
                                where: { Category_Id: C.CategoryId }
                              })
                                .then(async questions => {
                                  for await (const Q of questions) {
                                    await GamePlayQuestion.findOrCreate({
                                      raw: true,
                                      where: {
                                        Question_Id: Q.QuestionId,
                                        GamePlayCategory_Id:
                                          gamePlayCategory.GamePlayCategoryId
                                      }
                                    }).catch(err => console.log(err));
                                  }
                                })
                                .catch(err => console.log(err));
                            })
                            .catch(err => console.log(err));
                        }
                    })
                    .catch(err => console.log(err));
                })
                .catch(err => console.log(err));
          })
          .catch(err => console.log(err));
      }
    );
  }
}

function getUnixTime() {
  return Math.floor(new Date() / 1000);
}

module.exports = NewGamePlayGeneration;
