const Sequelize = require('sequelize');
const db = require('../config/database');

const User = db.define('user', {
    UserId: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    UserName: {
        type: Sequelize.STRING
    },
    UserFamily: {
        type: Sequelize.STRING
    },
    UserLastName: {
        type: Sequelize.STRING
    },
    UserPassword: {
        type: Sequelize.STRING
    },
    UserEmail: {
        type: Sequelize.STRING
    },
    UserRegistrationToken: {
        type: Sequelize.STRING
    },
    UserIsActive: {
        type: Sequelize.BOOLEAN
    }
});

module.exports = User;