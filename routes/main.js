/* eslint-disable prettier/prettier */
/* eslint-disable no-restricted-syntax */
const formidable = require("formidable");
const nodeMailer = require("nodemailer");
const Sequelize = require("sequelize");
const { Op } = require("sequelize");
const fs = require("fs");
const crypto = require("crypto");
const Hash = require("password-hash");
const GamePlay = require("../models/GamePlay");
const GamePlayCategory = require("../models/GamePlayCategory");
const Answer = require("../models/Answer");
const TeamResult = require("../models/TeamResult");
const UserResult = require("../models/UserResult");
const TeamResultQuestion = require("../models/TeamResultQuestion");
const UserResultQuestion = require("../models/UserResultQuestion");
const GameResult = require("../models/GameResult");
const {
  router,
  passport,
  Team,
  Game,
  GameTeam,
  app,
  urlencodedParser,
  io,
  Category,
  Question,
  User,
  Room
} = require("../config/routers-config");
const RoomPlayers = require("../models/RoomPlayer");
const RoomTeam = require("../models/RoomTeam");

router.get("/", RedirectRules, function(req, res) {
  res.render("index", { Code: req.query.Code, User: req.query.User });
});

router.get("/rooms", app.protect, function(req, res) {
  Room.findAll({ raw: true })
    .then(async rooms => {
      const roomModels = [];
      for await (const room of rooms) {
        await RoomPlayers.count({
          where: { Room_Id: room.RoomId, isRoomCreator: false }
        })
          .then(async NumRoomPlayers => {
            await User.findOne({
              where: { UserId: room.RoomCreatorId },
              raw: true
            })
              .then(userCreator => {
                roomModels.push({
                  roomId: room.RoomId,
                  roomName: room.RoomName,
                  roomCreator: `${
                    userCreator.UserFamily
                    } ${userCreator.UserName.slice(
                      0,
                      1
                    )}. ${userCreator.UserLastName.slice(0, 1)}.`,
                  roomCreatorId: userCreator.UserId,
                  roomTag: room.RoomTag,
                  maxTeamPlayers: room.RoomMaxTeamPlayers,
                  usersOnline: NumRoomPlayers
                });
              })
              .catch(err => {
                console.log(err);
              });
          })
          .catch(err => {
            console.log(err);
          });
      }
      Game.findAll({
        where: { QuizCreatorId: req.session.passport.user },
        raw: true
      }).then(games => {
        res.render("rooms", { roomModels, games });
      });
    })
    .catch(err => console.log(err));
});

router.get("/team/:TeamTag/results", app.protect, (req, res) => {
  Team.findOne({ where: { TeamTag: req.params.TeamTag }, raw: true })
    .then(team => {
      TeamResult.findAll({
        where: { Team_Id: team.TeamId },
        raw: true
      })
        .then(async teamResults => {
          // FIXME: stopped here
          GameResult.hasMany(TeamResult, { foreignKey: "GameResult_Id" });
          TeamResult.belongsTo(GameResult, { foreignKey: "GameResult_Id" });
          TeamResult.hasMany(TeamResultQuestion, {
            foreignKey: "TeamResult_Id"
          });
          TeamResultQuestion.belongsTo(TeamResult, {
            foreignKey: "TeamResult_Id"
          });
          const teamGamesQuestionsResults = await TeamResult.findAll({
            where: {
              GameResult_Id: teamResults.map(
                teamResult => teamResult.GameResult_Id
              )
            },
            include: [
              { model: GameResult }, { model: TeamResultQuestion }
            ],
            order: [[GameResult, "Timestamp", "ASC"], ["TeamPoints", "DESC"]]
          }).map(teamGameQuestionsResult => teamGameQuestionsResult.get({ plain: true }));

          console.log({
            teamGamesQuestionsResults,
            gameResults: teamGamesQuestionsResults.map(
              teamGameResult => teamGameResult.game_result
            ),
            gameQ: teamGamesQuestionsResults.map(
              teamGameResult => teamGameResult.game_result
            )
          });
          res.render("teamResult", {
            teamGamesQuestionsResults
          });
        })
        .catch(err => console.log(err));
    })
    .catch(err => console.log(err));
});

