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

router.post("/getCurrUserId", urlencodedParser, function(req, res) {
  res.json({ userId: req.session.passport.user });
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

function LogOut(req, res, reason = "") {
  req.session.destroy();
  req.logout();
  res.redirect("/");
}

router.get("/logout", app.protect, function(req, res) {
  req.query.reason ? LogOut(req, res, req.query.reason) : LogOut(req, res);
});
module.exports = router;

function RedirectRules(req, res, next) {
  if (req.session.Team) res.redirect("Room");
  else if (req.isAuthenticated()) res.redirect("home");
  else next();
}