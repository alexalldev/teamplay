let {
    router,
    passport,
    Team,
    Player,
    urlencodedParser
} = require('../config/routers-config');


router.get('/team-operation', function(req, res) {
    res.render('team-operation');
});

router.post("/createTeam", urlencodedParser, function(req, res){
    Team.findOne({ where: { TeamName: req.body.teamName }}).then(team => {
        if (team) {
            res.send(false);
        } else {
            Team.create({ TeamName: req.body.teamName, GroupName: "test", Email: "test"})
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

router.post("/deleteTeam", urlencodedParser, function(req, res){
    Team.findOne({ where: { TeamName: req.body.teamName }}).then(team => {
        if(!team){
            res.send(false);
        } else {
            Team.destroy({ where: { TeamName: req.body.teamName }})
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
    Player.findOne({ where: { PlayerId: req.body.PlayerId }}).then(player => {
        Team.findOne({ raw:true, where: { TeamId: player.Team_Id }}).then( team => {
            if( !team ){
                res.send(false);
            } else {
                Player.update( { Team_Id: team.TeamId }, { where: { PlayerId: player.PlayerId }})
                .catch(err => {
                    console.log("InvitePlayerError");
                    res.send(false);
                });
                res.send(true);
            }
        });
    });fs.readFile(function(data) {
        var email = data.split(CONFRIM_NEW_CREATOR_BUTTON);
    })
});

router.post("/changeTeamName", urlencodedParser, function(req, res) {
    Team.findOne({ where: { TeamName: req.body.oldName } }).then(team => {
        if(!team) {
            res.send(false);
        } else {
            Team.update({TeamName: req.body.newName}, { where: { TeamName: req.body.oldName } })
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

router.post("/changeCapitan", urlencodedParser, function(req, res) {
    Player.update({Capitan: 0}, { where: { PlayerId: req.body.oldCapitanId, Team_Id: req.body.teamId } })
    .then(player => {
        Player.update({Capitan: 1}, { where: { PlayerId: req.body.newCapitanId, Team_Id: req.body.teamId } })
        .then(player => {
            res.send(true);
        })
        .catch(err => {
            console.log("changeCaptainError");
            res.send(false);
        });
    })
    .catch(err => {
        console.log("FindCaptainError");
        res.send(false);
    });
});

module.exports = router;