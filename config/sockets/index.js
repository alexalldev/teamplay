const app = require('../server-config');
const socketIo = require('socket.io')
const http = require('http')
const server = http.createServer(app)
const io = socketIo(server)

const Game = require('../../models/Game');
const Team = require('../../models/Team');
const Player = require('../../models/Player');
const GameTeam = require('../../models/GameTeam');
const Category = require('../../models/Category');
const Question = require('../../models/Question');
const Answer = require('../../models/Answer');


function ClientsStore() {
    var Admins = []
    var Teams = []

    this.pushAdmin = async function(Admin) {
        for (const A in Admins)
        {
            if (Admins[A].Id == Admin.Id)
                Admins.splice(A, 1);
        }
        Admins.push(Admin);
    };

    this.pushTeam = async function(Team) {
        for (const T in Teams)
        {
            if (Teams[T].Id == Team.Id)
            Teams.splice(T, 1);
        }
        Teams.push(Team);
    };

    this.removeById = async function(socketId) {
      for (const T in Teams)
      {
          if (Teams[T].SocketId == socketId)
            Teams.splice(T, 1);
      }
      for (const A in Admins)
      {
          if (Admins[A].SocketId == socketId)
              Admins.splice(A, 1);
      }
  };

    this.clients = function() {
        return {Admins, Teams}
    }

    this.admins = function() {
        return Admins;
    }

    this.teams = function() {
        return Teams;
    }

    this.teamById = function(teamId) {
      for (const team of Teams)
      {
        if (team.Id == teamId)
          return team;
      }
      return null;
    }

    this.adminById = function(adminId) {
      for (const admin of Admins)
      {
        if (admin.Id == adminId)
          return admin;
      }
      return null;
    }
};

io.emitTeam = function(teamId, eventName, data) {
  var team = io.ClientsStore.teamById(teamId);
  if (team != null)
    try {
      if (io.sockets.connected[team.SocketId])
        io.sockets.connected[team.SocketId].emit(eventName, data);
    } catch (err) {
      console.log(err);
    }
}

io.emitAdmin = function(adminId, eventName, data) {
  var admin = io.ClientsStore.adminById(adminId);
  if (admin != null)
    try {
      if (io.sockets.connected[admin.SocketId])
        io.sockets.connected[admin.SocketId].emit(eventName, data);
    } catch (err) {
      console.log(err);
    }
}

io.ClientsStore = new ClientsStore();

