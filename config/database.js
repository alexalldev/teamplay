const Sequelize = require("sequelize");

module.exports = new Sequelize("alexallr_I_WILL_DELETE_IT_THANKS=)", "alexallr_teamplay_temp", "LC4l7[sgWbQL", {
  host: "mvp.teamplay.space",
  dialect: "mysql",
  logging: false,
  define: {
    underscored: false,
    freezeTableName: false,
    charset: "utf8",
    dialectOptions: {
      collate: "utf8_general_ci"
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
