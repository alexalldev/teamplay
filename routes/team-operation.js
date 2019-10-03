let { router, passport, Team, User, urlencodedParser } = require('../config/routers-config');

const notification = require('../modules/teamplay-notifications');

router.get('/team-operation', function (req, res) {
	res.render('team-operation');
});

router.post('/createTeam', urlencodedParser, function (req, res) {
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

router.post('/deleteTeam', urlencodedParser, function (req, res) {
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

router.post('/invite', urlencodedParser, function (req, res) {
	let invitationType = '';
	let canSend = true;
	User.findOne({ where: { UserId: req.body.senderId }, raw: true })
		.then(sender_user => {
			User.findOne({ where: { UserId: req.body.receiverId }, raw: true })
				.then(reciever_user => {
					if (!req.body.isInfoNotification)
						if ((sender_user.isCoach && reciever_user.Team_Id == 0) || (sender_user.Team_Id == 0 && reciever_user.isCoach)) {
							invitationType = sender_user.isCoach ? 'inviteTeam' : 'joinTeam';
							canSend = true;
						} else canSend = false;
					console.log(canSend);

					if (canSend)
						notification(
							req.body.senderId,
							req.body.receiverId,
							req.body.header,
							req.body.mainText,
							req.body.isInfoNotification,
							invitationType,
							function (err) {
								if (err) res.end(JSON.stringify(err));
								else res.end('true');
							},
							req
						);
					else res.end("You can't send invitation to this player");
				})
				.catch(err => console.log(err));
		})
		.catch(err => console.log(err));
});

router.post('/changeTeamName', urlencodedParser, function (req, res) {
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

router.post('/changeCoach', urlencodedParser, function (req, res) {
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

module.exports = router;
