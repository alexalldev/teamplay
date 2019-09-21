const Sequelize = require('sequelize');
const db = require('../config/database');
const Player = require('./Player');

var Team = db.define('team', {
    TeamId: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    TeamName: {
        type: Sequelize.STRING
    }
});

Team.AddTeamPlayers = function (team, callback) {
    Player.findAll({raw: true, where: {Team_Id: team.TeamId}})
    .then(teamPlayers => {
        team.players = teamPlayers;
        callback(team);
    })
    .catch(err => console.log(err))
}

module.exports = Team;