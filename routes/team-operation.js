let {
    router,
    passport,
    Team,
    User,
    urlencodedParser
} = require('../config/routers-config');

const notification = require("../modules/teamplay-norifications");

router.get('/team-operation', function (req, res) {
    res.render('team-operation');
});

router.post("/createTeam", urlencodedParser, function (req, res) {
    Team.findOne({ where: { TeamName: req.body.teamName } }).then(team => {
        if (team) {
            res.send(false);
        } else {
            Team.create({ TeamName: req.body.teamName, GroupName: "test", Email: "test" })
                .catch(err => {
                    console.log("CreateTeamError");
                    res.send(false);
                });
            res.send(true);
        }
    }).catch(err => {
        console.log(err);
        res.send(false);
    });
});

router.post("/deleteTeam", urlencodedParser, function (req, res) {
    Team.findOne({ where: { TeamName: req.body.teamName } }).then(team => {
        if (!team) {
            res.send(false);
        } else {
            Team.destroy({ where: { TeamName: req.body.teamName } })
                .catch(err => {
                    console.log("DeleteTeamError");
                    res.send(false);
                });
            res.send(true);
        }
    }).catch(err => {
        console.log("FindTeamTeamError");
        res.send(false);
    });
});

router.post("/invite", urlencodedParser, function (req, res) {
    notification(req.body.senderId, req.body.receiverId, req.body.header, req.body.mainText, req.body.isInfoNotifications,
        req.body.InvitationType, function (err) {
            if (err) res.end(JSON.stringify(err));
            else res.end("true");
        }, req);
});

router.post("/changeTeamName", urlencodedParser, function (req, res) {
    Team.findOne({ where: { TeamName: req.body.oldName } }).then(team => {
        if (!team) {
            res.send(false);
        } else {
            Team.update({ TeamName: req.body.newName }, { where: { TeamName: req.body.oldName } })
                .then(team => {
                    res.send(true);
                })
                .catch(err => {
                    console.log("teamNameUpdateError");
                    res.send(false);
                });
        }
    }).catch(err => {
        console.log("FindTeamTeamError");
        res.send(false);
    });
});

router.post("/changeCapitan", urlencodedParser, function (req, res) {
    User.findOne({ where: { UserId: req.body.oldCapitanId, Team_Id: req.body.teamId } })
        .then(old => {
            if (!old) {
                res.send(false);
            } else {
                User.findOne({ where: { UserId: req.body.newCapitanId, Team_Id: req.body.teamId } })
                    .then(newCap => {
                        if (!newCap) {
                            res.send(false);
                        } else {
                            old.update({ Capitan: 0 });
                            newCap.update({ Capitan: 1 });
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