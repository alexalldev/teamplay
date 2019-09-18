let {
    router,
    passport,
    Team,
    Player,
} = require('../config/routers-config');


router.post("/createTeam/:teamName", function(req, res){
    Team.findAll({ where: { TeamName: req.params.teamName }}).then(team => {
        if(team != null){
            res.send(false);
        } else {
            Team.create({ TeamName: req.params.teamName, GroupName: "test", Email: "test"})
            .catch(err => {
                console.log("CreateTeamError");
                res.send(false);
            });
            res.send(true);
        }
    }).catch(err => {
        console.log("FindTeamError");
        res.send(false);
    });
});

router.post("/deleteTeam/:teamName", function(req, res){
    Team.findAll({ where: { TeamName: req.params.teamName }}).then(team => {
        if(team = null){
            res.send(false);
        } else {
            Team.destroy({ where: { TeamName: req.params.teamName }})
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

router.post("/invite/:PlayerID", function (req, res) {
    Player.findOne({ where: { PlayerId: req.params.PlayerID }}).then(player => {
        Team.findOne({ raw:true, where: { TeamId: player.Team_Id }}).then( team => {
            if( team ){
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
    });
});

router.post("/changeTeamName/:newName/:oldName", function(req, res) {
    Team.findOne({ where: { TeamName: req.params.oldName } }).then(team => {
        if(!team) {
            res.send(false);
        } else {
            Team.update({TeamName: req.params.newName}, { where: { TeamName: req.params.oldName } })
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

router.post("/changeCapitan/:oldCapitanId/:newCapitanId/:teamId", function(req, res) {
    Player.update({Capitan: 0}, { where: { PlayerId: req.params.oldCapitanId, Team_Id: req.params.teamId } })
    .then(player => {
        Player.update({Capitan: 1}, { where: { PlayerId: req.params.newCapitanId, Team_Id: req.params.teamId } })
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