// router.get("/user/:userId/results", app.protect, function(req, res) {
//   User.findOne({ where: { TeamTag: req.params.userId }, raw: true })
//     .then(user => {
//       UserResult.findAll({
//         where: { User_Id: user.UserId },
//         raw: true
//       })
//         .then(async teamResults => {
//           // FIXME: stopped here
//           GameResult.hasMany(TeamResult, { foreignKey: "GameResult_Id" });
//           TeamResult.belongsTo(GameResult, { foreignKey: "GameResult_Id" });
//           const teamsGamesResults = await TeamResult.findAll({
//             where: {
//               GameResult_Id: teamResults.map(
//                 teamResult => teamResult.GameResult_Id
//               )
//             },
//             include: [GameResult],
//             order: [[GameResult, "Timestamp", "ASC"], ["TeamPoints", "DESC"]]
//           }).map(teamGameResult => teamGameResult.get({ plain: true }));
//           // console.log({
//           //   teamsGamesResults,
//           //   gameResults: teamsGamesResults.map(
//           //     teamGameResult => teamGameResult.game_result
//           //   )
//           // });
//           res.render("teamResult", {
//             teamsGamesResults
//           });
//         })
//         .catch(err => console.log(err));
//     })
//     .catch(err => console.log(err));
// });

function timeConverter(UNIX_timestamp) {
  var date = new Date(UNIX_timestamp * 1000);
  var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var year = date.getFullYear();
  var month = months[date.getMonth()];
  var time = `${year} ${month}`;
  return time;
}

router.get("/team/:TeamTag", app.protect, (req, res) => {
  const users = [];
  let counter = 0;
  Team.findOne({ where: { TeamTag: req.params.TeamTag }, raw: true })
    .then(team => {
      if (team) {
        User.findOne({
          where: { UserId: req.session.passport.user },
          raw: true
        }).then(async user => {
          if (user) {
            await User.findAll({ where: { Team_Id: team.TeamId }, raw: true })
              .then(async members => {
                for (const member of members) {
                  if (member.isCoach) members.coachInd = counter;
                  users.push({
                    isActive: member.UserIsActive,
                    userId: member.UserId,
                    FIO: `${member.UserFamily} ${member.UserName} ${member.UserLastName}`
                  });
                  counter++;
                }
                users.teamName = team.TeamName;
                [users[members.coachInd], users[0]] = [
                  users[0],
                  users[members.coachInd]
                ];
                GameResult.hasMany(TeamResult, { foreignKey: "GameResult_Id" });
                TeamResult.belongsTo(GameResult, { foreignKey: "GameResult_Id" });
                // FIXME: stopped here
                const gamesTeamResults = await TeamResult.findAll({ where: { Team_Id: team.TeamId }, include: [GameResult] }).map(gameTeamResult => gameTeamResult.get({ plain: true }));
                const date = new Date();
                const datesGamesTeamResults = [];
                let countDates = gamesTeamResults.filter(gameTeamResult => gameTeamResult.game_result.Timestamp < Date.now()).length;
                let c = 1;
                console.log({ gamesTeamResults })
                while (countDates > 0) {
                  countDates = gamesTeamResults.filter(gameTeamResult => gameTeamResult.game_result.Timestamp < date.setMonth(date.getMonth() - c)).length;
                  datesGamesTeamResults.push({ TextDate: timeConverter(Math.floor(date.setMonth(date.getMonth() - c) / 1000)), number: countDates })
                  c++;
                }
                res.render("teamPage", {
                  users,
                  isMyTeam: user.Team_Id == team.TeamId,
                  amICoach: user.isCoach,
                  datesGamesTeamResults
                });
              })
              .catch(err => console.log(err));
          }
        });
      } else return res.redirect("/");
    })
    .catch(err => {
      console.log(err);
    });
});

router.get("/user/:userId", app.protect, function(req, res) {
  User.findOne({ where: { UserId: req.params.userId }, raw: true })
    .then(async user => {
      if (req.session.passport.user == user.UserId) user.canEdit = true;
      if (user.Team_Id > 0)
        await Team.findOne({ where: { TeamId: user.Team_Id }, raw: true })
          .then(async team => {
            if (team) {
              user.TeamName = team.TeamName;
              user.TeamTag = team.TeamTag;
              await User.findAndCountAll({ where: { Team_Id: team.TeamId } })
                .then(result => {
                  user.teamPlayersCount = result.count;
                })
                .catch(err => {
                  console.log({
                    file: __filename,
                    func: 'router.get("/user/:userId"), User.findAndCountAll',
                    err
                  });
                });
            }
          })
          .catch(err => {
            console.log({
              file: __filename,
              func: 'router.get("/user/:userId"), User.findOne TeamId',
              err
            });
          });
      res.render("user", { user });
    })
    .catch(err => {
      console.log({
        file: __filename,
        func: 'router.get("/user/:userId"), User.findOne UserId',
        err
      });
    });
});

