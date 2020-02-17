const { router, Team } = require("../config/routers-config");

const userModel = require("../models/User");
const io = require("../config/sockets/index");
const notificationModel = require("../models/Notification");
// const userModel = require("../models/User");

router.get("/notification", function(req, res) {
  res.render("notifications");
});

router.get("/notificationAction", async function(req, res) {
  let destinationId;
  let addresserId;
  await notificationModel
    .findOne({ where: { NotificationHash: req.query.NotificationHash } })
    .then(async notification => {
      if (notification) {
        addresserId = notification.senderId;
        destinationId = notification.receiverId;
        if (notification.isAnswered == 0) {
          await notification.update({
            isAnswered: 1,
            isViewed: 1
          });
          if (!notification.isInfoNotification) {
            if (notification.InvitationType == "joinTeam") {
              addresserId = notification.receiverId;
              destinationId = notification.senderId;
            }

            console.log({
              type: notification.InvitationType,
              addresserId,
              destinationId
            });

            await userModel
              .findOne({ where: { UserId: addresserId }, raw: true })
              .then(async userSender => {
                await Team.findOne({
                  where: { TeamId: userSender.Team_Id },
                  raw: true
                }).then(async team => {
                  if (team) {
                    await userModel
                      .findOne({ where: { UserId: destinationId } })
                      .then(async userReceiver => {
                        console.log({
                          userSender,
                          userReceiver: userReceiver.get()
                        });
                        if (userReceiver.Team_Id == 0) {
                          if (req.query.action == "accept") {
                            await Promise.all([
                              userReceiver.update({ Team_Id: team.TeamId }),
                              notification.update({ answer: true })
                            ]);
                          }
                          io.emitUser(notification.senderId, "sendAnswer", {
                            receiverFullName: `${
                              userReceiver.UserFamily
                            } ${userReceiver.UserName.slice(
                              0,
                              1
                            )}. ${userReceiver.UserLastName.slice(0, 1)}.`,
                            answer: req.query.action,
                            InvitationType: notification.InvitationType,
                            TeamId: userReceiver.TeamId,
                            teamName: team.TeamName
                          });
                        } else if (
                          notification.InvitationType == "inviteUser"
                        ) {
                          io.emitUser(
                            destinationId,
                            "sendInfo",
                            "Вы уже находитесь в команде"
                          );
                        } else if (notification.InvitationType == "joinTeam") {
                          io.emitUser(
                            addresserId,
                            "sendInfo",
                            "Этот игрок уже находится в команде"
                          );
                        }
                      });
                  }
                });
              })
              .catch(err => {
                console.log(`userModel error: ${err}`);
              });
          }
          res.json(notification.get());
        } else
          io.emitUser(
            addresserId,
            "sendInfo",
            "Вы уже ответили на это уведомление"
          );
      }
    })
    .catch(err => {
      console.log(err);
    });
});

module.exports = router;
