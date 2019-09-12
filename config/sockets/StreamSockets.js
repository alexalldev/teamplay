const Game = require('../../models/Game');
const Team = require('../../models/Team');
const Player = require('../../models/Player');
const GameTeam = require('../../models/GameTeam');
const Category = require('../../models/Category');
const Question = require('../../models/Question');
const Answer = require('../../models/Answer');

const GamePlay = require('../../models/GamePlay');
const GamePlayCategory = require('../../models/GamePlayCategory');
const GamePlayQuestion = require('../../models/GamePlayQuestion');

function StreamSockets(socket, io) {
    const session = socket.request.session; //Сессия пользователя

    socket.on('Update', function() { //Зритель запрашивает данные о игре
        if (session.Stream)
        {
            GamePlay.findOne({raw: true, where: {Game_Id: session.Stream.GameId}})
            .then(gamePlay => {
                if (!gamePlay.StreamState)
                {
                    var Teams = [];
                    GameTeam.findAll({raw: true, order: [['Points', 'DESC']], where: {Game_Id: session.Stream.GameId}})
                    .then(async gameTeams => {
                        if (gameTeams.length > 0)
                        {
                            for (var gameTeam of gameTeams)
                            {
                                await Team.findOne({raw: true, where: {TeamId: gameTeam.Team_Id}})
                                .then(team => {
                                    if (team)
                                        Teams.push({
                                            TeamName: team.TeamName,
                                            GameTeamId: gameTeam.GameTeamId,
                                            PlayId: gameTeam.PlayId,
                                            Points: gameTeam.Points,
                                        });
                            })
                            .catch(err => console.log(err));
                            }
                            await socket.emit('ReciveTeams', Teams);
                        }
                    })
                    .catch(err => console.log(err));
                }
                else
                {
                    Question.findOne({raw: true, where: {QuestionId: gamePlay.CurrentQuestionId}})
                    .then(question => {
                        if (question)
                        {
                            io.to('Stream' + session.Game.Id).emit('ReciveQuestion', question);
                        }
                    })
                    .catch(err => console.log(err));
                }
            })
            .catch(err => console.log(err));
        }
    });
}

module.exports = StreamSockets;