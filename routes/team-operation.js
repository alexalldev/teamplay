let { router, passport, Team, User, urlencodedParser } = require('../config/routers-config');

const notification = require('../modules/teamplay-notifications');

router.get('/team-operation', function(req, res) {
	res.render('team-operation');
});

router.post('/createTeam', urlencodedParser, function(req, res) {
	Team.findOne({ where: { TeamName: req.body.teamName } })
		.then(team => {
			if (team) {
				res.send(false);
			} else {
				Team.create({ TeamName: req.body.teamName, GroupName: 'test', Email: 'test' }).catch(err => {
					console.log('CreateTeamError');
					res.send(false);
				});
				res.send(true);
			}
		})
		.catch(err => {
			console.log(err);
			res.send(false);
		});
});

router.post('/deleteTeam', urlencodedParser, function(req, res) {
	Team.findOne({ where: { TeamName: req.body.teamName } })
		.then(team => {
			if (!team) {
				res.send(false);
			} else {
				Team.destroy({ where: { TeamName: req.body.teamName } }).catch(err => {
					console.log('DeleteTeamError');
					res.send(false);
				});
				res.send(true);
			}
		})
		.catch(err => {
			console.log('FindTeamTeamError');
			res.send(false);
		});
});

router.post('/invite', urlencodedParser, async function(req, res) {
	let invitationType = 'info';
	let canSend = true;
	let reciever_user;
	await User.findOne({ where: { UserId: req.body.receiverId }, raw: true })
		.then(userReceiver => {
			reciever_user = userReceiver;
		})
		.catch(err => console.log(`${__filename}: User.findOne receiver ${err}`));
	//если любое поле, кроме receiverId и shouldCreate != undefined как при запросе на получение уведомлений из базы
	if (req.body.isInfoNotification)
		await User.findOne({ where: { UserId: req.body.senderId }, raw: true })
			.then(sender_user => {
				if (
					req.body.isInfoNotification == 'false' &&
					((!sender_user.isCoach || reciever_user.Team_Id != 0) && (sender_user.Team_Id != 0 || !reciever_user.isCoach))
				)
					canSend = false;
				else if (req.body.isInfoNotification == 'false') invitationType = sender_user.isCoach ? 'inviteTeam' : 'joinTeam';
			})
			.catch(err => console.log(err));

	if ((req.body.shouldCreate == 'true' && canSend) || req.body.shouldCreate == 'false') {
		notification(
			{
				receiverId: req.body.receiverId,
				shouldCreate: req.body.shouldCreate,
				senderId: req.body.senderId,
				header: req.body.header,
				mainText: req.body.mainText,
				isInfoNotification: req.body.isInfoNotification,
				invitationType: invitationType
			},
			req,
			function(err) {
				if (err) res.end(JSON.stringify(err));
				else res.end('true');
			}
		);
	}
	res.end('notification sent');
});

router.post('/changeTeamName', urlencodedParser, function(req, res) {
	Team.findOne({ where: { TeamName: req.body.oldName } })
		.then(team => {
			if (!team) {
				res.send(false);
			} else {
				Team.update({ TeamName: req.body.newName }, { where: { TeamName: req.body.oldName } })
					.then(team => {
						res.send(true);
					})
					.catch(err => {
						console.log('teamNameUpdateError');
						res.send(false);
					});
			}
		})
		.catch(err => {
			console.log('FindTeamTeamError');
			res.send(false);
		});
});

router.post('/changeCoach', urlencodedParser, function(req, res) {
	User.findOne({ where: { UserId: req.body.oldCoachId, Team_Id: req.body.teamId } })
		.then(old => {
			if (!old) {
				res.send(false);
			} else {
				User.findOne({ where: { UserId: req.body.newCoachId, Team_Id: req.body.teamId } })
					.then(newCap => {
						if (!newCap) {
							res.send(false);
						} else {
							old.update({ isCoach: 0 });
							newCap.update({ isCoach: 1 });
							res.send(true);
						}
					})
					.catch(err => {
						console.log(err);
					});
			}
		})
		.catch(err => {
			console.log(err);
		});
});

router.post('/getCurrUserId', urlencodedParser, function(req, res) {
	res.json({ receiverId: req.session.passport.user });
});

module.exports = router;
