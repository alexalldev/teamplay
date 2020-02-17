const UserResult = require("../../models/UserResult");
const GameResult = require("../../models/GameResult");
const TeamResult = require("../../models/TeamResult");
const UserResultQuestion = require("../../models/UserResultQuestion");
const GameResultQuestion = require("../../models/GameResultQuestion");
const GameResultAnswer = require("../../models/GameResultAnswer");
const User = require("../../models/User");
const timeConverter = require("../../modules/timeConverter");

module.exports = function(socket, io) {
  socket.on("GetStatData", async userId => {
    await User.findOne({ where: { UserId: userId }, raw: true }).then(
      async user => {
        GameResult.hasMany(TeamResult, { foreignKey: "GameResult_Id" });
        TeamResult.belongsTo(GameResult, {
          foreignKey: "GameResult_Id"
        });

        TeamResult.hasMany(UserResult, { foreignKey: "TeamResult_Id" });
        UserResult.belongsTo(TeamResult, { foreignKey: "TeamResult_Id" });

        UserResult.hasMany(UserResultQuestion, {
          foreignKey: "UserResult_Id"
        });
        UserResultQuestion.belongsTo(UserResult, {
          foreignKey: "UserResult_Id"
        });

        GameResultQuestion.hasMany(GameResultAnswer, {
          foreignKey: "GameResultQuestion_Id"
        });
        GameResultAnswer.belongsTo(GameResultQuestion, {
          foreignKey: "GameResultQuestion_Id"
        });
        UserResultQuestion.belongsTo(GameResultQuestion, {
          foreignKey: "GameResultQuestion_Id"
        });

        const gamesUserResults = await UserResult.findAll({
          where: { User_Id: user.UserId, isCreator: false },
          include: [{ model: TeamResult, include: GameResult }]
        }).map(gameUserResult => gameUserResult.get({ plain: true }));
        const minTimestamp = Math.min(
          ...gamesUserResults.map(
            gameUserResult => gameUserResult.team_result.game_result.Timestamp
          )
        );
        const datesGamesTeamResults = [];
        let c = 0;
        const date = new Date();
        const ONE_MONTH = 31 * 24 * 60 * 60 * 1000;
        let flag = true;
        while (flag) {
          const monthDate = new Date(date - ONE_MONTH * c);
          const firstDayMonth =
            new Date(
              Date.UTC(monthDate.getFullYear(), monthDate.getMonth(), 1)
            ).getTime() / 1000;
          const lastDayMonth =
            new Date(
              Date.UTC(monthDate.getFullYear(), monthDate.getMonth() + 1, 0)
            ).getTime() / 1000;
          const countMonthGames = gamesUserResults.filter(
            gameUserResult =>
              gameUserResult.team_result.game_result.Timestamp >=
                firstDayMonth &&
              gameUserResult.team_result.game_result.Timestamp <= lastDayMonth
          ).length;
          if (lastDayMonth > minTimestamp) {
            if (countMonthGames > 0)
              datesGamesTeamResults.push({
                date: firstDayMonth,
                number: countMonthGames
              });
          } else flag = false;
          c++;
        }
        socket.emit(
          "SendStatData",
          datesGamesTeamResults
            .sort((a, b) => a.date - b.date)
            .map(dateGameTeamResult => {
              return {
                date: timeConverter(dateGameTeamResult.date),
                number: dateGameTeamResult.number
              };
            })
        );
      }
    );
  });

  socket.on("GetUserResults", async userId => {
    await User.findOne({
      where: { UserId: userId },
      raw: true
    }).then(async user => {
      GameResult.hasMany(TeamResult, { foreignKey: "GameResult_Id" });
      TeamResult.belongsTo(GameResult, {
        foreignKey: "GameResult_Id"
      });

      TeamResult.hasMany(UserResult, { foreignKey: "TeamResult_Id" });
      UserResult.belongsTo(TeamResult, { foreignKey: "TeamResult_Id" });

      UserResult.hasMany(UserResultQuestion, {
        foreignKey: "UserResult_Id"
      });
      UserResultQuestion.belongsTo(UserResult, {
        foreignKey: "UserResult_Id"
      });

      GameResultQuestion.hasMany(GameResultAnswer, {
        foreignKey: "GameResultQuestion_Id"
      });
      GameResultAnswer.belongsTo(GameResultQuestion, {
        foreignKey: "GameResultQuestion_Id"
      });
      UserResultQuestion.belongsTo(GameResultQuestion, {
        foreignKey: "GameResultQuestion_Id"
      });

      const usersTeamsGamesResults = await UserResult.findAll({
        where: {
          User_Id: user.UserId,
          isCreator: false
        },
        include: [
          { model: TeamResult, include: [GameResult] },
          {
            model: UserResultQuestion,
            include: [{ model: GameResultQuestion, include: GameResultAnswer }]
          }
        ],
        order: [
          ["Timestamp", "ASC"],
          [UserResultQuestion, "isAnsweredCorrectly", "ASC"]
        ]
      })
        .catch(err => console.log(err))
        .map(userGameResult => {
          const { hours, minutes, month, year, dayOfMonth } = timeConverter(
            userGameResult.Timestamp
          );
          return {
            GameName: userGameResult.team_result.game_result.GameName,
            Timestamp: `${hours}:${minutes} ${month + 1}/${dayOfMonth}/${year}`,
            questions: userGameResult.user_results_questions.map(
              userResultQuestion => {
                return {
                  questionText:
                    userResultQuestion.game_result_question
                      .GameResultQuestionText,
                  isAnsweredCorrectly: userResultQuestion.isAnsweredCorrectly,
                  answers: userResultQuestion.game_result_question.game_result_answers.map(
                    answer => {
                      return {
                        answerText: answer.GameResultAnswerText,
                        isCorrect: answer.isCorrect
                      };
                    }
                  )
                };
              }
            )
          };
        });
      socket.emit("SendUserResults", usersTeamsGamesResults);
    });
  });
};
