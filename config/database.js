const Sequelize = require("sequelize");
module.exports = new Sequelize(
  process.env.DATABASE_NAME,
  process.env.DATABASE_USER_NAME,
  process.env.DATABASE_USER_PASSWORD,
  {
    host: "localhost",
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
  }
);
