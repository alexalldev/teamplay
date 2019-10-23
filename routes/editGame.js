const {
  router,
  Game,
  app,
  urlencodedParser,
  Category,
  Question,
  Answer
} = require("../config/routers-config");

const formidable = require("formidable");

router.get("/EditGame/:GameTag", app.protect, function(req, res) {
  Game.findOne({
    where: {
      GameTag: req.params.GameTag,
      QuizCreatorId: req.session.passport.user
    }
  })
    .then(game => {
      if (game != null) {
        req.session.Game = {
          Id: game.GameId,
          Tag: game.GameTag
        };
        res.render("editGame", { game: game });
      } else
        res.render("info", {
          message: `Игры ${req.params.GameTag} не существует или она была удалена.`
        });
    })
    .catch(err => console.log(err));
});

router.post("/SetGameTime", urlencodedParser, function(req, res) {
  if (req.body.time && req.body.type)
    if (req.body.time >= 5)
      Game.findOne({ where: { GameId: req.session.Game.Id } })
        .then(game => {
          if (req.body.type == 1)
            game
              .update({
                SelectionTime: req.body.time
              })
              .then(res.end("true"))
              .catch(err => res.end(JSON.stringify(err)));
          else if (req.body.type == 2)
            game
              .update({
                AnswerTime: req.body.time
              })
              .then(res.end("true"))
              .catch(err => res.end(JSON.stringify(err)));
        })
        .catch(err => console.log(err));
    else res.end("min_time");
  else res.end("err_attributes");
});

router.post("/CreateCategory", urlencodedParser, function(req, res) {
  if (req.body.CategoryName)
    Category.create({
      CategoryName: req.body.CategoryName,
      Game_Id: req.session.Game.Id
    })
      .then(category => res.end(JSON.stringify(category)))
      .catch(err => res.end(JSON.stringify(err)));
});

router.post("/Load", urlencodedParser, function(req, res) {
  const { LoadType } = req.body;
  const { CategoryId } = req.body;
  const { QuestionId } = req.body;
  if (LoadType) {
    if (LoadType == 1) {
      Category.findAll({ raw: true, where: { Game_Id: req.session.Game.Id } })
        .then(category => {
          if (category.length != 0) res.end(JSON.stringify(category));
          else res.end("null");
        })
        .catch(err => res.end(JSON.stringify(err)));
    } else if (LoadType == 2) {
      if (CategoryId)
        Question.findAll({ raw: true, where: { Category_Id: CategoryId } })
          .then(questions => {
            if (questions.length != 0) {
              for (const q in questions) {
                if (questions[q].QuestionImage != "")
                  questions[
                    q
                  ].QuestionImage = `${req.protocol}://${req.hostname}/QuestionImage?QuestionId=${questions[q].QuestionId}`;
                else questions[q].QuestionImage = "";
              }
              res.end(JSON.stringify(questions));
            } else res.end("null");
          })
          .catch(err => res.end(JSON.stringify(err)));
    } else if (LoadType == 3) {
      Answer.findAll({ raw: true, where: { Question_Id: QuestionId } })
        .then(answers => {
          res.end(JSON.stringify(answers));
        })
        .catch(err => res.end(JSON.stringify(err)));
    }
  } else res.end("null");
});

router.post("/CreateQuestion", urlencodedParser, function(req, res) {
  const form = formidable.IncomingForm();
  form.uploadDir = "./IMAGES/QUESTIONS_IMAGES";
  form.parse(req, function(err, fields, files) {
    if (err) return res.end(JSON.stringify(err));
    const { QuestionText, QuestionCost, Category_Id, AnswerTime } = fields;
    console.log({ fields });
    if (QuestionText && QuestionCost && Category_Id && AnswerTime)
      if (files.QuestionImage) {
        if (files.QuestionImage.size < 20000000) {
          const QuestionImagePath = files.QuestionImage.path
            .split("QUESTIONS_IMAGES")[1]
            .replace(/\\/g, "");
          console.log({ type: files.QuestionImage.type });
          if (
            files.QuestionImage.type == "image/png" ||
            files.QuestionImage.type == "image/jpeg" ||
            files.QuestionImage.type == "image/gif" ||
            files.QuestionImage.type == "image/svg"
          ) {
            Question.create({
              QuestionText,
              QuestionCost,
              AnswerTime,
              QuestionImagePath,
              Category_Id
            })
              .then(question => {
                const returnData = question.get({
                  plain: true
                });
                if (returnData) {
                  returnData.QuestionImage = `${req.protocol}://${req.hostname}/QuestionImage?QuestionId=${returnData.QuestionId}`;
                  console.log({ returnData });
                  res.end(JSON.stringify(returnData));
                } else res.end("null");
              })
              .catch(err => res.end(JSON.stringify(err)));
          } else res.end("incorrect_format");
        } else res.end("incorrect_size");
      } else {
        Question.create({
          QuestionText,
          QuestionCost,
          Category_Id
        })
          .then(question => {
            const returnData = question.get({
              plain: true
            });
            console.log({ returnData1: returnData });
            if (returnData) {
              res.end(JSON.stringify(returnData));
            } else res.end("null");
          })
          .catch(err => res.end(JSON.stringify(err)));
      }
    else res.end("false");
  });
});

router.post("/CreateAnswer", urlencodedParser, function(req, res) {
  const { QuestionId } = req.body;
  Answer.create({ AnswerText: "", Correct: true, Question_Id: QuestionId })
    .then(answer => {
      res.end(JSON.stringify(answer));
    })
    .catch(err => res.end(JSON.stringify(err)));
});

