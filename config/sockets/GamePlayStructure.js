const Category = require("../../models/Category");
const Question = require("../../models/Question");
const Room = require("../../models/Room");
const Game = require("../../models/Game");
const GamePlay = require("../../models/GamePlay");
const GamePlayCategory = require("../../models/GamePlayCategory");
const GamePlayQuestion = require("../../models/GamePlayQuestion");
// TODO: будет удалять каждый игрок, хотя можно сделать, чтобы удалял запрос только коуча, если коуч вышел, то следующего игрока в команде,
// пока таковой не будет найден.
// TODO: подумать чтобы сделать его более ассинхронным, вместо for or -> promise.all

module.exports.Create = async function(session) {
  /*                          GamePlay Structure                      */
  let gamePlayResult;
  await Room.findOne({ where: { RoomId: session.roomId } }).then(async room => {
    await Game.findOne({ raw: true, where: { GameId: room.Game_Id } })
      .then(async game => {
        if (game)
          await GamePlay.findOrCreate({
            raw: true,
            where: { Game_Id: game.GameId, Room_Id: room.RoomId },
            defaults: {
              GamePlayId: 0,
              CurrentQuestionId: 0,
              StartTime: getUnixTime(),
              StopTime: 0,
              Room_Id: room.RoomId
            }
          })
            .then(async ([gamePlay, created]) => {
              gamePlayResult.gamePlay = gamePlay;
              await Category.findAll({
                raw: true,
                where: { Game_Id: game.GameId }
              })
                .then(async categories => {
                  gamePlayResult.categories = categories;
                  gamePlayResult.questionsCategories = [];
                  if (categories.length > 0)
                    for await (const C of categories) {
                      await GamePlayCategory.findOrCreate({
                        raw: true,
                        where: {
                          Category_Id: C.CategoryId,
                          GamePlay_Id: gamePlay.GamePlayId
                        }
                      })
                        .then(async ([gamePlayCategory, created]) => {
                          await Question.findAll({
                            raw: true,
                            where: { Category_Id: C.CategoryId }
                          })
                            .then(async questions => {
                              gamePlayResult.questionsCategories.push({
                                questions,
                                categoryId: C.CategoryId
                              });
                              for await (const Q of questions) {
                                await GamePlayQuestion.findOrCreate({
                                  raw: true,
                                  where: {
                                    Question_Id: Q.QuestionId,
                                    GamePlayCategory_Id:
                                      gamePlayCategory.GamePlayCategoryId
                                  }
                                }).catch(err => console.log(err));
                              }
                            })
                            .catch(err => console.log(err));
                        })
                        .catch(err => console.log(err));
                    }
                })
                .catch(err => console.log(err));
            })
            .catch(err => console.log(err));
      })
      .catch(err => console.log(err));
  });
  return createdGamePlay;
};

function getUnixTime() {
  return Math.floor(new Date() / 1000);
}
