const notifcationModel = require('./../models/Notification');
const nodeMailer = require('nodemailer');

const User = require('../models/User');
const fs = require('fs');
const io = require('../config/sockets/index');
const crypto = require('crypto');

let transporter = nodeMailer.createTransport({
  host: 'mail.alexall.dev',
  port: 465,
  secure: true,
  auth: {
    user: 'info@teamplay.space',
    pass: 'teamplayspace'
  }
});

//для теста отправляется senderId
module.exports = function (senderId, receiverId, header, mainText, isInfoNotification, InvitationType, callback, req) {
  User.findOne({ where: { UserId: receiverId }, raw: true })
    .then(user => {
      if (user) {
        notifcationModel
          .create({
            senderId: senderId,
            receiverId: receiverId,
            header: header,
            mainText: mainText,
            isInfoNotification: isInfoNotification,
            isRead: false,
            InvitationHash: isInfoNotification
              ? crypto
                .randomBytes(Math.ceil(120 / 2))
                .toString('hex')
                .slice(0, 120)
              : '',
            InvitationType: InvitationType,
            isViewed: false
          })
          .then(notification => {
            notification = notification.get();
            io.emitUser(receiverId, 'receiveNotification', {
              createdNotification: notification,
              actionUrl: `${req.protocol}://${req.hostname}/notification/notificationAction?InvitationHash=${notification.InvitationHash}&action=`
            });
            //Если это заявка, то отправляем на почту
            if (isInfoNotification == 'false')
              fs.readFile(__dirname + '/../html_mail/TeamPlayNotificationEmail.html', 'utf-8', function (err, data) {
                if (err) callback(err);
                var html_mail_array = data.split('INVITATION_ACTION');
                var html_mail_text = html_mail_array[0].split('NOTIFICATION_TEXT');
                var html_mail = html_mail_text[0] + notification.mainText + html_mail_text[1] + `${req.protocol}://${req.hostname}/notification/notificationAction?InvitationHash=${notification.InvitationHash}&action=accept` + html_mail_array[1] + `${req.protocol}://${req.hostname}/notification/notificationAction?InvitationHash=${notification.InvitationHash}&action=reject` + html_mail_array[2];

                transporter.sendMail({
                  from: 'info@teamplay.space', // sender address
                  to: user.UserEmail, // list of receivers
                  subject: header, // Subject line
                  html: html_mail
                });
              });
            callback('true');
          })
          .catch(err => {
            console.log(err);
          });
      }
    })
    .catch(err => console.log(err));
};