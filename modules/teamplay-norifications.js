const notifcationModel = require('./../models/Notification')
const nodeMailer = require('nodemailer')

const User = require('../models/User');
const fs = require('fs');
const io = require('../config/sockets/index');

let transporter = nodeMailer.createTransport({
    host: 'mail.alexall.dev',
    port: 465,
    secure: true,
    auth: {
        user: 'info@teamplay.space',
        pass: 'teamplayspace'
    }
})

module.exports = function(receiverId, header, mainText, isInfoNotification, callback) {
    User.findOne({where: {UserId: receiverId}, raw: true})
    .then(user => {
        if (user)
        {
            notifcationModel.create({
                senderId: 0,
                receiverId: receiverId,
                header: header,
                mainText: mainText,
                isInfoNotification: isInfoNotification,
                isRead: false
            })
            .then(result => {
                io.emitUser(receiverId, 'recieveNotification', result.get())
                callback('true');
            })
            .catch(err => {
                console.log(err)
            })
            //Если это заявка, то отправляем на почту
            if (!isInfoNotification)
                fs.readFile(__dirname + '/../html_mail/TeamPlayNotificationEmail.html', 'utf-8', function (err, data) {
                    if (err) callback(err)
                    var html_mail_array = data.split('NOTIFICATION_TEXT');
                    var html_mail = html_mail_array[0] + mainText + html_mail_array[1];
                    transporter.sendMail({
                        from: 'info@teamplay.space', // sender address
                        to: user.UserEmail, // list of receivers
                        subject: header, // Subject line
                        html: html_mail
                    })
                });
        }
    })
    .catch(err => console.log(err))
}