router.get("/teams", app.protect, function(req, res) {
  Team.findAll({ raw: true })
    .then(async teams => {
      for await (const team of teams) {
        await User.findOne({
          where: { isCoach: 1, Team_Id: team.TeamId },
          raw: true
        })
          .then(coach => {
            team.coachId = coach.UserId;
            team.teamCoachFIO = `${coach.UserFamily} ${coach.UserName.slice(
              0,
              1
            )}. ${coach.UserLastName.slice(0, 1)}.`;
          })
          .catch(err => {
            console.log({
              file: __filename,
              func: 'router.get("/teams"), User.findOne',
              err
            });
          });
        await User.count({ where: { Team_Id: team.TeamId } })
          .then(membersNum => {
            team.membersNum = membersNum;
          })
          .catch(err => {
            console.log({
              file: __filename,
              func: 'router.get("/teams"), User.count',
              err
            });
          });
      }
      await User.findOne({ where: { UserId: req.session.passport.user } }).then(
        user => {
          teams.userTeamId = user.Team_Id;
        }
      );
      res.render("teamsList", { teams });
    })
    .catch(err => {
      console.log({
        file: __filename,
        func: 'router.get("/teams"), Team.findAll',
        err
      });
    });
});

router.get("/users", app.protect, function(req, res) {
  User.findAll({ where: { UserIsActive: true }, raw: true })
    .then(async users => {
      for await (const user of users) {
        user.userFIO = `${user.UserFamily} ${user.UserName.slice(
          0,
          1
        )}. ${user.UserLastName.slice(0, 1)}.`;
        await Team.findOne({ where: { TeamId: user.Team_Id } })
          .then(team => {
            if (team) {
              user.userTeam = team.TeamName;
              user.userTeamId = team.TeamId;
              user.userTeamTag = team.TeamTag;
            }
          })
          .catch(err => {
            console.log({
              file: __filename,
              func: 'router.get("/users"), Team.findOne',
              err
            });
          });
      }

      await User.findOne({ where: { UserId: req.session.passport.user } }).then(
        user => {
          users.senderIsCoach = user.isCoach;
        }
      );

      res.render("usersList", { users });
    })
    .catch(err => {
      console.log({
        file: __filename,
        func: 'router.get("/users"), User.FindAll',
        err
      });
    });
});

router.get("/user", app.protect, function(req, res) {
  if (req.session.passport.user)
    res.redirect(`/user/${req.session.passport.user}`);
});

router.post("/getCurrUserId", urlencodedParser, function(req, res) {
  res.json({ userId: req.session.passport.user });
});

router.get("/home", app.protect, function(req, res) {
  Game.findAll({
    where: { QuizCreatorId: req.session.passport.user },
    raw: true
  })
    .then(async games => {
      for await (const game of games) {
        game.Timestamp = `${new Date(game.Timestamp).getDay()}.${new Date(
          game.Timestamp
        ).getMonth()}.${new Date(game.Timestamp).getFullYear()} ${new Date(
          game.Timestamp
        ).getHours()}:${new Date(game.Timestamp).getMinutes()}`;
        await Category.findAll({
          where: { Game_Id: game.GameId },
          raw: true
        }).then(async categories => {
          for await (const category of categories) {
            await Question.findAll({
              where: { Category_Id: category.CategoryId }
            }).then(questions => {
              game.questionCount = questions.length;
              game.averageAsnwerTime = (function() {
                let questionsTime = 0;
                for (const question of questions) {
                  questionsTime += question.AnswerTime;
                }
                return Math.floor(
                  questionsTime / (questions.length > 0 ? questions.length : 1)
                );
              })();
            });
          }
        });
      }
      res.render("home", { games });
    })
    .catch(err => console.log(err));
});

