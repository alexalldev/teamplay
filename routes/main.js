let {
    express,
    router,
    passport,
    Team,
    Admin,
    Player,
    Game,
    GameTeam,
    app,
    bodyParser,
    urlencodedParser,
    io,
    Category,
    Question,
    Answer
} = require('../config/routers-config');

var formidable = require('formidable');

const Op = require('sequelize').Op;

const GamePlay = require('../models/GamePlay');
  
router.get('/', RedirectRules, function(req, res)
{
    Team.hasMany(Player, {foreignKey: "Team_Id"});
    Player.belongsTo(Team, {foreignKey: "Team_Id"});
    Player.findAll({
        raw: true,
        include: [Team],
        where:
        {
            Capitan: true
        }
    })
    .then(teams => {
        res.render('index', {teams});
    })
    .catch(err => {
        console.log(err);
        res.end("LoadTeamsError");
    });
});

router.get('/Admin', RedirectRules, function(req, res) {
    Admin.findAll({
        raw: true
    })
    .then(admins => {
        res.render('admin.ejs', {admins});
    })
    .catch(err => {
        res.end(err);
    })
});
  
router.get('/Room', function(req, res) {
    if (req.session.Game)
        res.redirect('/Room/' + req.session.Game.Tag);
    else if (req.session.Team)
    Team.findOne({raw: true, where: {TeamId: req.session.Team.TeamId}})
    .then(team => {
        if (team != null)
            Player.findAll({raw: true, where: {Team_Id: req.session.Team.TeamId}})
            .then(players => res.render('room', {team: team, players: players}))
            .catch(err => console.log(err));
        else
            res.render('info', {message: "Команда была удалена."});
    })
    .catch(err => console.log(err))
    else
        res.redirect("/");
});

router.get('/Room/:GameTag', function(req, res) {
    if (req.session.Team)
    {
        Game.findOne({where: {GameTag: req.params.GameTag}})
        .then(game => {
            if (game != null)
            {
                if (req.session.Game)
                {
                    //Для тех, кто обновляет страницу
                    GameTeam.findOne({raw: true, where: {Game_Id: req.session.Game.Id}})
                    .then(gameTeam => {
                        if (gameTeam)
                        {
                            return res.render('game', {game: game, team: req.session.Team, verified: gameTeam.Verified});
                        }
                        return res.render('info', {message: "Игра уже идет. Дождитесь окночания и подключитесь позже."});
                    })
                    .catch(err => res.end(JSON.stringify(err)));
                }
                else
                {
                    //Для тех, которые входят в игру в первый раз
                    GameTeam.findOne({raw: true, where: {Game_Id: game.GameId, Play: {[Op.gt]: 0}}})
                    .then(gameTeam => {
                        if (gameTeam == null)
                        {
                            GameTeam.findOrCreate({
                                where: {
                                    Game_Id: game.GameId,
                                    Team_Id: req.session.Team.TeamId
                                }
                            })
                            .then(([gameTeam, created]) => {
                                if (created == true)
                                {
                                    req.session.Game = 
                                    {
                                        Id: game.GameId,
                                        GameTeamId: gameTeam.GameTeamId,
                                        Tag: game.GameTag,
                                    }
                                    Team.findOne({raw: true, where: {TeamId: gameTeam.Team_Id}})
                                        .then(team => {
                                            if (team != null)
                                                Team.AddTeamPlayers(team, function(fullTeam) {
                                                    fullTeam.GameTeamId = gameTeam.GameTeamId
                                                    res.render('game', {game: game, team: team, verified: false});
                                                    io.to('Admins' + req.session.Game.Id).emit("JoinTeam", fullTeam);
                                                    
                                                })
                                            else
                                                res.render('info', {message: "Команда была удалена"}); 
                                        })
                                        .catch(err => console.log(err))
                                }
                                else
                                {
                                    if (req.session.Game)
                                        if (req.session.Game.Tag == req.params.GameTag)
                                        {
                                            return res.render('game', {game: game, team: req.session.Team, verified: gameTeam.Verified});
                                        }
                                    res.render('info', {message: "Такая команда уже участвует в игре"});
                                }
                            })
                            .catch(err => console.log(err))
                        }
                        else
                            return res.render('info', {message: "Игра уже идет. Дождитесь окночания и подключитесь позже."});
                    })
                    .catch(err => res.end(JSON.stringify(err)));
                }
            }
            else
                res.render('info', {message: "Игра была удалена"});
        })
        .catch(err => console.log(err));
    }
    else
    res.redirect('/');
});

