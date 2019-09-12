const Sequelize = require('sequelize');
const db = require('../config/database');
var Hash = require('password-hash');

const Admin = db.define('admin', {
    AdminId: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    AdminName: {
        type: Sequelize.STRING
    },
    AdminFamily: {
        type: Sequelize.STRING
    },
    AdminLastName: {
        type: Sequelize.STRING
    },
    AdminPassword: {
        type: Sequelize.STRING
    }
});

module.exports = Admin;