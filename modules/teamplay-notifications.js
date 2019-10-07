const nodeMailer = require('nodemailer');
const crypto = require('crypto');
const fs = require('fs');

const notificationModel = require('../models/Notification');
const User = require('../models/User');
const io = require('../config/sockets/index');
const Team = require('../models/Team');

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
module.exports = function(notificationData, req, callback) {
	let { receiverId, shouldCreate, senderId, header, mainText, isInfoNotification, invitationType } = notificationData;
	let created;
	let notification;
	console.log({ notificationData });
	User.findOne({ where: { UserId: receiverId }, raw: true })
		.then(async user => {
			let invitationHash = isInfoNotification == 'false' ? crypto.randomBytes(Math.ceil(120 / 2)).toString('hex').slice(0, 120) : '';
			if (user) {
				if (shouldCreate == 'true') {
					if (isInfoNotification == 'false')
						await notificationModel
							.findOrCreate({
								where: { senderId: senderId, receiverId: receiverId, InvitationType: invitationType, isAnswered: false },
								defaults: {
									header: header,
									mainText: mainText,
									isInfoNotification: isInfoNotification,
									isViewed: false,
									InvitationHash: invitationHash
								}
							})
							.then(async ([ notificationObj, wasCreated
							]) => {
								created = wasCreated;
								notification = notificationObj.get();
								console.log({ findOrCreate: notification, created: created });
								await User.findOne({ where: { UserId: senderId }, raw: true })
									.then(async userSender => {
										notification.senderFIO = `${userSender.UserFamily} ${userSender.UserName.slice(
											0,
											1
										)}. ${userSender.UserLastName.slice(0, 1)}.`;
										await Team.findOne({ where: { TeamId: userSender.Team_Id } })
											.then(team => {
												notification.userTeam = team ? team.TeamName : 0;
											})
											.catch(err => {
												console.log(`${__filename} Team.FindOne ${err}`);
											});
									})
									.catch(err => {
										console.log(`${__filename} notificationModel.create ${err}`);
									});
								if (wasCreated) {
									//Если это заявка, то отправляем на почту
									fs.readFile(__dirname + '/../html_mail/TeamPlayNotificationEmail.html', 'utf-8', function(err, data) {
										if (err) callback(err);
										let html_mail_array = data.split('INVITATION_ACTION');
										let html_mail_text = html_mail_array[0].split('NOTIFICATION_TEXT');
										let html_mail = `
												${html_mail_text[0]} От ${notification.userTeam && notification.userTeam != 0
											? `[${notification.userTeam}]`
											: ``} ${notification.senderFIO.slice(0, -1)}: <br>
												${notification.mainText}${html_mail_text[1]}${req.protocol}://${req.hostname}/notification/notificationAction?InvitationHash=${notification.InvitationHash}&action=accept
												${html_mail_array[1]}${req.protocol}://${req.hostname}/notification/notificationAction?InvitationHash=${notification.InvitationHash}&action=reject
												${html_mail_array[2]}`;
										transporter.sendMail({
											from: 'info@teamplay.space', // sender address
											to: user.UserEmail, // list of receivers
											subject: header, // Subject line
											html: html_mail
										});
									});
								}
							})
							.catch(err => {
								console.log(`teamplay-notifications.js, findOrCreate: ${err}`);
							});
					else {
						await notificationModel
							.create({
								senderId: senderId,
								receiverId: receiverId,
								InvitationType: invitationType,
								isAnswered: false,
								header: header,
								mainText: mainText,
								isInfoNotification: isInfoNotification,
								isViewed: false,
								InvitationHash: invitationHash
							})
							.then(async notificationObj => {
								notification = notificationObj.get();
								created = true;
								await User.findOne({ where: { UserId: senderId }, raw: true })
									.then(userSender => {
										notification.senderFIO = `${userSender.UserFamily} ${userSender.UserName.slice(
											0,
											1
										)}. ${userSender.UserLastName.slice(0, 1)}.`;
									})
									.catch(err => {
										console.log(`${__filename} notificationModel.create ${err}`);
									});
							});
					}
					io.emitUser(receiverId, 'receiveNotification', {
						createdNotification: {
							notification: notification,
							shouldAdd: created || notification.isInfoNotification,
							addToStart: true
						},
						actionUrl: `${req.protocol}://${req.hostname}/notification/notificationAction?InvitationHash=${notification.InvitationHash}&action=`
					});
				} else {
					notificationModel
						.findAll({
							where: {
								receiverId: receiverId
							},
							order: [
								[
									'notificationId',
									'DESC'
								]
							],
							raw: true
						})
						.then(async notifications => {
							for await (const notification of notifications) {
								await User.findOne({ where: { UserId: notification.senderId }, raw: true })
									.then(async userSender => {
										await Team.findOne({ where: { TeamId: userSender.Team_Id } })
											.then(team => {
												notification.userTeam = team ? team.TeamName : 0;
											})
											.catch(err => {
												console.log(`${__filename} Team.FindOne in loop	 ${err}`);
											});
										notification.senderFIO = `${userSender.UserFamily} ${userSender.UserName.slice(
											0,
											1
										)}. ${userSender.UserLastName.slice(0, 1)}.`;
									})
									.catch(err => {
										console.log(`${__filename} for of loop ${err}`);
									});
								io.emitUser(receiverId, 'receiveNotification', {
									createdNotification: { notification: notification, shouldAdd: true, addToStart: false },
									actionUrl: `${req.protocol}://${req.hostname}/notification/notificationAction?InvitationHash=${notification.InvitationHash}&action=`
								});
							}
						})
						.catch(err => {
							console.log({ file: __filename, err: err });
						});
					callback('true');
				}
			}
		})
		.catch(err => console.log(err));
};