// FIXME: нормально переписать
router.get("/room/:RoomTag", app.protect, function(req, res) {
  Room.findOne({ where: { RoomTag: req.params.RoomTag }, raw: true })
    .then(room => {
      GamePlay.findOne({ where: { Room_Id: room.RoomId } })
        .then(async gamePlay => {
          let wasGameStarted;
          let isAnsweringTime;
          let currentQuestion;
          let answers;
          let type;
          let isRoomCreator;
          let categoryName;
          if (gamePlay) {
            await GamePlayCategory.findOne({
              where: {
                GamePlay_Id: gamePlay.GamePlayId
              }
            })
              .then(async gamePlayCategory => {
                if (gamePlayCategory)
                  await Category.findOne({
                    where: {
                      CategoryId: gamePlayCategory.Category_Id
                    }
                  })
                    .then(async category => {
                      if (category) {
                        await Question.findOne({
                          where: {
                            QuestionId: gamePlay.CurrentQuestionId
                          }
                        })
                          .then(async currQuestion => {
                            if (currQuestion)
                              await Answer.findAll({
                                where: {
                                  Question_Id: currQuestion.QuestionId
                                }
                              }).then(answersArr => {
                                answers = req.session.isRoomCreator
                                  ? answersArr.filter(answer => answer.Correct)
                                  : answersArr;
                                type =
                                  answersArr.length == 1 ? "text" : "checkbox";
                                currentQuestion = currQuestion;
                              });
                          })
                          .catch(err => console.log(err));
                      }
                      wasGameStarted = !!gamePlay;
                      isAnsweringTime = gamePlay.isAnsweringTime;
                      isRoomCreator = req.session.isRoomCreator;
                      categoryName = category.CategoryName;
                    })
                    .catch(err => console.log(err));
              })
              .catch(err => console.log(err));
          }
          if (room) {
            if (req.session.roomPlayersId) {
              await RoomPlayers.findOne({
                where: { RoomPlayersId: req.session.roomPlayersId }
              })
                .then(roomPlayer => {
                  if (!roomPlayer) {
                    delete req.session.roomTeamId;
                    delete req.session.isGroupCoach;
                    delete req.session.roomId;
                    delete req.session.isRoomCreator;
                    delete req.session.roomPlayersId;
                    // return res.render("info", {
                    //   message:
                    //     "Вы были отключены по причине потери соединения. Обновите Страницу"
                    // });
                  }
                })
                .catch(err => console.log(err));
            }
            if (req.session.passport.user == room.RoomCreatorId)
              req.session.isRoomCreator = true;
            else req.session.isRoomCreator = false;
            await User.findOne({
              where: { UserId: req.session.passport.user },
              raw: true
            })
              .then(user => {
                RoomTeam.findOne({
                  where: { Room_Id: room.RoomId, Team_Id: user.Team_Id }
                })
                  .then(roomTeam => {
                    if (
                      ((roomTeam || req.session.isRoomCreator) && gamePlay) ||
                      !gamePlay
                    ) {
                      if (
                        user &&
                        (req.session.isRoomCreator || user.Team_Id > 0)
                      ) {
                        RoomPlayers.findOne({
                          where: { User_Id: req.session.passport.user },
                          raw: true
                        })
                          .then(roomPlayer => {
                            if (roomPlayer == null) {
                              RoomPlayers.findAll({
                                where: {
                                  Team_Id: user.Team_Id,
                                  Room_Id: room.RoomId
                                }
                              })
                                .then(roomPlayers => {
                                  if (
                                    roomPlayers.length < room.RoomMaxTeamPlayers
                                  ) {
                                    RoomPlayers.findOrCreate({
                                      where: {
                                        Room_Id: room.RoomId,
                                        User_Id: req.session.passport.user,
                                        Team_Id: req.session.isRoomCreator
                                          ? -1
                                          : user.Team_Id,
                                        isRoomCreator:
                                          req.session.isRoomCreator,
                                        isGroupCoach: req.session.isRoomCreator
                                          ? false
                                          : roomPlayers.length == 0
                                      }
                                    })
                                      .then(
                                        async ([
                                          createdRoomPlayer,
                                          created
                                        ]) => {
                                          req.session.roomPlayersId =
                                            createdRoomPlayer.RoomPlayersId;
                                          Team.findOne({
                                            where: {
                                              TeamId: createdRoomPlayer.Team_Id
                                            },
                                            raw: true
                                          })
                                            .then(async team => {
                                              req.session.roomId = room.RoomId;
                                              req.session.TeamId =
                                                createdRoomPlayer.Team_Id;
                                              const player = {
                                                RoomPlayersId:
                                                  createdRoomPlayer.RoomPlayersId,
                                                UserName: user.UserName,
                                                UserFamily: user.UserFamily,
                                                UserLastName: user.UserLastName,
                                                RoomId:
                                                  createdRoomPlayer.Room_Id,
                                                TeamId:
                                                  createdRoomPlayer.Team_Id,
                                                TeamName: createdRoomPlayer.isRoomCreator
                                                  ? ""
                                                  : team.TeamName,
                                                isRoomCreator:
                                                  createdRoomPlayer.isRoomCreator,
                                                isGroupCoach:
                                                  createdRoomPlayer.isGroupCoach
                                              };
                                              await RoomTeam.findOrCreate({
                                                where: {
                                                  Team_Id:
                                                    createdRoomPlayer.Team_Id,
                                                  Room_Id:
                                                    createdRoomPlayer.Room_Id
                                                },
                                                raw: true
                                              })
                                                .then(
                                                  ([roomTeam2, created2]) => {
                                                    req.session.roomTeamId =
                                                      roomTeam2.RoomTeamId;
                                                    req.session.isGroupCoach =
                                                      createdRoomPlayer.isGroupCoach;
                                                    if (
                                                      !req.session.isRoomCreator
                                                    )
                                                      io.to(
                                                        `RoomUsers${room.RoomId}`
                                                      ).emit(
                                                        "AddUserToRoom",
                                                        player
                                                      );
                                                    RoomPlayers.count({
                                                      where: {
                                                        Room_Id: room.RoomId,
                                                        isRoomCreator: false
                                                      }
                                                    })
                                                      .then(roomOnline => {
                                                        io.emit("RoomOnline", {
                                                          roomId: room.RoomId,
                                                          online: roomOnline
                                                        });
                                                        console.log({
                                                          wasGameStarted
                                                        });
                                                        res.render("room", {
                                                          room,
                                                          roomPlayer:
                                                            createdRoomPlayer.dataValues,
                                                          readyState:
                                                            roomTeam2.ReadyState,
                                                          wasGameStarted,
                                                          isAnsweringTime,
                                                          currentQuestion,
                                                          answers,
                                                          type,
                                                          isRoomCreator,
                                                          categoryName
                                                        });
                                                      })
                                                      .catch(err =>
                                                        console.log(err)
                                                      );
                                                  }
                                                )
                                                .catch(err => console.log(err));
                                            })
                                            .catch(err => console.log(err));
                                        }
                                      )
                                      .catch(err => console.log(err));
                                  } else
                                    return res.render("info", {
                                      message:
                                        "Достигнуто максимально число игроков от вашей команды"
                                    });
                                })
                                .catch(err => console.log(err));
                            } else {
                              Room.findOne({
                                where: { roomId: roomPlayer.Room_Id },
                                raw: true
                              })
                                .then(findedRoom => {
                                  if (findedRoom)
                                    if (
                                      req.params.RoomTag == findedRoom.RoomTag
                                    ) {
                                      RoomTeam.findOne({
                                        where: {
                                          Room_Id: findedRoom.RoomId,
                                          Team_Id: req.session.TeamId
                                        }
                                      }).then(roomTeam2 => {
                                        console.log({
                                          wasGameStarted,
                                          gamePlay
                                        });
                                        res.render("room", {
                                          room: findedRoom,
                                          roomPlayer,
                                          readyState: roomTeam2.ReadyState,
                                          wasGameStarted,
                                          isAnsweringTime,
                                          currentQuestion,
                                          answers,
                                          type,
                                          isRoomCreator,
                                          categoryName
                                        });
                                      });
                                    } else
                                      res.redirect(
                                        `/room/${findedRoom.RoomTag}`
                                      );
                                  else
                                    res.redirect(`/room/${req.params.RoomTag}`);
                                })
                                .catch(err => console.log(err));
                            }
                          })
                          .catch(err => console.log(err));
                      } else
                        return res.render("info", {
                          message:
                            "Для участия в игре вам необходимо находиться в команде"
                        });
                    } else {
                      res.render("info", {
                        message:
                          "Игра уже начата и в ней нет кого-либо из вашей команды"
                      });
                    }
                  })
                  .catch(err => console.log(err));
              })
              .catch(err => console.log(err));
          } else
            res.render("info", {
              message: "Такой комнаты не существует либо она была удалена"
            });
        })
        .catch(err => console.log(err));
    })
    .catch(err => console.log(err));
});

