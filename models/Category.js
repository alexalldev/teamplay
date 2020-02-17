const Sequelize = require("sequelize");
const db = require("../config/database");

const Category = db.define("category", {
  CategoryId: {
    type: Sequelize.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  CategoryName: {
    type: Sequelize.STRING
  },
  Game_Id: {
    type: Sequelize.INTEGER,
    allowNull: false,
    foreignKey: true
  }
});

module.exports = Category;