io.on('connection', function (socket) {
    /******************Добавление Id пользователя из базы данных в ClientsStore******************/

    const session = socket.request.session; //Сессия пользователя

    //Вход в ClientStore
    if (socket.LoggedAdmin)
      io.ClientsStore.pushAdmin({
          Id: socket.LoggedAdmin ? session.passport.user : '',
          SocketId: socket.id
    });
    else if (session.Team)
      if (session.Game)
        io.ClientsStore.pushTeam({
            Id: session.Game.GameTeamId ? session.Game.GameTeamId : '',
            SocketId: socket.id
        });
    //Подключение к комнате в зависимости от типа пользователя
    if (session.Team)
    {
      if (session.Game)
        socket.join('Teams' + session.Game.Id);
      socket.join('Teams');
    }
    else if (socket.LoggedAdmin)
    {
      if (session.Game)
        socket.join('Admins' + session.Game.Id);
      socket.join('Admins');
    }

    if (session.Stream)
    {
      socket.join('Stream' + session.Stream.GameId);
    }

  /*****************ControlPanel************** */

  //Запрос на добавление новой игры с указанным именем
  socket.on('AddGame', function (data) {
    if (socket.LoggedAdmin)
    {
      GameTag = data.GameName.replace(/[^a-zA-Zа-яА-Я ]/g, '').toLowerCase().replace(/\s/g, '-');
      if (GameTag.charAt(GameTag.length - 1) == '-') {
        GameTag = GameTag.substr(0, GameTag.length - 1);
      }
        Game.findOrCreate({where: {GameName: data.GameName, GameTag: GameTag} })
        .then(([game, created]) => {
          if (created == true)
          socket.emit("GameAdded", game.get()) //Вернуть добавленную в базу Game
          else
          socket.emit("GameExists") //Игра существует
        })
        .catch(err => console.log(err));
    }
  });
  //запрос на получение всех игр
  socket.on('LoadGames', function () {
    Game.findAll({raw: true})
    .then(games => {
      if (games.length > 0)
        socket.emit("ReciveGames", games); //Вернуть все игры
    })
    .catch(err => console.log(err));
  });

  //запрос на удаление игры
  socket.on('RemoveGame', function (GameId) {
    if (socket.LoggedAdmin)
    {
      var categoriesIds = [];
      Category.findAll({raw: true, where: {Game_Id: GameId}})
      .then(categories => {
        for(var category of categories)
        {
          categoriesIds.push(category.CategoryId);
        }

        for (let c = 0; c < categoriesIds.length; c++) {
          Question.findAll({raw: true, where: {Category_Id: categoriesIds[c]}})
          .then(async questions => {
            for (var question of questions)
            {
              await Question.RemoveQuestionImage(question.QuestionId, function(result) {});
              await Answer.destroy({where: {Question_Id: question.QuestionId}})
              .then()
              .catch(err => console.log(err));
            }

            Question.destroy({where: {Category_Id: categoriesIds[c]}})
            .then(questionRemoved => {
              
            })
            .catch(err => console.log(err));
          })
          .catch(err => console.log(err));
        }

        Category.destroy({where: {Game_Id: GameId}})
        .then(categoryRemoved => {
            GameTeam.destroy({where: {Game_Id: GameId}})
            .then(gameTeamRemoved => {
                Game.destroy({where: {GameId: GameId}})
                  .then(gameRemoved => {
                    socket.emit("GameRemoved", GameId); //Игра удалена
                  })
                  .catch(err => console.log(err));
            })
            .catch(err => console.log(err));
        })
        .catch(err => console.log(err));

        

      })
      .catch(err => console.log(err))
    }
  });

  /*****************ControlGame************** */

  //Запрос на получение всех команд и их игроков
  socket.on('LoadTeams', function() {
    if (socket.HasControlGame)
    {
      Team.hasMany(GameTeam, {foreignKey: "Team_Id"});
      GameTeam.belongsTo(Team, {foreignKey: "Team_Id"});

      GameTeam.findAll({
        raw: true,
        order: [['Points', 'DESC']],
        where: {Game_Id: session.Game.Id},
        include: [Team]
      })
      .then(gameTeams => {
        AddTeamsPlayers(gameTeams, function(fullTeams) {
          for (var gameTeam of gameTeams)
          {
            if (gameTeam.Play == 1)
              return socket.emit('ReciveTeams', fullTeams, 1);
            if (gameTeam.Play == 2)
              return socket.emit('ReciveTeams', fullTeams, 2);
          }
          return socket.emit('ReciveTeams', fullTeams, false);
        });
      })
      .catch(err => console.log(err));
    }
  });

  socket.on('ToggleVerifyTeam', function(gameTeamId, state) { //Переключить верификацию команды
    if (socket.HasControlGame)
    {
      state = state == 'true' ? false : true
      GameTeam.findOne({where: {GameTeamId: gameTeamId}})
      .then(gameTeam => {
        if (gameTeam != null)
          gameTeam.update({
            Verified: state
          })
          .then(() => {
            io.emitTeam(gameTeam.GameTeamId, "VerifiedToggle", state);
          })
      })
      .catch(err => console.log(err));
    }
  });

  socket.on('GetVerification', function() { //Запрос на получения состояния верификации команды
    if (session.Team && session.Game)
    {
      GameTeam.findOne({raw: true, where: {GameTeamId: session.Game.GameTeamId}})
      .then(gameTeam => {
        socket.emit("ReciveVerification", gameTeam.Verified);
      })
      .catch(err => console.log(err));
    }
  });

  socket.on('KickTeam', function(gameTeamId) { //Исключить команду
    if (socket.HasControlGame)
    {
      GameTeam.findOne({raw: true, where: {GameTeamId: gameTeamId}})
      .then(gameTeam => {
        GameTeam.destroy({where: {GameTeamId: gameTeamId}})
        .then(() =>
        {
          io.emitTeam(gameTeam.GameTeamId, "Kick", "ADMIN_KICK");
        })
        .catch(err => console.log(err))
        })
      .catch(err => console.log(err))
    }
  });

  socket.on('BroadcastTeams', function(message) { //Вещание из ControlPanel
    if (socket.HasControlGame)
      io.to('Teams' + session.Game.Id).emit("Broadcast", message);
  });

  socket.on('disconnect', function(reason) {
    io.ClientsStore.removeById(socket.id);
  });

  /********************GamePlay******************/
  require('./GamePlaySockets')(socket, io);

  /********************Stream******************/
  require('./StreamSockets')(socket, io);
})

 async function AddTeamsPlayers(teams, callback) {
    for (const T in teams)
    {
        teams[T].TeamId = teams[T]['team.TeamId']; delete teams[T]['team.TeamId'];
        teams[T].TeamName = teams[T]['team.TeamName']; delete teams[T]['team.TeamName'];
        teams[T].GroupName = teams[T]['team.GroupName']; delete teams[T]['team.GroupName'];
        teams[T].Email = teams[T]['team.Email']; delete teams[T]['team.Email'];

        await Player.findAll({raw: true, where: {Team_Id: teams[T].Team_Id}})
        .then(teamPlayers => {
        teams[T].players = teamPlayers;
        })
        .catch(err => console.log(err))
    }
    callback(teams);
}

server.listen(80);

module.exports = io;