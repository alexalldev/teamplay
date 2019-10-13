const {
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

router.get('/stream/:GameTag', function(req, res) {
  Game.findOne({ raw: true, where: { GameTag: req.params.GameTag } })
    .then(game => {
      if (game) {
        req.session.Stream = {
          GameId: game.GameId
        };
        res.render('stream', { game: game });
      } else res.render('info', { message: 'Игры нет или она была удалена' });
    })
    .catch(err => {
      console.log(err);
      res.render('info', { message: 'Игры нет или она была удалена' });
    });
});

module.exports = router;
