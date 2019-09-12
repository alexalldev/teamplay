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

router.get('/EditGame/:GameTag', app.protect, function(req, res) {
    Game.findOne({where: {GameTag: req.params.GameTag}})
    .then(game => {
        if (game != null)
        {
            req.session.Game = 
            {
                Id: game.GameId,
                Tag: game.GameTag,
            }
            res.render('editGame', {game: game})
        }
        else
            res.render('info', {message: "Игры " + req.params.GameTag + ' не существует или она была удалена.'});
    })
    .catch(err => console.log(err));
});

router.post('/SetGameTime', urlencodedParser, function(req, res) {
    if (req.body.time && req.body.type)
        if(req.body.time >= 5)
            Game.findOne({where: {GameId: req.session.Game.Id}})
            .then(game => {
                if (req.body.type == 1)
                    game.update({
                        SelectionTime: req.body.time
                    }).then(res.end("true")).catch(err => res.end(JSON.stringify(err)))
                else if (req.body.type == 2)
                    game.update({
                        AnswerTime: req.body.time
                        }).then(res.end("true")).catch(err => res.end(JSON.stringify(err)))
            })
            .catch(err => console.log(err));
        else
            res.end("min_time");
    else
        res.end("err_attributes");
});

router.post('/CreateCategory', urlencodedParser, function(req, res) {
    if (req.body.CategoryName)
        Category.create({CategoryName: req.body.CategoryName, Game_Id: req.session.Game.Id})
        .then(category => res.end(JSON.stringify(category)))
        .catch(err => res.end(JSON.stringify(err)))
});

router.post('/Load', urlencodedParser, function(req, res) {
    var LoadType = req.body.LoadType;
    var CategoryId = req.body.CategoryId;
    var QuestionId = req.body.QuestionId;
    if (LoadType)
    {
        if (LoadType == 1)
        {
            Category.findAll({raw: true, where: {Game_Id: req.session.Game.Id}})
            .then(category => {
                if (category.length != 0)
                    res.end(JSON.stringify(category))
                else
                    res.end('null');
            })
            .catch(err => res.end(JSON.stringify(err)))
        }
        else if (LoadType == 2)
        {
            if (CategoryId)
                Question.findAll({raw: true, where: {Category_Id: CategoryId}})
                .then(questions =>
                    {
                        if (questions.length != 0)
                        {
                            for (var q in questions)
                            {
                                if (questions[q].QuestionImage != '')
                                    questions[q].QuestionImage = req.protocol + '://' + req.hostname + '/QuestionImage?QuestionId=' + questions[q].QuestionId;
                                else
                                    questions[q].QuestionImage = '';
                            }
                                res.end(JSON.stringify(questions))
                        }
                        else
                            res.end('null');
                    })
                .catch(err => res.end(JSON.stringify(err)))
        }
        else if (LoadType == 3)
        {
            Answer.findAll({raw: true, where: {Question_Id: QuestionId}})
            .then(answers =>
                {
                    res.end(JSON.stringify(answers));
                })
            .catch(err => res.end(JSON.stringify(err)))
        }
    }
    else
        res.end('null');
});

