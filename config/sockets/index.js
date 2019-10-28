const socketIo = require("socket.io");
const http = require("http");
const app = require("../server-config");

const server = http.createServer(app);
const io = socketIo(server);

const Game = require("../../models/Game");
const Team = require("../../models/Team");
const Player = require("../../models/Player");
const GameTeam = require("../../models/GameTeam");
const Category = require("../../models/Category");
const Question = require("../../models/Question");
const Answer = require("../../models/Answer");
const Room = require("../../models/Room");
const User = require("../../models/User");

function ClientsStore() {
  const Creators = [];
  const Teams = [];
  const Users = [];

  this.pushCreator = async function(Creator) {
    for (const C in Creators) {
      if (Creators[C].Id == Creator.Id) {
        Creators.splice(C, 1);
      }
    }
    Creators.push(Creator);
  };

  this.pushTeam = function(Team) {
    for (const T in Teams) {
      if (Teams[T].Id == Team.Id) Teams.splice(T, 1);
    }
    Teams.push(Team);
  };

  this.pushUser = function(User) {
    for (const U in Users) {
      if (Users[U].Id == User.Id) Users.splice(U, 1);
    }
    Users.push(User);
  };

  this.removeById = function(socketId) {
    for (const T in Teams) {
      if (Teams[T].SocketId == socketId) Teams.splice(T, 1);
    }
    for (const C in Creators) {
      if (Creators[C].SocketId == socketId) Creators.splice(C, 1);
    }

    for (const U in Users) {
      if (Users[U].SocketId == socketId) Users.splice(U, 1);
    }
  };

  this.clients = function() {
    return { Creators, Teams, Users };
  };

  this.creators = function() {
    return Creators;
  };

  this.teams = function() {
    return Teams;
  };

  this.users = function() {
    return Users;
  };

  this.teamById = function(teamId) {
    for (const team of Teams) {
      if (team.Id == teamId) return team;
    }
    return null;
  };

  this.creatorById = function(creatorId) {
    for (const creator of Creators) {
      if (creator.Id == creatorId) return creator;
    }
    return null;
  };

  this.userById = function(userId) {
    for (const user of Users) {
      if (user.Id == userId) return user;
    }
    return null;
  };
}

io.emitTeam = function(teamId, eventName, data) {
  const team = io.ClientsStore.teamById(teamId);
  if (team != null)
    try {
      if (io.sockets.connected[team.SocketId]) io.sockets.connected[team.SocketId].emit(eventName, data);
    } catch (err) {
      console.log(err);
    }
};

io.emitUser = function(userId, eventName, data) {
  const user = io.ClientsStore.userById(userId);
  if (user != null)
    try {
      if (io.sockets.connected[user.SocketId]) io.sockets.connected[user.SocketId].emit(eventName, data);
    } catch (err) {
      console.log(err);
    }
  else return "there is no such user";
};

io.emitCreator = function(creatorId, eventName, data) {
  const creator = io.ClientsStore.creatorById(creatorId);
  if (creator != null)
    try {
      if (io.sockets.connected[creator.SocketId]) io.sockets.connected[creator.SocketId].emit(eventName, data);
    } catch (err) {
      console.log(err);
    }
};

io.ClientsStore = new ClientsStore();

