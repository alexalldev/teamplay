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
      res.render("view", { games, page: "home" });
    })
    .catch(err => console.log(err));
});

router.get("/rooms", app.protect, function(req, res) {
  Room.findAll({ raw: true })
    .then(async rooms => {
      const roomModels = await Promise.all(
        rooms.map(async room => {
          const [numRoomPlayers, roomCreator] = await Promise.all([
            RoomPlayers.count({
              where: { Room_Id: room.RoomId, isRoomCreator: false }
            })
              .then(numRoomPlayers => numRoomPlayers)
              .catch(err => {
                console.log(err);
              }),

            User.findOne({
              where: { UserId: room.RoomCreatorId },
              raw: true
            })
              .then(roomCreator => roomCreator)
              .catch(err => {
                console.log(err);
              })
          ]);
          return {
            roomId: room.RoomId,
            roomName: room.RoomName,
            roomCreator: `${
              roomCreator.UserFamily
            } ${roomCreator.UserName.slice(
              0,
              1
            )}. ${roomCreator.UserLastName.slice(0, 1)}.`,
            roomCreatorId: roomCreator.UserId,
            roomTag: room.RoomTag,
            maxTeamPlayers: room.RoomMaxTeamPlayers,
            usersOnline: numRoomPlayers
          };
        })
      );
      Game.findAll({
        where: { QuizCreatorId: req.session.passport.user },
        raw: true
      }).then(gameModels => {
        res.render("view", { roomModels, gameModels, page: "rooms" });
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
          .catch(err => console.log(err));
        await User.count({ where: { Team_Id: team.TeamId } })
          .then(membersNum => {
            team.membersNum = membersNum;
          })
          .catch(err => console.log(err));
      }
      await User.findOne({ where: { UserId: req.session.passport.user } }).then(
        user => {
          teams.userTeamId = user.Team_Id;
        }
      );
      res.render("view", { teams, page: "teams" });
    })
    .catch(err => console.log(err));
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
          .catch(err => console.log(err));
      }

      await User.findOne({ where: { UserId: req.session.passport.user } }).then(
        user => {
          users.senderIsCoach = user.isCoach;
        }
      );

      res.render("view", { users, page: "users" });
    })
    .catch(err => console.log(err));
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
                res.render("teamPage", {
                  users,
                  isMyTeam: user.Team_Id == team.TeamId,
                  amICoach: user.isCoach
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
      let canEdit = false;
      if (req.session.passport.user == user.UserId) canEdit = true;
      await Team.findOne({ where: { TeamId: user.Team_Id }, raw: true })
        .then(async team => {
          res.render("user", {
            user: {
              UserId: user.UserId,
              UserName: user.UserName,
              UserFamily: user.UserFamily,
              UserLastName: user.UserLastName,
              canEdit,
              TeamId: user.TeamId,
              TeamName: team ? team.TeamName : null,
              TeamTag: team ? team.TeamTag : null,
              teamPlayersCount: team
                ? await User.count({
                    where: { Team_Id: team.TeamId }
                  }).then(result => result)
                : null
            }
          });
        })
        .catch(err => {
          console.log(err);
        });
    })
    .catch(err => {
      console.log(err);
    });
});

router.get("/user", app.protect, function(req, res) {
  if (req.session.passport.user)
    res.redirect(`/user/${req.session.passport.user}`);
});

module.exports = router;