router.post('/CreateQuestion', urlencodedParser, function(req, res) {
    var form = formidable.IncomingForm();
    form.uploadDir = './IMAGES/QUESTIONS_IMAGES';
    form.parse(req, function(err, fields, files) {
        let {QuestionText, QuestionCost, Category_Id} = fields;
        if (files.QuestionImage)
        {
            if (files.QuestionImage.size < 20000000)
            {
                var QuestionImagePath = files.QuestionImage.path.split('QUESTIONS_IMAGES')[1].replace(/\\/g, '');
                
                if (files.QuestionImage.type == 'image/png' || files.QuestionImage.type == 'image/jpeg' || files.QuestionImage.type == 'image/gif' || files.QuestionImage.type == 'image/svg')
                {
                    Question.create({
                        QuestionText,
                        QuestionCost,
                        QuestionImagePath: QuestionImagePath,
                        Category_Id
                    })
                    .then((question) => {
                        var returnData = question.get({
                            plain: true
                        });
                        if (returnData)
                            {
                                returnData.QuestionImage = req.protocol + '://' + req.hostname + '/QuestionImage?QuestionId=' + returnData.QuestionId;
                                res.end(JSON.stringify(returnData));
                            }
                        else
                            res.end('null');
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
                Question.create({
                    QuestionText,
                    QuestionCost,
                    Category_Id
                })
                .then((question) => {
                    var returnData = question.get({
                        plain: true
                    });
                    if (returnData)
                        {
                            res.end(JSON.stringify(returnData));
                        }
                    else
                        res.end('null');
                })
                .catch(err => res.end(JSON.stringify(err)));
            }
      });
});

router.post('/CreateAnswer', urlencodedParser, function(req, res) {
    var QuestionId = req.body.QuestionId;
    Answer.create({AnswerText: '', Correct: true, Question_Id: QuestionId})
    .then(answer =>{
        res.end(JSON.stringify(answer));
    })
    .catch(err => res.end(JSON.stringify(err)))
});

router.post('/UpdateAnswer', urlencodedParser, async function(req, res) {
    if (req.body.data)
    {
        try {
            var updateFields = JSON.parse(req.body.data);
            if (updateFields.length > 0)
            {
                var flag = true;
                for (var field of updateFields)
                {
                    await Answer.findOne({where: {AnswerId: field.AnswerId}})
                    .then(answer =>
                        {
                            answer.update(
                            {
                                AnswerText: field.AnswerText,
                                Correct: field.AnswerCorrect
                            })
                        })
                    .catch(err => res.end(JSON.stringify(err)));
                }
                if (flag == true)
                    res.end('true');
                else
                    res.end('false');
            }
            else
                res.end('true');
        } catch (err) {
            res.end(JSON.stringify(err));
        }
    }
    else
        res.end('false');
});

router.post('/RemoveAnswer', urlencodedParser,  function(req, res) {
    if (req.body.AnswerId)
        Answer.destroy({where: {AnswerId: req.body.AnswerId}})
        .then(answer =>
            {
                res.end(answer ? 'true' : 'false');
            })
        .catch(err => res.end(JSON.stringify(err)))
    else
        res.end('false');
});

router.post('/RemoveQuestion', urlencodedParser,  function(req, res) {
    if (req.body.QuestionId)
    {
        Answer.destroy({where: {Question_Id: req.body.QuestionId}})
        .then(answer =>
            {
                Question.RemoveQuestionImage(req.body.QuestionId, function(result) {
                    Question.destroy({raw: true, where: {QuestionId: req.body.QuestionId}})
                    .then(question =>
                        {
                            res.end(question ? 'true' : 'false')
                        })
                    .catch(err => res.end(JSON.stringify(err)))
                });
            })
        .catch(err => res.end(JSON.stringify(err)))
    }
    else
        res.end('false');
});

router.post('/RemoveCategory', urlencodedParser,  function(req, res) {
    if (req.body.CategoryId)
    {
        Question.findAll({raw: true, where: {Category_Id: req.body.CategoryId}})
        .then(async questions =>  {
            for (var question of questions)
            {
                await Question.RemoveQuestionImage(question.QuestionId, function(result) {});
                await Answer.destroy({where: {Question_Id: question.QuestionId}})
                .then()
                .catch(err => res.end(JSON.stringify(err)))
            }

            Question.destroy({raw: true, where: {Category_Id: req.body.CategoryId}})
            .then(question =>
                {
                    Category.destroy({where:{CategoryId: req.body.CategoryId}})
                    .then(category => res.end(category ? 'true' : 'false'))
                    .catch(err => res.end(JSON.stringify(err)))
                })
            .catch(err => res.end(JSON.stringify(err)))
        })
        .catch(err => res.end(JSON.stringify(err)))
    }
    else
        res.end('false');
});

router.post('/UpdateCategory', urlencodedParser, function(req, res) {
    if (req.body)
    {
        if (req.body.CategoryId && req.body.CategoryName)
            Category.findOne({where: {CategoryId: req.body.CategoryId}})
            .then(category =>
                {
                    category.update({CategoryName: req.body.CategoryName})
                    .then(updated => {
                        res.end(updated ? 'true' : 'false');
                    })
                })
            .catch(err => res.end(JSON.stringify(err)))
        else
                res.end('null');
    }
    else
        res.end('null');
});

router.post('/UpdateQuestion', urlencodedParser, function(req, res) {
    var form = formidable.IncomingForm();
    form.uploadDir = './IMAGES/QUESTIONS_IMAGES';
    form.parse(req, function(err, fields, files) {
        let {QuestionId, QuestionText, QuestionCost} = fields;
        if (files.QuestionImage)
        {
            if (files.QuestionImage.size < 20000000)
            {
                var QuestionImagePath = files.QuestionImage.path.split('QUESTIONS_IMAGES')[1].replace(/\\/g, '');
                
                if (files.QuestionImage.type == 'image/png' || files.QuestionImage.type == 'image/jpeg' || files.QuestionImage.type == 'image/gif' || files.QuestionImage.type == 'image/svg')
                {
                    Question.findOne({where: {QuestionId: QuestionId}})
                    .then(question =>
                        {
                            Question.RemoveQuestionImage(QuestionId, function(result) {
                                question.update({QuestionText: QuestionText, QuestionCost: QuestionCost, QuestionImagePath: QuestionImagePath})
                                .then(updated => {
                                    res.end(updated ? 'true' : 'false');
                                })
                            });
                        })
                    .catch(err => res.end(JSON.stringify(err)))
                }
                else
                    res.end('incorrect_format');
            }
            else
                res.end('incorrect_size');
        }
        else
            {
                Question.findOne({where: {QuestionId: QuestionId}})
                .then(question =>
                    {
                        question.update({QuestionText: QuestionText, QuestionCost: QuestionCost})
                        .then(updated => {
                            res.end(updated ? 'true' : 'false');
                        })
                    })
                .catch(err => res.end(JSON.stringify(err)))
            }
      });
});

module.exports = router;