const Sequelize = require('sequelize');
module.exports = new Sequelize('alexallr_team_play_1', 'alexallr_team_play', 'teamplay_2019_TEAMPLAY', {
  host: 'localhost',
  dialect: 'mysql',
  logging: false,
  define: {
    underscored: false,
    freezeTableName: false,
    charset: 'utf8',
    dialectOptions: {
      collate: 'utf8_general_ci'
    },
    timestamps: false
  },
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
});
