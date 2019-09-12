const express = require('express')
const router = express.Router()
const passport = require('passport')
const Team = require('../models/Team')
const Admin = require('../models/Admin')
const Player = require('../models/Player')
const Game = require('../models/Game')
const GameTeam = require('../models/GameTeam')
const Category = require('../models/Category');
const Question = require('../models/Question');
const Answer = require('../models/Answer');

const app = require('../config/server-config')

var bodyParser = require('body-parser')
var urlencodedParser = bodyParser.urlencoded({extended: false})

const io = require('./sockets')

module.exports = {
    express,
    router,
    passport,
    Team,
    Admin,
    Player,
    Game,
    GameTeam,
    app,
    bodyParser,
    urlencodedParser,
    io,
    Category,
    Question,
    Answer
}