router.post('/Start', urlencodedParser, function(req, res) {
    var teamId = req.body.TeamId;
    if (!req.body) res.sendStatus(400);
    Team.findByPk(teamId, {raw: true})
    .then(team => {
        if (team)
        {
            req.session.Team = team;
            res.end('1');
        }
        else
            res.end("team_not_exists")
    })
    .catch(err => {
        res.end(err)
    })
});

router.get('/logout', function(req, res) {
    req.query.reason ? LogOut(req, res, req.query.reason) : LogOut(req, res)
});

function LogOut(req, res, reason = '')
{
    if (req.session.Team)
    {
        if (req.session.Game)
        {
            if (req.session.Game.GameTeamId)
            {
                GameTeam.destroy({where: {GameTeamId: req.session.Game.GameTeamId}})
                .then(gameTeam =>
                    {
                        io.to('Admins' + req.session.Game.Id).emit('LeftTeam', req.session.Game.GameTeamId);
                        
                        delete req.session.Game;
                        delete req.session.Team;
                        reason != '' ? res.render('info', {message: reason}) : res.redirect('/');
                    })
                .catch(err => console.log(err))
            }
        }
        else
        {
            delete req.session.Team;
            reason != '' ? res.render('info', {message: reason}) : res.redirect('/');
        }
    }
    else
    {
        if (req.session.Game)
            delete req.session.Game;
        req.logout();
        if (reason == 'ADMIN_KICK')
            res.redirect('/');
        else
            res.redirect('/Admin');
    }
}

router.post('/AdminEnter', RedirectRules, function(req, res, next) {
    if (!req.session.Team) passport.authenticate('local', {failureFlash: true}, function(err, admin, info) {
        if (err) return next(err);
        if (info) return res.send(info.message);
        if (!admin) return res.send("USER IS NULL");
    
        req.logIn(admin, function(err) {
        if (err) {
            return next(admin);
        }
        return res.send(true);
        });
    })(req, res, next);
});

router.get('/ControlPanel', app.protect, function(req, res) {
    if (req.session.Game)
        delete req.session.Game;
    res.render('controlPanel');
});

router.get('/ControlPanel/:GameTag', app.protect, function(req, res) {
    Game.findOne({where: {GameTag: req.params.GameTag}})
    .then(async game => {
        if (game != null)
        {
            req.session.Game = 
            {
                Id: game.GameId,
                Tag: game.GameTag,
            }
            streamLink = req.protocol + '://' + req.hostname + '/stream/' + game.GameTag;
            await res.render('controlGame', {game: game, streamLink: streamLink})
        }
        else
            res.render('info', {message: "Игры " + req.params.GameTag + ' не существует или она была удалена.'});
    })
    .catch(err => console.log(err));
});

router.post('/SetStreamBackground', urlencodedParser, function(req, res) {
    if (req.session.passport )
    {
        if (req.session.Game)
        {
            var form = formidable.IncomingForm();
            form.uploadDir = './IMAGES/STREAM_IMAGES';
            form.parse(req, function(err, fields, files) {
                if (files.StreamImage)
                {
                    if (files.StreamImage.size < 20000000)
                    {
                        var StreamImagePath = files.StreamImage.path.split('STREAM_IMAGES')[1].replace(/\\/g, '');
                        
                        if (files.StreamImage.type == 'image/png' || files.StreamImage.type == 'image/jpeg' || files.StreamImage.type == 'image/gif' || files.StreamImage.type == 'image/svg')
                        {
                            GamePlay.findOne({where: {Game_Id: req.session.Game.Id}})
                            .then((gamePlay) => {
                                var returnData = {};
                                gamePlay.update({StreamImagePath: StreamImagePath})
                                .then(updated => {
                                    if (updated)
                                    {
                                        returnData.StreamImage = req.protocol + '://' + req.hostname + '/StreamImage?GamePlayId=' + gamePlay.dataValues.GamePlayId;
                                        res.end(JSON.stringify(returnData));
                                    }
                                    else
                                    {
                                        console.log('NoUpdated');
                                        res.end('null');
                                    }
                                })
                            })
                            .catch(err => res.end(JSON.stringify(err)));
                        }
                        else
                            res.end('incorrect_format');
                    }
                    else
                        res.end('incorrect_size');
                }
                else
                {
                    res.end('null');
                }
            });
        }
        else
            res.end('null');
    }
    else
        res.end('null');
});

module.exports = router;

function RedirectRules(req, res, next) {
    if (req.session.Team)
        res.redirect('Room');
    else if (req.isAuthenticated())
        res.redirect('ControlPanel');
    else
        next();
}