router.get("/leaveRoom", app.protect, async function(req, res) {
  if (req.session.roomId)
    await Room.findOne({ where: { RoomId: req.session.roomId }, raw: true })
      .then(async room => {
        if (room) {
          await RoomPlayers.destroy({
            where: { RoomPlayersId: req.session.roomPlayersId }
          })
            .then(async () => {
              if (!req.session.isRoomCreator)
                io.to(`RoomUsers${req.session.roomId}`).emit(
                  "RoomPlayerLeaved",
                  req.session.roomPlayersId
                );
              await RoomPlayers.count({
                where: {
                  Room_Id: room.RoomId,
                  Team_Id: req.session.TeamId
                }
              })
                .then(async roomPlayersNum => {
                  if (req.session.roomTeamId) {
                    if (roomPlayersNum == 0) {
                      await RoomTeam.destroy({
                        where: { RoomTeamId: req.session.roomTeamId }
                      })
                        .then(() => {
                          io.to(`RoomUsers${req.session.roomId}`).emit(
                            "RoomGroupRemoved",
                            req.session.TeamId
                          );
                        })
                        .catch(err => console.log(err));
                    } else {
                      await RoomPlayers.findOne({
                        where: {
                          Room_Id: req.session.roomId,
                          Team_Id: req.session.TeamId
                        }
                      })
                        .then(async roomPlayer => {
                          if (roomPlayer) {
                            await roomPlayer
                              .update({ isGroupCoach: true })
                              .then(newCoach => {
                                io.to(`RoomUsers${req.session.roomId}`).emit(
                                  "NewRoomGroupCoach",
                                  newCoach.get()
                                );
                              })
                              .catch(err => console.log(err));
                          }
                        })
                        .catch(err => console.log(err));
                    }
                  }
                  await RoomPlayers.count({
                    where: { Room_Id: room.RoomId }
                  })
                    .then(roomOnlineresult => {
                      io.emit("RoomOnline", {
                        roomId: room.RoomId,
                        online: roomOnlineresult
                      });
                      delete req.session.roomTeamId;
                      delete req.session.isGroupCoach;
                      delete req.session.roomId;
                      delete req.session.isRoomCreator;
                      delete req.session.roomPlayersId;
                      res.redirect("/");
                    })
                    .catch(err => console.log(err));
                })
                .catch(err => console.log(err));
            })
            .catch(err => console.log(err));
        } else res.redirect("/");
      })
      .catch(err => console.log(err));
  else res.redirect("/");
});

