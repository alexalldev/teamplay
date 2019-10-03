const { router, urlencodedParser, Team } = require('../config/routers-config');

const userModel = require('../models/User');

const notification = require('../modules/teamplay-notifications');
const io = require('../config/sockets/index');
const notificationModel = require('../models/Notification');
// const userModel = require("../models/User");

router.get('/notification', function (req, res) {
  res.render('notifications');
});

router.get('/notificationAction', function (req, res) {
  let findUserId;
  let setUserId;
  notificationModel
    .findOne({ where: { InvitationHash: req.query.InvitationHash } })
    .then(notification => {
      if (!notification.get().isRead) {
        notification.update({ isRead: 1, isViewed: 1 });
        if (!notification.isInfoNotification) {
          userModel
            .findOne({ where: { UserId: findUserId }, raw: true })
            .then(userSender => {
              Team.findOne({ where: { TeamId: userSender.Team_Id }, raw: true }).then(team => {
                if (notification.InvitationType == 'joinTeam') {
                  setUserId = notification.senderId;
                  findUserId = notification.receiverId;
                } else if (notification.InvitationType == 'inviteTeam') {
                  setUserId = notification.receiverId;
                  findUserId = notification.senderId;
                }
                if (!team) console.log('team not found');
                else
                  userModel.findOne({ where: { UserId: setUserId } }).then(userReceiver => {
                    if (req.query.action == 'accept') userReceiver.update({ Team_Id: team.TeamId });
                  });
                io.emitUser(notification.senderId, 'sendAnswer', {
                  //sender full name при join team в notificationSocket
                  senderFullName: [
                    userSender.UserName,
                    userSender.UserFamily,
                    userSender.UserLastName
                  ],
                  receiverFullName: [
                    userReceiver.UserName,
                    userReceiver.UserFamily,
                    userReceiver.UserLastName
                  ],
                  answer: req.query.action,
                  InvitationType: notification.InvitationType
                });
              });
            })
            .then(res.end('end'))
            .catch(err => {
              console.log('userModel error: ' + err);
            });
        }
      } else res.end('You have already responded to this message.');
    })
    .catch(err => {
      console.log(err);
    });
});

module.exports = router;
