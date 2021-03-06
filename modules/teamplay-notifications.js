const nodeMailer = require("nodemailer");
const crypto = require("crypto");
const fs = require("fs");

const notificationModel = require("../models/Notification");
const User = require("../models/User");
const io = require("../config/sockets/index");
const Team = require("../models/Team");
const timeConverter = require("../modules/timeConverter");

const transporter = nodeMailer.createTransport({
  host: "mail.alexall.dev",
  port: 465,
  secure: true,
  auth: {
    user: "info@teamplay.space",
    pass: "teamplayspace"
  }
});

// для теста отправляется senderId
module.exports = function(notificationData, req, callback) {
  const {
    receiverId,
    shouldCreate,
    senderId,
    header,
    mainText,
    isInfoNotification,
    invitationType
  } = notificationData;
  let created;
  let notification;
  User.findOne({ where: { UserId: receiverId }, raw: true })
    .then(async user => {
      if (user) {
        if (shouldCreate == "true") {
          const notificationHash = crypto
            .randomBytes(Math.ceil(120 / 2))
            .toString("hex")
            .slice(0, 120);
          if (isInfoNotification == "false")
            await notificationModel
              .findOrCreate({
                where: {
                  senderId,
                  receiverId,
                  InvitationType: invitationType,
                  isAnswered: false
                },
                defaults: {
                  header,
                  mainText,
                  isInfoNotification,
                  isViewed: false,
                  notificationHash
                }
              })
              .then(async ([notificationObj, wasCreated]) => {
                created = wasCreated;
                notification = notificationObj.get();
                notification.textTimestamp = timeConverter(
                  notification.timestamp
                );
                await User.findOne({ where: { UserId: senderId }, raw: true })
                  .then(async userSender => {
                    notification.senderFIO = `${
                      userSender.UserFamily
                    } ${userSender.UserName.slice(
                      0,
                      1
                    )}. ${userSender.UserLastName.slice(0, 1)}.`;
                    await Team.findOne({
                      where: { TeamId: userSender.Team_Id }
                    })
                      .then(team => {
                        notification.userTeam = team ? team.TeamName : 0;
                      })
                      .catch(err => {
                        console.log(`${__filename} Team.FindOne ${err}`);
                      });
                  })
                  .catch(err => {
                    console.log(
                      `${__filename} notificationModel.create ${err}`
                    );
                  });
                if (wasCreated)
                  // Если это заявка, то отправляем на почту
                  fs.readFile(
                    `${__dirname}/../html_mail/TeamPlayNotificationEmail.html`,
                    "utf-8",
                    function(err, data) {
                      if (err) callback(err);
                      const html_mail_array = data.split("INVITATION_ACTION");
                      const html_mail_text = html_mail_array[0].split(
                        "NOTIFICATION_TEXT"
                      );
                      const html_mail = `
												${html_mail_text[0]} От ${
                        notification.userTeam && notification.userTeam != 0
                          ? `[${notification.userTeam}]`
                          : ``
                      } ${notification.senderFIO.slice(0, -1)}: <br>
												${notification.mainText}${html_mail_text[1]}${req.protocol}://${
                        req.hostname
                      }/notification/notificationAction?NotificationHash=${
                        notification.notificationHash
                      }&action=accept&type=email
												${html_mail_array[1]}${req.protocol}://${
                        req.hostname
                      }/notification/notificationAction?NotificationHash=${
                        notification.notificationHash
                      }&action=reject&type=email
												${html_mail_array[2]}`;
                      transporter.sendMail({
                        from: "info@teamplay.space", // sender address
                        to: user.UserEmail, // list of receivers
                        subject: header, // Subject line
                        html: html_mail
                      });
                    }
                  );
              })
              .catch(err => {
                console.log(`teamplay-notifications.js, findOrCreate: ${err}`);
              });
          else {
            await notificationModel
              .create({
                senderId,
                receiverId,
                InvitationType: invitationType,
                isAnswered: false,
                header,
                mainText,
                isInfoNotification,
                isViewed: false,
                notificationHash
              })
              .then(async notificationObj => {
                notification = notificationObj.get();
                notification.textTimestamp = timeConverter(
                  notification.timestamp
                );
                created = true;
                await User.findOne({ where: { UserId: senderId }, raw: true })
                  .then(userSender => {
                    notification.senderId = senderId;
                    notification.senderFIO = `${
                      userSender.UserFamily
                    } ${userSender.UserName.slice(
                      0,
                      1
                    )}. ${userSender.UserLastName.slice(0, 1)}.`;
                  })
                  .catch(err => {
                    console.log(
                      `${__filename} notificationModel.create ${err}`
                    );
                  });
              });
          }
          io.emitUser(
            created || notification.isInfoNotification ? receiverId : senderId,
            "receiveNotification",
            {
              createdNotification: {
                notification,
                shouldAdd: created || notification.isInfoNotification,
                addToStart: true
              },
              notificationActionLink: `notification/notificationAction?NotificationHash=${notification.notificationHash}&action=`
            }
          );
        } else if (shouldCreate == "false") {
          notificationModel
            .findAll({
              where: {
                receiverId
              },
              order: [["notificationId", "DESC"]],
              raw: true
            })
            .then(async notifications => {
              if (notifications.length > 0) {
                for await (const notification of notifications) {
                  notification.textTimestamp = timeConverter(
                    notification.timestamp
                  );
                  await User.findOne({
                    where: { UserId: notification.senderId },
                    raw: true
                  })
                    .then(async userSender => {
                      if (userSender) {
                        notification.senderFIO = `${
                          userSender.UserFamily
                        } ${userSender.UserName.slice(
                          0,
                          1
                        )}. ${userSender.UserLastName.slice(0, 1)}.`;
                        await Team.findOne({
                          where: { TeamId: userSender.Team_Id }
                        })
                          .then(team => {
                            if (team) {
                              notification.teamName = team.TeamName;
                              notification.teamId = team.TeamId;
                            }
                          })
                          .catch(err => {
                            console.log(
                              `${__filename} Team.FindOne in loop	 ${err}`
                            );
                          });
                      } else notification.senderFIO = "Пользователь удален";
                      io.emitUser(receiverId, "receiveNotification", {
                        createdNotification: {
                          notification,
                          shouldAdd: true,
                          addToStart: false
                        },
                        notificationActionLink: `notification/notificationAction?NotificationHash=${notification.notificationHash}&action=`
                      });
                    })
                    .catch(err => {
                      console.log(`${__filename} for of loop ${err}`);
                    });
                }
              } else {
                io.emitUser(receiverId, "receiveNotification", null);
              }
            })
            .catch(err => {
              console.log({ file: __filename, err });
            });
          callback("true");
        }
      }
    })
    .catch(err =>
      console.log({ file: __filename, err: `User.findOne receiverId: ${err}` })
    );
};