router.post("/RegisterNewUser", urlencodedParser, function(req, res) {
  if (req.body.password === req.body.confirmpassword) {
    if (req.body.password.length > 5) {
      if (validateEmail(req.body.email)) {
        const transporter = nodeMailer.createTransport({
          host: "mail.alexall.dev",
          port: 465,
          secure: true,
          auth: {
            user: "info@teamplay.space",
            pass: "teamplayspace"
          }
        });

        fs.readFile(
          `${__dirname}/../html_mail/TeamPlayVerificationEmail.html`,
          "utf-8",
          function(err, data) {
            if (err) res.end(JSON.stringify(err));
            const html_mail_array = data.split("CONFIRM_NEW_USER_BUTTON");
            const confirmation_hash = crypto
              .randomBytes(Math.ceil(120 / 2))
              .toString("hex") // convert to hexadecimal format
              .slice(0, 120);
            const html_mail = `${html_mail_array[0] + req.protocol}://${
              req.hostname
              }/ConfirmNewUserAccount?confirmation_type=email&security_code=${confirmation_hash}${
              html_mail_array[1]
              }`;

            const mailOptions = {
              from: '"Teamplay info" <info@teamplay.space>', // sender address
              to: req.body.email,
              subject: "Подтвердите регистрацию Teamplay", // Subject line
              html: html_mail
            };

            const UserFio = req.body.fullname.split(" ");
            if (
              UserFio.length == 3 &&
              UserFio[0] != "" &&
              UserFio[1] != "" &&
              UserFio[2] != ""
            )
              User.findOrCreate({
                where: {
                  UserEmail: req.body.email.toLowerCase()
                },
                defaults: {
                  UserName:
                    UserFio[1].charAt(0).toUpperCase() +
                    UserFio[1].substring(1).toLowerCase(),
                  UserFamily:
                    UserFio[0].charAt(0).toUpperCase() +
                    UserFio[0].substring(1).toLowerCase(),
                  UserLastName:
                    UserFio[2].charAt(0).toUpperCase() +
                    UserFio[2].substring(1).toLowerCase(),
                  UserPassword: Hash.generate(req.body.password),
                  UserRegistrationToken: confirmation_hash
                }
              })
                .then(([user, created]) => {
                  if (created == true) {
                    transporter.sendMail(mailOptions, error => {
                      if (error) {
                        return res.end(JSON.stringify(error));
                      }
                      // console.log('Message %s sent: %s', info.messageId, info.response);
                      res.end("true");
                    });
                  } else {
                    res.end("user_exists");
                  }
                })
                .catch(err => console.log(err));
            else res.end("incorrect_fio");
          }
        );
      } else res.end("incorrect_email");
    } else res.end("poor_password");
  } else res.end("incorrect_confirm_password");
});

router.get("/ConfirmNewUserAccount", function(req, res) {
  if (req.query.confirmation_type == "email")
    if (req.query.security_code != "")
      User.findOne({
        where: { UserRegistrationToken: req.query.security_code }
      })
        .then(user => {
          if (user) {
            user
              .update({
                UserRegistrationToken: "",
                UserIsActive: true
              })
              .then(() => {
                req.logIn(user, function(err) {
                  if (err) throw err;
                  else res.redirect("/");
                });
              });
          } else res.redirect("/");
        })
        .catch(err => console.log(err));
});

router.post("/SignIn", RedirectRules, function(req, res, next) {
  passport.authenticate(
    "local",
    { failureRedirect: "/", failureFlash: true },
    function(err, User, info) {
      if (err) return next(err);
      if (info) return res.send(info.message);
      if (!User) return res.send("USER IS NULL");

      req.logIn(User, function(err) {
        if (err) {
          return next(User);
        }
        return res.send({
          result: true,
          UserName: User.UserName,
          UserImage: (streamLink = `${req.protocol}://${req.hostname}/UserImage?UserId=${User.UserId}`)
        });
      });
    }
  )(req, res, next);
});

