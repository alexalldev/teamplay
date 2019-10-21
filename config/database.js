const Sequelize = require('sequelize');
module.exports = new Sequelize('alexallr_teamplay_temp', 'alexallr_teamplay_temp', '-6vJ8r3?xf^f', {
  host: 'alexall.dev',
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
})
