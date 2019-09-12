const Sequelize = require('sequelize');
const db = require('../config/database');

const GameTeam = db.define('game_team', {
    GameTeamId: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    Verified: {
        type: Sequelize.BOOLEAN
    },
    Play: {
        type: Sequelize.INTEGER
    },
    PlayId: {
        type: Sequelize.INTEGER
    },
    Points: {
        type: Sequelize.INTEGER
    },
    TempPoints: {
        type: Sequelize.INTEGER
    },
    Answered: {
        type: Sequelize.BOOLEAN
    },
    CanSelect: {
        type: Sequelize.BOOLEAN
    },
    CanAnswer: {
        type: Sequelize.BOOLEAN
    },
    Game_Id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        foreignKey : true
    },
    Team_Id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        foreignKey : true
    }
});

module.exports = GameTeam;