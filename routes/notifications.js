const { router, urlencodedParser, Team } = require("../config/routers-config");

const userModel = require('../models/User');

const notification = require("../modules/teamplay-norifications");
const io = require("../config/sockets/index");
const notificationModel = require("../models/Notification");
// const userModel = require("../models/User");

router.get("/notification", function (req, res) {
	res.render("notifications");
});

router.post("/notificationAction", urlencodedParser, function (req, res) {
	console.log('req.body')
	console.log(req.body);
	let findUserId;
	let setUserId;
	notificationModel.findOne({ where: { InvitationHash: req.query.InvitationHash } })
		.then(notification => {
			if (notification.isInfoNotification) {
				notification.update({ isRead: 1, InvitationType: '' });
			} else {
				if (notification.InvitationType == 'joinTeam') {
					setUserId = notification.senderId;
					findUserId = notification.receiverId;
				} else if (notification.InvitationType == 'inviteTeam') {
					setUserId = notification.receiverId;
					findUserId = notification.senderId;
				}
				userModel.findOne({ where: { UserId: findUserId }, raw: true }).then(userSender => {
					Team.findOne({ where: { TeamId: userSender.Team_Id }, raw: true }).then(team => {
						console.log('team');
						console.log(team);
						if (!team) {
							console.log('team not found');
						} else {
							console.log('answer')
							console.log(req.body.answer)
							console.log('team team id');
							console.log(team.TeamId);
							userModel.findOne({ where: { UserId: setUserId } })
								.then(userReceiver => {
									console.log('----------------first----------------')
									if (req.body.answer == 'accept') {
										userReceiver.update({ Team_Id: team.TeamId })
									}

									console.log('users found')
									//ответ тому, кто отправлял
									console.log(userSender)
									console.log(userReceiver)
									io.emitUser(notification.senderId, "sendAnswer", {
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
										answer: req.body.answer,
										InvitationType: notification.InvitationType
									});

								})
						}
					});
				})
					.catch(err => {
						console.log('userModel error: ' + err);
					})
			}
		})
		.then(res.end("notifications123"))
		.catch(err => {
			console.log(err);
		});
});

module.exports = router;
