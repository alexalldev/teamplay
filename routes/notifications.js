const { router, urlencodedParser } = require("../config/routers-config");

const notification = require("../modules/teamplay-norifications");
const io = require("../config/sockets/index");
const notificationModel = require("../models/Notification");
const userModel = require("../models/User");

router.get("/notification", function (req, res) {
	res.render("notifications");
});

router.post("/sendNotification", urlencodedParser, function (req, res) {
	notification(
		req.body.senderId,
		req.body.receiverId,
		req.body.header,
		req.body.mainText,
		req.body.isInfoNotification,
		req.body.InvitationType,
		function (err) {
			if (err) res.end(JSON.stringify(err));
			else res.end("true");
		},
		req
	);
});

router.post("/notificationAction", urlencodedParser, function (req, res) {
	console.log('req.body')
	console.log(req.body.InvitationHash)
	notificationModel.findOne({ where: { InvitationHash: req.body.InvitationHash } })
		.then(notification => {
			console.log('notification');
			if (notification.isInfoNotification) {
				notification.update({ isRead: 1, InvitationType: '' });
				console.log('it\'s info');
			}
			userModel
				.findOne({
					where: {
						userId: notification.senderId
					},
					raw: true
				})
				.then(userSender => {
					userModel
						.findOne({
							where: {
								userId: notification.receiverId
							},
							raw: true
						})
						.then(userReceiver => {
							console.log('users found')
							io.emitUser(notification.senderId, "sendAnswer", {
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
						});
				})
		})
		.then(res.end("true"))
		.catch(err => {
			res.send(err);
		});
});

module.exports = router;
