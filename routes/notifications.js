const { router, Team } = require("../config/routers-config");

const userModel = require("../models/User");
const io = require("../config/sockets/index");
const notificationModel = require("../models/Notification");
// const userModel = require("../models/User");

router.get("/notification", function(req, res) {
  res.render("notifications");
});

router.get("/notificationAction", function(req, res) {
  let findUserId;
  let setUserId;
  notificationModel
    .findOne({ where: { InvitationHash: req.query.InvitationHash } })
    .then(notification => {
      if (!notification.get().isAnswered) {
        notification.update({ isAnswered: 1, isViewed: 1 });
        if (!notification.isInfoNotification) {
          if (notification.InvitationType == "joinTeam") {
            setUserId = notification.senderId;
            findUserId = notification.receiverId;
          } else if (notification.InvitationType == "inviteTeam") {
            setUserId = notification.receiverId;
            findUserId = notification.senderId;
          }
          userModel
            .findOne({ where: { UserId: findUserId }, raw: true })
            .then(userSender => {
              Team.findOne({
                where: { TeamId: userSender.Team_Id },
                raw: true
              }).then(team => {
                if (team) {
                  userModel
                    .findOne({ where: { UserId: setUserId } })
                    .then(userReceiver => {
                      if (
                        req.query.action == "accept" &&
                        userReceiver.Team_Id == 0
                      )
                        userReceiver.update({ Team_Id: team.TeamId });
                      console.log({ sender: notification.senderId });
                      io.emitUser(notification.senderId, "sendAnswer", {
                        // sender full name при join team в notificationSocket
                        senderFullName: `${
                          userSender.UserFamily
                        } ${userSender.UserName.slice(
                          0,
                          1
                        )}. ${userSender.UserLastName.slice(0, 1)}.`,
                        receiverFullName: `${
                          userReceiver.UserFamily
                        } ${userReceiver.UserName.slice(
                          0,
                          1
                        )}. ${userReceiver.UserLastName.slice(0, 1)}.`,
                        answer: req.query.action,
                        InvitationType: notification.InvitationType,
                        TeamId: userReceiver.TeamId
                      });
                    });
                }
              });
            })
            .then(res.redirect("/"))
            .catch(err => {
              console.log("userModel error: " + err);
            });
        }
      } else res.end("You have already responded to this message.");
    })
    .catch(err => {
      console.log(err);
    });
});

module.exports = router;
