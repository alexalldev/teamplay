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
module.exports.Remove = async function(session) {
  await Room.findOne({ where: { RoomId: session.roomId } })
    .then(async room => {
      await GamePlay.findOne({
        where: { Game_Id: room.Game_Id, Room_Id: room.RoomId }
      })
        .then(async gamePlay => {
          if (gamePlay) {
            await GamePlayCategory.findAll({
              where: { GamePlay_Id: gamePlay.dataValues.GamePlayId }
            })
              .then(async gamePlayCategories => {
                if (gamePlayCategories.length > 0)
                  for await (const gamePlayCategory of gamePlayCategories) {
                    await GamePlayQuestion.destroy({
                      where: {
                        GamePlayCategory_Id:
                          gamePlayCategory.dataValues.GamePlayCategoryId
                      }
                    });
                    await gamePlayCategory.destroy();
                  }
              })
              .catch(err => console.log(err));
            await GamePlay.RemoveStreamImage(
              gamePlay.dataValues.GamePlayId,
              function() {}
            );
            await gamePlay.destroy();
          }
        })
        .catch(err => console.log(err));
    })
    .catch(err => console.log(err));
};

module.exports.Create = async function(session) {
  /*                          GamePlay Structure                      */
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
              await Category.findAll({
                raw: true,
                where: { Game_Id: game.GameId }
              })
                .then(async categories => {
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
};

function getUnixTime() {
  return Math.floor(new Date() / 1000);
}
