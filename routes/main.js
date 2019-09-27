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
    Answer,
    User
} = require('../config/routers-config');

var formidable = require('formidable');

var nodeMailer = require('nodemailer');
const Op = require('sequelize').Op;
var fs = require('fs');
var crypto = require('crypto');

const GamePlay = require('../models/GamePlay');

var Hash = require('password-hash');

router.get('/', RedirectRules, function (req, res) {
    res.render('index', { Code: req.query.Code, User: req.query.User });
});

router.get('/rooms', function (req, res) {
    res.render('roomTest');
});

router.post('/RegisterNewUser', urlencodedParser, function (req, res) {
    if (req.body.password === req.body.confirmpassword) {
        if (req.body.password.length > 5) {
            if (validateEmail(req.body.email)) {
                let transporter = nodeMailer.createTransport({
                    host: 'mail.alexall.dev',
                    port: 465,
                    secure: true,
                    auth: {
                        user: 'info@teamplay.space',
                        pass: 'teamplayspace'
                    }
                });

                fs.readFile(__dirname + '/../html_mail/TeamPlayVerificationEmail.html', 'utf-8', function (err, data) {
                    if (err) res.end(JSON.stringify(err));
                    var html_mail_array = data.split('CONFIRM_NEW_USER_BUTTON');
                    var confirmation_hash = crypto.randomBytes(Math.ceil(120 / 2))
                        .toString('hex') // convert to hexadecimal format
                        .slice(0, 120);
                    var html_mail = html_mail_array[0] + req.protocol + '://' + req.hostname + '/ConfirmNewUserAccount?confirmation_type=email&security_code=' + confirmation_hash + html_mail_array[1];


                    let mailOptions = {
                        from: '"Teamplay info" <info@teamplay.space>', // sender address
                        to: req.body.email,
                        subject: 'Подтвердите регистрацию Teamplay', // Subject line
                        html: html_mail
                    };

                    var UserFio = req.body.fullname.split(' ');
                    if (UserFio.length == 3 && UserFio[0] != '' && UserFio[1] != '' && UserFio[2] != '')
                        User.findOrCreate({ where: { UserEmail: req.body.email.toLowerCase() } })
                            .then(([user, created]) => {
                                if (created == true) {

                                    user.update({
                                        UserName: UserFio[1].charAt(0).toUpperCase() + UserFio[1].substring(1).toLowerCase(),
                                        UserFamily: UserFio[0].charAt(0).toUpperCase() + UserFio[0].substring(1).toLowerCase(),
                                        UserLastName: UserFio[2].charAt(0).toUpperCase() + UserFio[2].substring(1).toLowerCase(),
                                        UserPassword: Hash.generate(req.body.password),
                                        UserRegistrationToken: confirmation_hash,
                                        UserIsActive: false,
                                        isCoach: false
                                    })
                                        .then(() => {
                                            transporter.sendMail(mailOptions, (error, info) => {
                                                if (error) {
                                                    return res.end(JSON.stringify(error));
                                                }
                                                //console.log('Message %s sent: %s', info.messageId, info.response);
                                                res.end('true');
                                            });
                                        })
                                }
                                else {
                                    res.end('user_exists');
                                }
                            })
                            .catch(err => console.log(err));
                    else
                        res.end('incorrect_fio');
                });
            }
            else
                res.end('incorrect_email');
        }
        else
            res.end('poor_password');
    }
    else
        res.end('incorrect_confirm_password');
});

router.get('/ConfirmNewUserAccount', function (req, res, next) {
    if (req.query.confirmation_type = 'email')
        if (req.query.security_code != '')
            User.findOne({ where: { UserRegistrationToken: req.query.security_code } })
                .then(user => {
                    if (user)
                        user.update({
                            UserRegistrationToken: '',
                            UserIsActive: true
                        })
                            .then(() => {
                                req.logIn(user, function (err) {
                                    if (err) throw err
                                    else res.redirect('/');
                                });
                            })
                    else
                        res.end('false');
                })
                .catch(err => console.log(err));
});

router.post('/SignIn', RedirectRules, function (req, res, next) {
    passport.authenticate('local', { failureRedirect: '/', failureFlash: true }, function (err, User, info) {
        if (err) return next(err);
        if (info) return res.send(info.message);
        if (!User) return res.send("USER IS NULL");

        req.logIn(User, function (err) {
            if (err) {
                return next(User);
            }
            return res.send({ result: true, UserName: User.UserName, UserImage: streamLink = req.protocol + '://' + req.hostname + '/UserImage?UserId=' + User.UserId });
        });
    })(req, res, next);
});

