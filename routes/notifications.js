const { router, urlencodedParser } = require('../config/routers-config');

const notification = require('../modules/teamplay-norifications');
const io = require('../config/sockets/index');
const notificationModel = require('../models/Notification');
const userModel = require('../models/User');

router.get('/notification', function(req, res) {
	res.render('notifications');
});

router.post('/sendNotification', urlencodedParser, function(req, res) {
	notification(
		req.body.senderId,
		req.body.receiverId,
		req.body.header,
		req.body.mainText,
		false,
		req.body.InvitationType,
		function(err) {
			if (err) res.end(JSON.stringify(err));
			else res.end('true');
		},
		req
	);
});

router.post('/notificationAction', urlencodedParser, function(req, res) {
	console.log('req.body.InvitationType');
	console.log(req.body.InvitationType);
	userModel
		.findOne({ where: { userId: req.body.senderId }, raw: true })
		.then((userSender) => {
			userModel.findOne({ where: { userId: req.body.receiverId }, raw: true }).then((userReceiver) => {
				io.emitUser(req.body.senderId, 'sendAnswer', {
					senderFullName: [ userSender.UserName, userSender.UserFamily, userSender.UserLastName ],
					receiverFullName: [ userReceiver.UserName, userReceiver.UserFamily, userReceiver.UserLastName ],
					answer: req.body.answer,
					InvitationType: req.body.InvitationType
				});
			});
		})
		.then(res.end('true'))
		.catch((err) => {
			res.send(err);
		});
});

module.exports = router;
