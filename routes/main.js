/* eslint-disable no-restricted-syntax */
const formidable = require("formidable");
const nodeMailer = require("nodemailer");
const { Op } = require("sequelize");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const Hash = require("password-hash");
const GamePlay = require("../models/GamePlay");
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

router.get("/room/:RoomTag", app.protect, function(req, res) {
  Room.findOne({ where: { RoomTag: req.params.RoomTag }, raw: true })
    .then(room => {
      if (room) {
        if (req.session.passport.user == room.RoomCreatorId)
          req.session.isRoomCreator = true;
        else req.session.isRoomCreator = false;
        User.findOne({
          where: { UserId: req.session.passport.user },
          raw: true
        })
          .then(user => {
            if (user && (req.session.isRoomCreator || user.Team_Id > 0)) {
              RoomPlayers.findOne({
                where: { User_Id: req.session.passport.user },
                raw: true
              })
                .then(roomPlayer => {
                  if (roomPlayer == null) {
                    RoomPlayers.findAll({
                      where: { Team_Id: user.Team_Id, Room_Id: room.RoomId }
                    })
                      .then(roomPlayers => {
                        // if (req.session.isRoomCreator)
                        if (roomPlayers.length < room.RoomMaxTeamPlayers) {
                          RoomPlayers.findOrCreate({
                            where: {
                              Room_Id: room.RoomId,
                              User_Id: req.session.passport.user,
                              Team_Id: req.session.isRoomCreator
                                ? -1
                                : user.Team_Id,
                              isRoomCreator: req.session.isRoomCreator,
                              isGroupCoach: req.session.isRoomCreator
                                ? false
                                : roomPlayers.length == 0
                            }
                          })
                            .then(async ([createdRoomPlayer]) => {
                              req.session.roomPlayersId =
                                createdRoomPlayer.RoomPlayersId;
                              Team.findOne({
                                where: { TeamId: createdRoomPlayer.Team_Id },
                                raw: true
                              })
                                .then(async team => {
                                  req.session.roomId = room.RoomId;
                                  req.session.TeamId =
                                    createdRoomPlayer.Team_Id;
                                  let player = {
                                    RoomPlayersId:
                                      createdRoomPlayer.RoomPlayersId,
                                    UserName: user.UserName,
                                    UserFamily: user.UserFamily,
                                    UserLastName: user.UserLastName,
                                    RoomId: createdRoomPlayer.Room_Id,
                                    TeamId: createdRoomPlayer.Team_Id,
                                    TeamName: createdRoomPlayer.isRoomCreator
                                      ? ""
                                      : team.TeamName,
                                    isRoomCreator:
                                      createdRoomPlayer.isRoomCreator,
                                    isGroupCoach: createdRoomPlayer.isGroupCoach
                                  };
                                  if (createdRoomPlayer.isGroupCoach)
                                    await RoomTeam.findOrCreate({
                                      where: {
                                        Team_Id: createdRoomPlayer.Team_Id,
                                        Room_Id: createdRoomPlayer.Room_Id
                                      },
                                      raw: true
                                    })
                                      .then(async ([roomTeam, created]) => {
                                        if (created)
                                        {
                                          req.session.roomTeamId = await roomTeam.RoomTeamId;
                                          req.session.isGroupCoach = true;
                                        }
                                        player.RoomTeamId = await req.session.roomTeamId;
                                      })
                                      .catch(err => console.log(err));
                                  if (!req.session.isRoomCreator)
                                    io.to(`RoomUsers${room.RoomId}`).emit(
                                      "AddUserToRoom",
                                      player
                                    );
                                  io.emit("RoomOnline", {
                                    roomId: room.RoomId,
                                    online: req.session.isRoomCreator
                                      ? roomPlayers.length
                                      : roomPlayers.length + 1
                                  });
                                  res.render("room", {
                                    room,
                                    roomPlayer: createdRoomPlayer.dataValues
                                  });
                                })
                                .catch(err => console.log(err));
                            })
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
                          if (req.params.RoomTag == findedRoom.RoomTag)
                            res.render("room", {
                              room: findedRoom,
                              roomPlayer
                            });
                          else res.redirect(`/room/${findedRoom.RoomTag}`);
                        else res.redirect(`/room/${req.params.RoomTag}`);
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
          })
          .catch(err => console.log(err));
      } else
        res.render("info", {
          message: "Такой комнаты не существует либо она была удалена"
        });
    })
    .catch(err => console.log(err));
});

router.get("/leaveRoom", app.protect, function(req, res) {
  if (req.session.roomId)
    Room.findOne({ where: { RoomId: req.session.roomId }, raw: true })
      .then(room => {
        if (room)
          RoomPlayers.destroy({
            where: { RoomPlayersId: req.session.roomPlayersId }
          })
            .then(() => {
              if (!req.session.isRoomCreator)
                io.to(`RoomUsers${req.session.roomId}`).emit(
                  "RoomPlayerLeaved",
                  req.session.roomPlayersId
                );
              RoomPlayers.findAndCountAll({
                where: { Room_Id: room.RoomId, Team_Id: req.session.TeamId },
                raw: true
              })
                .then(async result => {
                  if (req.session.roomTeamId) {
                    if (result.count == 0)
                      await RoomTeam.destroy({
                        where: { RoomTeamId: req.session.roomTeamId }
                      })
                        .then(async () => {
                          io.to(`RoomUsers${req.session.roomId}`).emit(
                            "RoomGroupRemoved",
                            req.session.TeamId
                          );
                          delete req.session.roomTeamId;
                          if (req.session.isGroupCoach)
                            delete req.session.isGroupCoach;
                        })
                        .catch(err => console.log(err));
                    else
                      await RoomPlayers.findOne({
                        where: {
                          Room_Id: req.session.roomId,
                          Team_Id: req.session.TeamId
                        }
                      })
                        .then(roomPlayer => {
                          if (roomPlayer)
                            roomPlayer
                              .update({ isGroupCoach: true })
                              .then(newCoach => {
                                io.to(`RoomUsers${req.session.roomId}`).emit(
                                  "NewRoomGroupCoach",
                                  newCoach.get()
                                );
                              })
                              .catch(err => console.log(err));
                        })
                        .catch(err => console.log(err));
                  }
                  RoomPlayers.findAndCountAll({
                    where: { Room_Id: room.RoomId },
                    raw: true
                  })
                    .then(roomOnlineresult => {
                      io.emit("RoomOnline", {
                        roomId: room.RoomId,
                        online: roomOnlineresult.count
                      });
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
        else {
          // Creator deleted the room
          delete req.session.roomId;
          if (req.session.isRoomCreator) delete req.session.isRoomCreator;
          res.redirect("/");
        }
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

function validateEmail(email) {
  let re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return re.test(String(email).toLowerCase());
}