router.get('/Room/:GameTag', function (req, res) {
    if (req.session.Team) {
        Game.findOne({ where: { GameTag: req.params.GameTag } })
            .then(game => {
                if (game != null) {
                    if (req.session.Game) {
                        //Для тех, кто обновляет страницу
                        GameTeam.findOne({ raw: true, where: { Game_Id: req.session.Game.Id } })
                            .then(gameTeam => {
                                if (gameTeam) {
                                    return res.render('game', { game: game, team: req.session.Team, verified: gameTeam.Verified });
                                }
                                return res.render('info', { message: "Игра уже идет. Дождитесь окночания и подключитесь позже." });
                            })
                            .catch(err => res.end(JSON.stringify(err)));
                    }
                    else {
                        //Для тех, которые входят в игру в первый раз
                        GameTeam.findOne({ raw: true, where: { Game_Id: game.GameId, Play: { [Op.gt]: 0 } } })
                            .then(gameTeam => {
                                if (gameTeam == null) {
                                    GameTeam.findOrCreate({
                                        where: {
                                            Game_Id: game.GameId,
                                            Team_Id: req.session.Team.TeamId
                                        }
                                    })
                                        .then(([gameTeam, created]) => {
                                            if (created == true) {
                                                req.session.Game =
                                                    {
                                                        Id: game.GameId,
                                                        GameTeamId: gameTeam.GameTeamId,
                                                        Tag: game.GameTag,
                                                    }
                                                Team.findOne({ raw: true, where: { TeamId: gameTeam.Team_Id } })
                                                    .then(team => {
                                                        if (team != null)
                                                            Team.AddTeamPlayers(team, function (fullTeam) {
                                                                fullTeam.GameTeamId = gameTeam.GameTeamId
                                                                res.render('game', { game: game, team: team, verified: false });
                                                                io.to('Admins' + req.session.Game.Id).emit("JoinTeam", fullTeam);

                                                            })
                                                        else
                                                            res.render('info', { message: "Команда была удалена" });
                                                    })
                                                    .catch(err => console.log(err))
                                            }
                                            else {
                                                if (req.session.Game)
                                                    if (req.session.Game.Tag == req.params.GameTag) {
                                                        return res.render('game', { game: game, team: req.session.Team, verified: gameTeam.Verified });
                                                    }
                                                res.render('info', { message: "Такая команда уже участвует в игре" });
                                            }
                                        })
                                        .catch(err => console.log(err))
                                }
                                else
                                    return res.render('info', { message: "Игра уже идет. Дождитесь окночания и подключитесь позже." });
                            })
                            .catch(err => res.end(JSON.stringify(err)));
                    }
                }
                else
                    res.render('info', { message: "Игра была удалена" });
            })
            .catch(err => console.log(err));
    }
    else
        res.redirect('/');
});

router.get('/logout', function (req, res) {
    req.query.reason ? LogOut(req, res, req.query.reason) : LogOut(req, res)
});

function LogOut(req, res, reason = '') {
    if (req.session.Team) {
        if (req.session.Game) {
            if (req.session.Game.GameTeamId) {
                GameTeam.destroy({ where: { GameTeamId: req.session.Game.GameTeamId } })
                    .then(gameTeam => {
                        io.to('Admins' + req.session.Game.Id).emit('LeftTeam', req.session.Game.GameTeamId);

                        delete req.session.Game;
                        delete req.session.Team;
                        reason != '' ? res.render('info', { message: reason }) : res.redirect('/');
                    })
                    .catch(err => console.log(err))
            }
        }
        else {
            delete req.session.Team;
            reason != '' ? res.render('info', { message: reason }) : res.redirect('/');
        }
    }
    else {
        if (req.session.Game)
            delete req.session.Game;
        req.logout();
        res.redirect('/');
    }
}

router.get('/ControlPanel', app.protect, function (req, res) {
    if (req.session.Game)
        delete req.session.Game;
    res.render('controlPanel');
});

router.get('/ControlPanel/:GameTag', app.protect, function (req, res) {
    Game.findOne({ where: { GameTag: req.params.GameTag } })
        .then(async game => {
            if (game != null) {
                req.session.Game =
                    {
                        Id: game.GameId,
                        Tag: game.GameTag,
                    }
                streamLink = req.protocol + '://' + req.hostname + '/stream/' + game.GameTag;
                await res.render('controlGame', { game: game, streamLink: streamLink })
            }
            else
                res.render('info', { message: "Игры " + req.params.GameTag + ' не существует или она была удалена.' });
        })
        .catch(err => console.log(err));
});

router.post('/SetStreamBackground', urlencodedParser, function (req, res) {
    if (req.session.passport) {
        if (req.session.Game) {
            var form = formidable.IncomingForm();
            form.uploadDir = './IMAGES/STREAM_IMAGES';
            form.parse(req, function (err, fields, files) {
                if (files.StreamImage) {
                    if (files.StreamImage.size < 20000000) {
                        var StreamImagePath = files.StreamImage.path.split('STREAM_IMAGES')[1].replace(/\\/g, '');

                        if (files.StreamImage.type == 'image/png' || files.StreamImage.type == 'image/jpeg' || files.StreamImage.type == 'image/gif' || files.StreamImage.type == 'image/svg') {
                            GamePlay.findOne({ where: { Game_Id: req.session.Game.Id } })
                                .then((gamePlay) => {
                                    var returnData = {};
                                    gamePlay.update({ StreamImagePath: StreamImagePath })
                                        .then(updated => {
                                            if (updated) {
                                                returnData.StreamImage = req.protocol + '://' + req.hostname + '/StreamImage?GamePlayId=' + gamePlay.dataValues.GamePlayId;
                                                res.end(JSON.stringify(returnData));
                                            }
                                            else {
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
                else {
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

function validateEmail(email) {
    var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
}