const Sequelize = require("sequelize");
const db = require("../config/database");

const fs = require("fs");

const GamePlay = db.define("game_play", {
  GamePlayId: {
    type: Sequelize.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  CurrentQuestionId: {
    type: Sequelize.INTEGER
  },
  isAnsweredCorrectly: {
    type: Sequelize.BOOLEAN,
    defaultValue: false
  },
  isAnsweringTime: {
    type: Sequelize.BOOLEAN,
    defaultValue: false
  },
  StartTime: {
    type: Sequelize.INTEGER
  },
  StopTime: {
    type: Sequelize.INTEGER
  },
  Game_Id: {
    type: Sequelize.INTEGER,
    foreignKey: true
  },
  Room_Id: {
    type: Sequelize.INTEGER,
    foreignKey: true
  }
});

GamePlay.RemoveStreamImage = function(gamePlayId, callback) {
  GamePlay.findOne({ where: { GamePlayId: gamePlayId } })
    .then(gamePlay => {
      if (gamePlay)
        fs.unlink(
          __dirname + "/../IMAGES/STREAM_IMAGES/" + gamePlay.StreamImagePath,
          function(err) {
            if (err) callback(err);
            else callback(true);
          }
        );
    })
    .catch(err => console.log(err));
};

module.exports = GamePlay;