router.get("/Room/:GameTag", app.protect, function(req, res) {
  if (req.session.Team) {
    Game.findOne({ where: { GameTag: req.params.GameTag } })
      .then(game => {
        if (game != null) {
          if (req.session.Game) {
            // Для тех, кто обновляет страницу
            GameTeam.findOne({
              raw: true,
              where: { Game_Id: req.session.Game.Id }
            })
              .then(gameTeam => {
                if (gameTeam) {
                  return res.render("game", {
                    game,
                    team: req.session.Team,
                    verified: gameTeam.Verified
                  });
                }
                return res.render("info", {
                  message:
                    "Игра уже идет. Дождитесь окончания и подключитесь позже."
                });
              })
              .catch(err => res.end(JSON.stringify(err)));
          } else {
            // Для тех, которые входят в игру в первый раз
            GameTeam.findOne({
              raw: true,
              where: { Game_Id: game.GameId, Play: { [Op.gt]: 0 } }
            })
              .then(gameTeam => {
                if (gameTeam == null) {
                  GameTeam.findOrCreate({
                    where: {
                      Game_Id: game.GameId,
                      Team_Id: req.session.Team.TeamId
                    }
                  })
                    .then(([gameTeam, created]) => {
                      if (created == true) {
                        req.session.Game = {
                          Id: game.GameId,
                          GameTeamId: gameTeam.GameTeamId,
                          Tag: game.GameTag
                        };
                        Team.findOne({
                          raw: true,
                          where: { TeamId: gameTeam.Team_Id }
                        })
                          .then(team => {
                            if (team != null)
                              Team.AddTeamPlayers(team, function(fullTeam) {
                                fullTeam.GameTeamId = gameTeam.GameTeamId;
                                res.render("game", {
                                  game,
                                  team,
                                  verified: false
                                });
                                io.to(`Admins${req.session.Game.Id}`).emit(
                                  "JoinTeam",
                                  fullTeam
                                );
                              });
                            else
                              res.render("info", {
                                message: "Команда была удалена"
                              });
                          })
                          .catch(err => console.log(err));
                      } else {
                        if (req.session.Game)
                          if (req.session.Game.Tag == req.params.GameTag) {
                            return res.render("game", {
                              game,
                              team: req.session.Team,
                              verified: gameTeam.Verified
                            });
                          }
                        res.render("info", {
                          message: "Такая команда уже участвует в игре"
                        });
                      }
                    })
                    .catch(err => console.log(err));
                } else
                  return res.render("info", {
                    message:
                      "Игра уже идет. Дождитесь окночания и подключитесь позже."
                  });
              })
              .catch(err => res.end(JSON.stringify(err)));
          }
        } else res.render("info", { message: "Игра была удалена" });
      })
      .catch(err => console.log(err));
  } else res.redirect("/");
});

router.post("/ForgotPassword", urlencodedParser, function(req, res) {
  if (req.body.username) {
    if (validateEmail(req.body.username))
      User.findOne({ where: { UserEmail: req.body.username } })
        .then(user => {
          if (user)
            if (user.dataValues.UserIsActive) {
              const transporter = nodeMailer.createTransport({
                host: "mail.alexall.dev",
                port: 465,
                secure: true,
                auth: {
                  user: "info@teamplay.space",
                  pass: "teamplayspace"
                }
              });

              fs.readFile(
                `${__dirname}/../html_mail/TeamPlayForgotEmail.html`,
                "utf-8",
                function(err, data) {
                  if (err) res.end(JSON.stringify(err));
                  const html_mail_array = data.split("NEW_EMAILBUTTON");
                  const confirmation_hash = crypto
                    .randomBytes(Math.ceil(120 / 2))
                    .toString("hex") // convert to hexadecimal format
                    .slice(0, 120);
                  const html_mail = `${html_mail_array[0] + req.protocol}://${
                    req.hostname
                    }/ChangePassword?confirmation_type=email&security_code=${confirmation_hash}${
                    html_mail_array[1]
                    }`;

                  const mailOptions = {
                    from: '"Teamplay info" <info@teamplay.space>', // sender address
                    to: user.UserEmail,
                    subject: "Восстановление пароля TeamPlay", // Subject line
                    html: html_mail
                  };
                  user
                    .update({
                      UserRegistrationToken: confirmation_hash
                    })
                    .then(() => {
                      transporter.sendMail(mailOptions, error => {
                        if (error) {
                          return res.end(JSON.stringify(error));
                        }
                        // console.log('Message %s sent: %s', info.messageId, info.response);
                        res.end("true");
                      });
                    });
                }
              );
            } else res.end("Please Activate Your Account via Email");
          else res.end("null_user");
        })
        .catch(err => console.log(err));
  } else res.end("null_email");
});

