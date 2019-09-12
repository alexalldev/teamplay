function SelectionTimer(gameId, callback, io) {

    if (!io)
        console.error('Selection_Timer_ERROR: io is undefined');
    var GameTeams = [];
    var currentGameTeamIndex = 0;
    var currentGameTeam = null;
    Game.findOne({raw: true, where: {GameId: gameId}})
    .then(game => {
        if (game)
        {
            var SelectionTime = game.SelectionTime * 1000;
            GameTeam.findAll({raw: true, order: [['PlayId', 'ASC']], where: {Game_Id: game.GameId}})
            .then(async gameTeams => {
                if (gameTeams.length > 0)
                {
                    for (var gameTeam of gameTeams)
                    {
                        GameTeams.push(gameTeam.GameTeamId);
                    }
                    await start(SelectionTime)
                }
            })
        }
    })
    .catch(err => console.log(err));

    var start = function(remaining) {
        ChangeGameTeamsState(gameId, '1', function(state) {
            if (state)
            {
                Tick(remaining);
                var Timer = setInterval(function() {
                    Tick(remaining);
                }, remaining);
                callback({
                    GameId: gameId,
                    Stop: function() {
                        console.log('Stop');

                        ChangeGameTeamsState(gameId, '2', function(state) {
                            if (state)
                            clearInterval(Timer);
                        }, io); //Меняем состояние команд на ответ
                    },
                    Start: function() {
                        console.log('Start');

                        ChangeGameTeamsState(gameId, '1', function(state) { //Меняем состояние команд на выбор вопроса
                            if (state)
                            {
                                Tick(remaining);
                                Timer = setInterval(function() {
                                    Tick(remaining);
                                }, remaining);
                            }
                        }, io);
                    }
                });
            }
        }, io);
    };

    var Tick = async function(remaining)
    {
        //*****Команда прошлая */
        if (currentGameTeam)
        {
            await GameTeam.findOne({where: {GameTeamId: currentGameTeam}})
            .then(async gameTeam => {
                if (gameTeam)
                {
                    await gameTeam.update({CanSelect: false})
                    await io.emitTeam(currentGameTeam, 'CantSelectQuestion');
                }
            })
        }
        //*****Команда прошлая */

        await io.emitTeam(GameTeams[currentGameTeamIndex], 'SelectQuestion', remaining);

        //*****Команда новая */
        currentGameTeam = await GameTeams[currentGameTeamIndex];
        await GameTeam.findOne({where: {GameTeamId: currentGameTeam}})
        .then(async gameTeam => {
            if (gameTeam)
                await gameTeam.update({CanSelect: true})
                .then(async () => {
                    currentGameTeamIndex = await currentGameTeamIndex == GameTeams.length - 1 ? 0 : ++currentGameTeamIndex;
                })
        })
        .catch(err => console.log(err));
        //*****Команда новая */
    }
}

function AnsweringTimer(gameId, callback, Stimer, io) {
    if (!io)
        console.error('Answering_Timer_ERROR: io is undefined');
    if (!Stimer)
        console.error('Answering_Timer_ERROR: Stimer is undefined'); 
    Game.findOne({raw: true, where: {GameId: gameId}})
    .then(game => {
        if (game)
        {
            init(game.AnswerTime * 1000);
        }
    })
    .catch(err => console.log(err));

    var init = function(remaining) {
        callback({
            GameId: gameId,
            Stimer: Stimer,
             Stop: function() {
                clearInterval(Timer);
            },
            Start: function() {
                Timer = setInterval(function() {
                    Tick();
                }, remaining);
            }
        });
    };

    var Tick = async function()
    {
        Stimer.Start();
    }
}

function ChangeGameTeamsState(gameId, state, callback, io) {
    GameTeam.findAll({where: {Game_Id: gameId}})
        .then(async gameTeams => {
            if (gameTeams.length > 0)
            {
                for (var gameTeam of gameTeams)
                {
                    gameTeam.CanSelect = false;
                    gameTeam.CanAnswer = state == 2 ? true : false;
                    gameTeam.TempPoints = 0;
                    gameTeam.Answered = false
                    gameTeam.save();
                }
                await callback(true);
                if (state == 2)
                    io.to('Teams' + gameId).emit('CantSelectQuestion');
            }
        })
        .catch(err => {
            console.log(err);
            callback(false);
        });
}

module.exports = {
    Selection: [],
    Answering: [],
    Types: {
        Selection: 'Selection', Answering: 'Answering'
    }
}