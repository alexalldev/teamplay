const express = require('express');

const router = express.Router();
const passport = require('passport');
const bodyParser = require('body-parser');
const Team = require('../models/Team');
const Admin = require('../models/Admin');
const Player = require('../models/Player');
const Game = require('../models/Game');
const GameTeam = require('../models/GameTeam');
const Category = require('../models/Category');
const Question = require('../models/Question');
const Answer = require('../models/Answer');
const User = require('../models/User');
const Room = require('../models/Room');

const app = require('../config/server-config');

const urlencodedParser = bodyParser.urlencoded({ extended: false });

const io = require('./sockets');

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
  Answer,
  User,
  Room
};