io.on("connection", function(socket) {
  /** ****************Добавление Id пользователя из базы данных в ClientsStore***************** */

  const { session } = socket.request; // Сессия пользователя

  // Вход в ClientStore
  if (session.isRoomCreator)
    io.ClientsStore.pushCreator({
      Id: session.passport.user,
      SocketId: socket.id
    });
  else if (session.passport)
    if (session.passport.user)
      io.ClientsStore.pushUser({
        Id: session.passport.user,
        SocketId: socket.id
      });
  // Подключение к комнате в зависимости от типа пользователя
  if (session.roomId) {
    socket.join(`RoomUsers${session.roomId}`);
    if (session.isRoomCreator) {
      socket.join(`RoomCreators${session.roomId}`);
      io.to(`RoomUsers${session.roomId}`).emit("RecieveCreatorStatus", true);
    } else {
      socket.join(`RoomTeam${session.roomTeamId}`);
      if (session.isGroupCoach) socket.join(`RoomTeamCoaches${session.roomId}`);
      socket.join(`RoomPlayers${session.roomId}`);
    }
  }
  if (session.Stream) {
    socket.join(`Stream${session.Stream.GameId}`);
  }

  /** ***************ControlPanel************** */

  // Запрос на добавление новой игры с указанным именем
  socket.on("AddGame", function(data) {
    if (session.passport.user) {
      if (data.GameName.charAt(data.GameName.length - 1) == " ") data.GameName = data.GameName.substr(0, data.GameName.length - 1);
      GameTag = data.GameName.replace(/[^a-zA-Zа-яА-Я0-9 ]/g, "")
        .toLowerCase()
        .replace(/\s/g, "-");
      if (GameTag.charAt(GameTag.length - 1) == "-") {
        GameTag = GameTag.substr(0, GameTag.length - 1);
      }
      Game.findOrCreate({
        where: { GameTag, QuizCreatorId: session.passport.user },
        defaults: { GameName: data.GameName, SelectionTime: 0 }
      })
        .then(([game, created]) => {
          if (created == true) socket.emit("GameAdded", game.get());
          // Вернуть добавленную в базу Game
          else socket.emit("Info", "У вас уже есть игра с таким названием");
        })
        .catch(err => console.log(err));
    }
  });

  // запрос на получение всех игр
  socket.on("LoadGames", function() {
    Game.findAll({ raw: true })
      .then(games => {
        if (games.length > 0) socket.emit("ReciveGames", games); // Вернуть все игры
      })
      .catch(err => console.log(err));
  });

  // запрос на удаление игры
  socket.on("RemoveGame", function(GameId) {
    if (session.passport.user) {
      Game.findOne({
        where: { GameId, QuizCreatorId: session.passport.user },
        raw: true
      }).then(game => {
        if (game) {
          const categoriesIds = [];
          Room.destroy({ where: { Game_Id: GameId } }).catch(err => console.log(err));

          Category.findAll({ raw: true, where: { Game_Id: GameId } })
            .then(categories => {
              for (const category of categories) {
                categoriesIds.push(category.CategoryId);
              }

              for (let c = 0; c < categoriesIds.length; c++) {
                Question.findAll({
                  raw: true,
                  where: { Category_Id: categoriesIds[c] }
                })
                  .then(async questions => {
                    for (const question of questions) {
                      await Question.RemoveQuestionImage(question.QuestionId, function(result) {});
                      await Answer.destroy({
                        where: { Question_Id: question.QuestionId }
                      })
                        .then()
                        .catch(err => console.log(err));
                    }

                    Question.destroy({
                      where: { Category_Id: categoriesIds[c] }
                    })
                      .then(questionRemoved => {})
                      .catch(err => console.log(err));
                  })
                  .catch(err => console.log(err));
              }

              Category.destroy({ where: { Game_Id: GameId } })
                .then(categoryRemoved => {
                  GameTeam.destroy({ where: { Game_Id: GameId } })
                    .then(gameTeamRemoved => {
                      Game.destroy({ where: { GameId } })
                        .then(gameRemoved => {
                          socket.emit("GameRemoved", GameId); // Игра удалена
                        })
                        .catch(err => console.log(err));
                    })
                    .catch(err => console.log(err));
                })
                .catch(err => console.log(err));
            })
            .catch(err => console.log(err));
        }
      });
    }
  });

  /** ***************ControlGame************** */

  // Запрос на получение всех команд и их игроков
  socket.on("LoadTeams", function() {
    if (socket.HasControlGame) {
      Team.hasMany(GameTeam, { foreignKey: "Team_Id" });
      GameTeam.belongsTo(Team, { foreignKey: "Team_Id" });

      GameTeam.findAll({
        raw: true,
        order: [["Points", "DESC"]],
        where: { Game_Id: session.Game.Id },
        include: [Team]
      })
        .then(gameTeams => {
          AddTeamsPlayers(gameTeams, function(fullTeams) {
            for (const gameTeam of gameTeams) {
              if (gameTeam.Play == 1) return socket.emit("ReciveTeams", fullTeams, 1);
              if (gameTeam.Play == 2) return socket.emit("ReciveTeams", fullTeams, 2);
            }
            return socket.emit("ReciveTeams", fullTeams, false);
          });
        })
        .catch(err => console.log(err));
    }
  });

  socket.on("ToggleVerifyTeam", function(gameTeamId, state) {
    // Переключить верификацию команды
    if (socket.HasControlGame) {
      state = state != "true";
      GameTeam.findOne({ where: { GameTeamId: gameTeamId } })
        .then(gameTeam => {
          if (gameTeam != null)
            gameTeam
              .update({
                Verified: state
              })
              .then(() => {
                io.emitTeam(gameTeam.GameTeamId, "VerifiedToggle", state);
              });
        })
        .catch(err => console.log(err));
    }
  });

  socket.on("GetVerification", function() {
    // Запрос на получения состояния верификации команды
    if (session.Team && session.Game) {
      GameTeam.findOne({
        raw: true,
        where: { GameTeamId: session.Game.GameTeamId }
      })
        .then(gameTeam => {
          socket.emit("ReciveVerification", gameTeam.Verified);
        })
        .catch(err => console.log(err));
    }
  });

  socket.on("KickTeam", function(gameTeamId) {
    // Исключить команду
    if (socket.HasControlGame) {
      GameTeam.findOne({ raw: true, where: { GameTeamId: gameTeamId } })
        .then(gameTeam => {
          GameTeam.destroy({ where: { GameTeamId: gameTeamId } })
            .then(() => {
              io.emitTeam(gameTeam.GameTeamId, "Kick", "ADMIN_KICK");
            })
            .catch(err => console.log(err));
        })
        .catch(err => console.log(err));
    }
  });

  socket.on("BroadcastTeams", function(message) {
    // Вещание из ControlPanel
    if (socket.HasControlGame) io.to(`Teams${session.Game.Id}`).emit("Broadcast", message);
  });

  socket.on("disconnect", function(reason) {
    if (session.isRoomCreator) io.to(`RoomUsers${session.roomId}`).emit("RecieveCreatorStatus", false);
    io.ClientsStore.removeById(socket.id);
  });

  /** ******************GamePlay***************** */
  // require('./GamePlaySockets')(socket, io);

  /** ******************NewGamePlayGeneration***************** */
  require("./NewGamePlayGeneration")(socket, io);

  /** ******************TeamSockets***************** */
  require("./TeamSockets")(socket, io);

  /** ******************Stream***************** */

  /** ******************Rooms***************** */
  require("./rooms")(socket, io);
});

async function AddTeamsPlayers(teams, callback) {
  for (const T in teams) {
    teams[T].TeamId = teams[T]["team.TeamId"];
    delete teams[T]["team.TeamId"];
    teams[T].TeamName = teams[T]["team.TeamName"];
    delete teams[T]["team.TeamName"];
    teams[T].GroupName = teams[T]["team.GroupName"];
    delete teams[T]["team.GroupName"];
    teams[T].Email = teams[T]["team.Email"];
    delete teams[T]["team.Email"];

    await Player.findAll({ raw: true, where: { Team_Id: teams[T].Team_Id } })
      .then(teamPlayers => {
        teams[T].players = teamPlayers;
      })
      .catch(err => console.log(err));
  }
  callback(teams);
}

server.listen(80);

module.exports = io;
