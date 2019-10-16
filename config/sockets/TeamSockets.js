const { Op } = require("sequelize");
const Game = require("../../models/Game");
const Team = require("../../models/Team");
const Player = require("../../models/Player");
const GameTeam = require("../../models/GameTeam");
const Category = require("../../models/Category");
const Question = require("../../models/Question");
const Answer = require("../../models/Answer");
const Room = require("../../models/Room");
const User = require("../../models/User");
const notification = require("../../modules/teamplay-notifications");

module.exports = function(socket, io) {
  const session = socket.request.session;
  socket.on("CreateTeam", function(TeamName) {
    if (session.passport.user) {
      if (TeamName) {
        if (TeamName.charAt(TeamName.length - 1) == " ")
          TeamName = TeamName.substr(0, TeamName.length - 1);
        TeamTag = TeamName.replace(/[^a-zA-Zа-яА-Я0-9 ]/g, "")
          .toLowerCase()
          .replace(/\s/g, "-");

        User.findOne({ where: { UserId: session.passport.user } }).then(
          user => {
            if (user)
              if (user.dataValues.Team_Id == 0)
                Team.findOrCreate({ where: { TeamTag: TeamTag } })
                  .then(([team, created]) => {
                    if (created == true) {
                      team
                        .update({ TeamName: TeamName })
                        .then(() => {
                          user
                            .update({
                              isCoach: true,
                              Team_Id: team.dataValues.TeamId
                            })
                            .then(() =>
                              socket.emit(
                                "TeamCreated",
                                team.dataValues.TeamTag
                              )
                            );
                        })
                        .catch(err => console.log(err));
                    } else socket.emit("Info", "Выберите другое название");
                  })
                  .catch(err => console.log(err));
              else
                socket.emit(
                  "Info",
                  "Покиньте текущую команду, чтобы создать новую"
                );
          }
        );
      }
    }
  });

  socket.on("LeaveTeam", (SuccessorId, shouldKick) => {
    if (session.passport.user) {
      User.findOne({ where: { UserId: session.passport.user } }).then(Me => {
        if (Me) {
          Team.findOne({ where: { TeamId: Me.Team_Id } }).then(team => {
            if (team) {
              if (shouldKick) {
                if (Me.isCoach) {
                  User.update(
                    { Team_Id: 0, isCoach: false },
                    { where: { UserId: SuccessorId } }
                  ).then(() => {
                    socket.emit("TeamLeaved");
                  });
                  notification(
                    {
                      receiverId: SuccessorId,
                      shouldCreate: "true",
                      senderId: session.passport.user,
                      header: team.TeamName,
                      mainText: "Вы были исключены из команды",
                      isInfoNotification: true,
                      invitationType: "info"
                    },
                    {},
                    function(err) {
                      if (err) res.end(JSON.stringify(err));
                      else res.end("true");
                    }
                  );
                }
              } else {
                User.findOne({
                  where: { Team_Id: Me.Team_Id, isCoach: 1 }
                }).then(async coach => {
                  if (Me.isCoach)
                    await User.count({ where: { Team_Id: team.TeamId } }).then(
                      result => {
                        if (result == 1)
                          Team.destroy({ where: { TeamId: team.TeamId } });
                        else
                          User.update(
                            { isCoach: 1 },
                            {
                              where: {
                                UserId: SuccessorId,
                                Team_Id: coach.Team_Id
                              }
                            }
                          ).then(succ => {});
                      }
                    );
                  notification(
                    {
                      receiverId: Me.isCoach ? SuccessorId : coach.UserId,
                      shouldCreate: "true",
                      senderId: Me.UserId,
                      header: team.TeamName,
                      mainText: `${Me.isCoach ? "Коуч" : "Пользователь"} ${
                        Me.UserFamily
                      } ${Me.UserName.slice(0, 1)}. ${Me.UserLastName.slice(
                        0,
                        1
                      )}. покинул команду ${
                        Me.isCoach ? "и назначил вас новым коучем" : ""
                      }`,
                      isInfoNotification: true,
                      invitationType: "info"
                    },
                    {},
                    function(err) {
                      if (err) res.end(JSON.stringify(err));
                      else res.end("true");
                    }
                  );
                  await Me.update({ Team_Id: 0, isCoach: false });
                  socket.emit("TeamLeaved");
                });
              }
            }
          });
          // }
        }
      });
    }
  });
};
