/* eslint-disable no-restricted-syntax */
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
    Room,
  } = require("../config/routers-config");

const RoomPlayers = require('../models/RoomPlayer');

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
      res.render("view", { games });
    })
    .catch(err => console.log(err));
});

router.get("/rooms", app.protect, function(req, res) {
  Room.findAll({ raw: true })
    .then(async rooms => {
      const roomModels = [];
      // eslint-disable-next-line node/no-unsupported-features/es-syntax
      for await (const room of rooms) {
        await RoomPlayers.count({
          where: { Room_Id: room.RoomId }
        })
          .then(async NumRoomPlayers => {
            await User.findOne({
              where: { UserId: room.RoomCreatorId },
              raw: true
            })
              .then(userCreator => {
                if (userCreator) {
                  RoomPlayers.findOne({
                    where: { User_Id: room.RoomCreatorId },
                    raw: true
                  }).then(roomCreator => {
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
                      usersOnline: NumRoomPlayers - roomCreator ? 1 : 0
                    });
                  });
                }
              })
              .catch(err => {
                console.log({
                  file: __filename,
                  func: 'router.get("/rooms"), User.findOne',
                  err
                });
              });
          })
          .catch(err => {
            console.log({
              file: __filename,
              func: 'router.get("/rooms"), RoomPlayers.findAll',
              err
            });
          });
      }
      Game.findAll({
        where: { QuizCreatorId: req.session.passport.user },
        raw: true
      }).then(games => {
        res.render("view", { roomModels, games });
      });
    })
    .catch(err => console.log(err));
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
      // eslint-disable-next-line node/no-unsupported-features/es-syntax
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
              })
              .catch(err => {
                console.log({
                  file: __filename,
                  func: 'router.get("/team/:TeamTag"), User.findAll',
                  err
                });
              });
            res.render("teamPage", {
              users,
              isMyTeam: user.Team_Id == team.TeamId,
              amICoach: user.isCoach
            });
          }
        });
      } else return res.redirect("/");
    })
    .catch(err => {
      console.log({
        file: __filename,
        func: 'router.get("/team/:TeamTag"), User.findAll',
        err
      });
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

router.get("/user", app.protect, function(req, res) {
  if (req.session.passport.user)
    res.redirect(`/user/${req.session.passport.user}`);
});

module.exports = router;