router.post("/UpdateAnswer", urlencodedParser, async function(req, res) {
  if (req.body.data) {
    try {
      const updateFields = JSON.parse(req.body.data);
      if (updateFields.length > 0) {
        const flag = true;
        for (var field of updateFields) {
          await Answer.findOne({ where: { AnswerId: field.AnswerId } })
            .then(answer => {
              answer.update({
                AnswerText: field.AnswerText,
                Correct: field.AnswerCorrect
              });
            })
            .catch(err => res.end(JSON.stringify(err)));
        }
        if (flag == true) res.end("true");
        else res.end("false");
      } else res.end("true");
    } catch (err) {
      res.end(JSON.stringify(err));
    }
  } else res.end("false");
});

router.post("/RemoveAnswer", urlencodedParser, function(req, res) {
  if (req.body.AnswerId)
    Answer.destroy({ where: { AnswerId: req.body.AnswerId } })
      .then(answer => {
        res.end(answer ? "true" : "false");
      })
      .catch(err => res.end(JSON.stringify(err)));
  else res.end("false");
});

router.post("/RemoveQuestion", urlencodedParser, function(req, res) {
  if (req.body.QuestionId) {
    Answer.destroy({ where: { Question_Id: req.body.QuestionId } })
      .then(() => {
        Question.RemoveQuestionImage(req.body.QuestionId, function() {
          Question.destroy({
            raw: true,
            where: { QuestionId: req.body.QuestionId }
          })
            .then(question => {
              res.end(question ? "true" : "false");
            })
            .catch(err => res.end(JSON.stringify(err)));
        });
      })
      .catch(err => res.end(JSON.stringify(err)));
  } else res.end("false");
});

router.post("/RemoveCategory", urlencodedParser, function(req, res) {
  if (req.body.CategoryId) {
    Question.findAll({ raw: true, where: { Category_Id: req.body.CategoryId } })
      .then(async questions => {
        for (const question of questions) {
          await Question.RemoveQuestionImage(
            question.QuestionId,
            function() {}
          );
          await Answer.destroy({ where: { Question_Id: question.QuestionId } })
            .then()
            .catch(err => res.end(JSON.stringify(err)));
        }

        Question.destroy({
          raw: true,
          where: { Category_Id: req.body.CategoryId }
        })
          .then(() => {
            Category.destroy({ where: { CategoryId: req.body.CategoryId } })
              .then(category => res.end(category ? "true" : "false"))
              .catch(err => res.end(JSON.stringify(err)));
          })
          .catch(err => res.end(JSON.stringify(err)));
      })
      .catch(err => res.end(JSON.stringify(err)));
  } else res.end("false");
});

router.post("/UpdateCategory", urlencodedParser, function(req, res) {
  if (req.body) {
    if (req.body.CategoryId && req.body.CategoryName)
      Category.findOne({ where: { CategoryId: req.body.CategoryId } })
        .then(category => {
          category
            .update({ CategoryName: req.body.CategoryName })
            .then(updated => {
              res.end(updated ? "true" : "false");
            });
        })
        .catch(err => res.end(JSON.stringify(err)));
    else res.end("null");
  } else res.end("null");
});

router.post("/UpdateQuestion", urlencodedParser, function(req, res) {
  const form = formidable.IncomingForm();
  form.uploadDir = "./IMAGES/QUESTIONS_IMAGES";
  form.parse(req, function(err, fields, files) {
    const { QuestionId, QuestionText, QuestionCost } = fields;
    if (files.QuestionImage) {
      if (files.QuestionImage.size < 20000000) {
        const QuestionImagePath = files.QuestionImage.path
          .split("QUESTIONS_IMAGES")[1]
          .replace(/\\/g, "");

        if (
          files.QuestionImage.type == "image/png" ||
          files.QuestionImage.type == "image/jpeg" ||
          files.QuestionImage.type == "image/gif" ||
          files.QuestionImage.type == "image/svg"
        ) {
          Question.findOne({ where: { QuestionId: QuestionId } })
            .then(question => {
              Question.RemoveQuestionImage(QuestionId, function() {
                question
                  .update({
                    QuestionText: QuestionText,
                    QuestionCost: QuestionCost,
                    QuestionImagePath: QuestionImagePath
                  })
                  .then(updated => {
                    res.end(updated ? "true" : "false");
                  });
              });
            })
            .catch(err => res.end(JSON.stringify(err)));
        } else res.end("incorrect_format");
      } else res.end("incorrect_size");
    } else {
      Question.findOne({ where: { QuestionId: QuestionId } })
        .then(question => {
          question
            .update({ QuestionText: QuestionText, QuestionCost: QuestionCost })
            .then(updated => {
              res.end(updated ? "true" : "false");
            });
        })
        .catch(err => res.end(JSON.stringify(err)));
    }
  });
});

router.post('/RemoveQuestionImage', function (req, res) {
  console.log(req.body);
  Question.findOne({ where: { QuestionId: req.body.questionId }, raw: true })
  .then(question => {
    Category.findOne({where: {CategoryId: question.Category_Id}, raw: true})
    .then(category => {
      Game.findOne({where: {QuizCreatorId: req.session.passport.user, GameId: category.Game_Id}, raw: true})
      .then(game => {
        if (game) {
          Question.RemoveQuestionImage(req.body.questionId, function() {
            res.end('true');
          });
        }
        else {
          res.end('false');
        }
      })
      .catch(err => res.end(JSON.stringify(err)));
    })
    .catch(err => res.end(JSON.stringify(err)));
  })
  .catch(err => res.end(JSON.stringify(err)));
})

module.exports = router;