router.get("/ChangePassword", function(req, res) {
  if (req.query.security_code)
    User.findOne({ where: { UserRegistrationToken: req.query.security_code } })
      .then(user => {
        if (user) {
          req.session.security_code = req.query.security_code;
          res.render("ChangePassword", { username: user.UserEmail });
        } else res.redirect("/");
      })
      .catch(err => console.log(err));
  else res.end("false");
});

router.post("/ChangePassword", urlencodedParser, function(req, res) {
  if (req.session.security_code)
    if (req.body.firstpass && req.body.secondpass)
      if (
        req.body.firstpass.length > 5 &&
        req.body.firstpass == req.body.secondpass
      )
        User.findOne({
          where: { UserRegistrationToken: req.session.security_code }
        })
          .then(user => {
            if (user)
              user
                .update({
                  UserPassword: Hash.generate(req.body.firstpass),
                  UserRegistrationToken: ""
                })
                .then(() => {
                  delete req.session.security_code;
                  res.end("true");
                })
                .catch(err => console.log(err));
            else res.end("Link is inactive");
          })
          .catch(err => console.log(err));
      else res.end("incorrect_pass");
    else res.end("null_data");
  else if (req.session.passport.user) {
    if (req.body.currentpass && req.body.newpass)
      User.findOne({ where: { UserId: req.session.passport.user } })
        .then(user => {
          if (user) {
            if (
              Hash.verify(req.body.currentpass, user.dataValues.UserPassword)
            ) {
              if (req.body.newpass.length > 5)
                user
                  .update({ UserPassword: Hash.generate(req.body.newpass) })
                  .then(() => {
                    res.end("true");
                  })
                  .catch(err => console.log(err));
              else res.end("short_pass");
            } else res.end("incorrect_pass");
          } else res.end("false");
        })
        .catch(err => console.log(err));
    else res.end("need_pass");
  } else res.end("false");
});

function LogOut(req, res, reason = "") {
  req.session.destroy();
  req.logout();
  res.redirect("/");
}

router.get("/logout", app.protect, function(req, res) {
  req.query.reason ? LogOut(req, res, req.query.reason) : LogOut(req, res);
});

router.get("/ControlPanel", app.protect, function(req, res) {
  if (req.session.Game) delete req.session.Game;
  res.render("controlPanel");
});

router.get("/ControlPanel/:GameTag", app.protect, function(req, res) {
  Game.findOne({ where: { GameTag: req.params.GameTag } })
    .then(async game => {
      if (game != null) {
        req.session.Game = {
          Id: game.GameId,
          Tag: game.GameTag
        };
        const streamLink = `${req.protocol}://${req.hostname}/stream/${game.GameTag}`;
        res.render("controlGame", { game, streamLink });
      } else
        res.render("info", {
          message: `Игры ${req.params.GameTag} не существует или она была удалена.`
        });
    })
    .catch(err => console.log(err));
});

router.post("/SetStreamBackground", app.protect, urlencodedParser, function(
  req,
  res
) {
  if (req.session.passport) {
    if (req.session.Game) {
      const form = formidable.IncomingForm();
      form.uploadDir = "./IMAGES/STREAM_IMAGES";
      form.parse(req, function(err, fields, files) {
        if (files.StreamImage) {
          if (files.StreamImage.size < 20000000) {
            const StreamImagePath = files.StreamImage.path
              .split("STREAM_IMAGES")[1]
              .replace(/\\/g, "");

            if (
              files.StreamImage.type == "image/png" ||
              files.StreamImage.type == "image/jpeg" ||
              files.StreamImage.type == "image/gif" ||
              files.StreamImage.type == "image/svg"
            ) {
              GamePlay.findOne({ where: { Game_Id: req.session.Game.Id } })
                .then(gamePlay => {
                  const returnData = {};
                  gamePlay.update({ StreamImagePath }).then(updated => {
                    if (updated) {
                      returnData.StreamImage = `${req.protocol}://${req.hostname}/StreamImage?GamePlayId=${gamePlay.dataValues.GamePlayId}`;
                      res.end(JSON.stringify(returnData));
                    } else {
                      console.log("NoUpdated");
                      res.end("null");
                    }
                  });
                })
                .catch(err => res.end(JSON.stringify(err)));
            } else res.end("incorrect_format");
          } else res.end("incorrect_size");
        } else {
          res.end("null");
        }
      });
    } else res.end("null");
  } else res.end("null");
});

module.exports = router;

function RedirectRules(req, res, next) {
  if (req.session.Team) res.redirect("Room");
  else if (req.isAuthenticated()) res.redirect("home");
  else next();
}

function validateEmail(email) {
  const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return re.test(String(email).toLowerCase());
}
