const Game = require('../../models/Game');
const Team = require('../../models/Team');
const Player = require('../../models/Player');
const GameTeam = require('../../models/GameTeam');
const Category = require('../../models/Category');
const Question = require('../../models/Question');
const Answer = require('../../models/Answer');

const GamePlay = require('../../models/GamePlay');
const GamePlayCategory = require('../../models/GamePlayCategory');
const GamePlayQuestion = require('../../models/GamePlayQuestion');

const fs = require('fs');

function GamePlaySockets(socket, io) {
    const session = socket.request.session; //Сессия пользователя

    socket.on('PrepareGame', function() { //Администратор подготавливает игру
        if (socket.HasControlGame)
        {
            GameTeam.findAll({raw: true, where: {Game_Id: session.Game.Id}})
            .then(gameTeams =>
                {
                    if (gameTeams.length > 0)
                    {
                        var flag = true;
                        for (var gameTeam of gameTeams)
                        {
                            if (gameTeam.Verified == false)
                            {
                                flag = false;
                                break;
                            }
                        }
                        if (flag == true)
                        {
                            CreateGamePlayStructure(function() {
                                PrepareGame();
                                io.to('Stream' + session.Game.Id).emit("UpdateStream");
                            });
                        }
                        else
                            socket.emit('ReturnPrepareGame', false);
                    }
                    else
                        socket.emit('ReturnPrepareGame', false);
                })
            .catch(err => console.log(err))
        }
    })

    socket.on('GetPrepared', function() { //Команда запрашивает подготовленность игры при входе в игру
        if (session.Game)
        {
            if (session.Game.GameTeamId)
                Game.findOne({raw: true, where: {GameId: session.Game.Id}})
                .then(game => {
                    GameTeam.findOne({raw: true, where: {GameTeamId: session.Game.GameTeamId}})
                    .then(gameTeam => {
                        if (gameTeam)
                            if (gameTeam.Play == 1)
                                socket.emit('PrepareGame', {
                                    PlayId: gameTeam.PlayId,
                                    SelectionTime: game.SelectionTime,
                                    AnswerTime: game.AnswerTime
                                });
                            else if (gameTeam.Play == 2)
                                {
                                    socket.emit('PrepareGame', {
                                        PlayId: gameTeam.PlayId,
                                        SelectionTime: game.SelectionTime,
                                        AnswerTime: game.AnswerTime
                                    });
                                    socket.emit('StartGame');
                                }
                    })
                    .catch(err => console.log(err))
                })
                .catch(err => console.log(err));
        }
    })

    socket.on('StartGame', function() { //Администратор начинает игру
        if (socket.HasControlGame)
        {
            RemoveGamePlayStructure(function() {
                CreateGamePlayStructure(function() {
                    GamePlay.findOne({where: {Game_Id: session.Game.Id}})
                    .then(async gamePlay =>{
                        if (gamePlay)
                        {
                            GamePlayCategory.findAll({raw: true, where: {GamePlay_Id: gamePlay.GamePlayId}})
                            .then(async gamePlayCategories => {
                                if (gamePlayCategories.length > 0)
                                {
                                    var count = 0;
                                    for (var gamePlayCategory of gamePlayCategories)
                                    {
                                        await GamePlayQuestion.findOne({raw: true, where: {GamePlayCategory_Id: gamePlayCategory.GamePlayCategoryId}})
                                        .then(async gamePlayQuestion => {
                                            if (gamePlayQuestion)
                                                await count++;
                                        })
                                        .catch(err => console.log(err));
                                    }
                                    if (await count == 0)
                                    {
                                        return socket.emit('ReturnStartGame', 'null_questions');
                                    }
                                    gamePlay.update({StartTime: getUnixTime()});
                                    GameTeam.findAll({where: {Game_Id: session.Game.Id}})
                                    .then(async gameTeams =>
                                        {
                                            if (gameTeams.length > 0)
                                            {
                                                for (var gameTeam of gameTeams)
                                                {
                                                    gameTeam.update({Play: 2, TempPoints: 0, Answered: 0, Points: 0, CanSelect: 0, CanAnswer: 0, CanAnswer: false});
                                                }
                                                //Удаляем прошлые таймеры, если игра перезапущена
                                                ClearTimers(session.Game.Id);
    
                                                //Добавляем новые таймеры
                                                await new SelectionTimer(session.Game.Id, function(Stimer) {
                                                    TIMERS.Selection.push(Stimer);
    
                                                    new AnsweringTimer(session.Game.Id, function(Atimer) {
                                                        TIMERS.Answering.push(Atimer);
                                                    }, Stimer, io); //Добавляем ссылку на Stimer, чтобы его не искать
    
                                                }, io);
                                                await io.to('Teams' + session.Game.Id).emit('StartGame');
                                                socket.emit('ReturnStartGame', true);
                                            }
                                        })
                                    .catch(err => console.log(err));
                                }
                                else
                                    socket.emit('ReturnStartGame', 'null_categories');
                            })
                            .catch(err => console.log(err));
                        }
                    })
                    .catch(err => console.log(err));
                });
            })
        }
    })

    socket.on('GetCategoriesList', function() { //Команда запрашивает список вопросов
        GamePlay.findOne({raw: true, where: {Game_Id: session.Game.Id}})
        .then(async gamePlay => {
            if (gamePlay)
            {
                Game.findOne({raw: true, where: {GameId: gamePlay.Game_Id}})
                .then(async game => {
                    await GamePlayCategory.findAll({raw: true, where: {GamePlay_Id: gamePlay.GamePlayId}})
                    .then(async gamePlayCategories => {
                        if (gamePlayCategories.length > 0)
                        {
                            game.Categories = [];
                            for (var C in  gamePlayCategories)
                            {
                                await Category.findOne({raw: true, where: {CategoryId: gamePlayCategories[C].Category_Id}})
                                .then(category => {
                                    game.Categories.push(category);
                                })
                                .catch(err => console.log(err));

                                await GamePlayQuestion.findAll({raw: true, where: {GamePlayCategory_Id: gamePlayCategories[C].GamePlayCategoryId}})
                                .then(async gamePlayQuestions => {
                                    if (gamePlayQuestions.length > 0)
                                    {
                                        game.Categories[C].Questions = [];
                                        for (var Q in gamePlayQuestions)
                                        {
                                            await Question.findOne({raw: true, where: {QuestionId: gamePlayQuestions[Q].Question_Id}})
                                            .then(async question => {
                                                question.GamePlayQuestionId = gamePlayQuestions[Q].GamePlayQuestionId;
                                                game.Categories[C].Questions.push(question);
                                            })
                                            .catch(err => console.log(err));
                                        }
                                        gamePlayCategories[C].Questions = gamePlayQuestions;
                                    }
                                })
                                .catch(err => console.log(err));
                            }
                            gamePlay.Categories = gamePlayCategories;
                        }
                    })
                    .catch(err => console.log(err));
                    socket.emit('ReciveCategoriesList', game.Categories);
                })
                .catch(err => console.log(err));
            }
        })
        .catch(err => console.log(err));
    });
    
    socket.on('TeamSelectQuestion', function(gamePlayQuestionId) { //Команда выбирает вопрос
        if (session.Game)
        {
            GameTeam.findOne({raw: true, where: {GameTeamId: session.Game.GameTeamId, CanSelect: true}})
            .then(gameTeam => {
                if (gameTeam)
                {
                    GamePlayQuestion.findOne({where: {GamePlayQuestionId: gamePlayQuestionId}})
                    .then(gamePlayQuestion => {
                        Question.findOne({raw: true, where: {QuestionId: gamePlayQuestion.dataValues.Question_Id}})
                        .then(question => {
                            if (question)
                            {
                                //Удаляет выбранный вопрос из временной таблицы
                                GamePlayQuestion.destroy({where: {GamePlayQuestionId: gamePlayQuestion.GamePlayQuestionId}})
                                
                                //Отправит ответы на выбранный вопрос
                                Answer.findAll({raw: true, where: {Question_Id: question.QuestionId}})
                                .then(answers => {
                                    StartAnswering(answers, question.QuestionId)
                                })
                                .catch(err => console.log(err));
                            }
                        })
                        .catch(err => console.log(err));
                    })
                    .catch(err => console.log(err));
                }
            })
            .catch(err => console.log(err));
        }
    });

    socket.on('AdminStopGame', function() { //Администратор завершает игру
        if (socket.HasControlGame)
        {
            StopGame(session.Game.Id);
        }
    });

    function StopGame(gameId) {
        GamePlay.findOne({where: {Game_Id: gameId}})
        .then(gamePlay => {
            if (gamePlay)
            {
                gamePlay.update({StopTime: getUnixTime()});
                io.to('Admins' + gameId).emit('StopGame');
                GameTeam.findAll({order: [['Points', 'DESC']], where: {Game_Id: gameId}})
                .then(async gameTeams => {
                    var Teams = [];
                    for (var gameTeam of gameTeams)
                    {

                        await Team.findOne({raw: true, where: {TeamId: gameTeam.dataValues.Team_Id}})
                        .then(team => {
                            Teams.push({
                                Points: gameTeam.dataValues.Points,
                                TeamName: team.TeamName
                            })
                        })
                        await gameTeam.update({Play: 0, TempPoints: 0, Answered: 0, Points: 0, CanSelect: 0, CanAnswer: 0, CanAnswer: false});
                    }
                    await io.to('Teams' + gameId).emit('StopGame', Teams);
                    ClearTimers(gameId);
                    RemoveGamePlayStructure(function() {});
                })
                .catch(err => console.log(err));
            }
        })
    }

    socket.on('GetCanSelect', function() { //Команда запрашимает значение возможности выбора вопроса
        if (session.Game)
            GameTeam.findOne({raw: true, where: {GameTeamId: session.Game.GameTeamId}})
            .then(gameTeam => {
                if (gameTeam)
                    socket.emit('ReciveCanSelect', gameTeam.CanSelect);
            })
            .catch(err => console.log(err));
    })

    socket.on('GetPoints', function() { //Команда запрашимает количество очков
        if (session.Game)
            GameTeam.findOne({raw: true, where: {GameTeamId: session.Game.GameTeamId}})
            .then(gameTeam => {
                if (gameTeam)
                    socket.emit('RecivePoints', gameTeam.Points);
            })
            .catch(err => console.log(err));
    })

    socket.on('TeamAnswer', function(data) { //Команда отвечает на вопрос
        let {answers, questionId} = data;
        if (session.Game)
        {
            GameTeam.findOne({where: {GameTeamId: session.Game.GameTeamId, CanAnswer: true}})
            .then(async gameTeam => {
                if (gameTeam)
                {
                    gameTeam.update({CanAnswer: false}); //Запрещаем отвечать второй раз

                    var flag = answers.length > 0 ? true : false;
                    for (var A in answers)
                    {
                        await Answer.findOne({raw: true, where: {AnswerId: answers[A].AnswerId}})
                        .then(answer => {
                            if (answer)
                            {
                                if (answers[A].Value != answer.Correct)
                                    flag = false;
                            }
                            else
                                flag = false;
                        })
                        .catch(err => {console.log(err); flag = false});
                    }
                    await Question.findOne({raw: true, where: {QuestionId: questionId}})
                    .then(async question => {
                        if (question)
                        {
                            var TempPoints = await flag ? question.QuestionCost : 0;
                            gameTeam.update({TempPoints: TempPoints, Answered: true}).then(() => {
                                socket.emit('AnswerSaved');
                                GameTeam.findAll({raw: true, where: {Game_Id: session.Game.Id, Answered: false}})
                                .then(gameTeams => {
                                    if (gameTeams.length == 0)
                                        GetTimer(session.Game.Id, function(Atimer) {
                                            Atimer.Stop();
                                        }, TIMERS.Types.Answering);
                                })
                            })
                        }
                    })
                    .catch(err => console.log(err));
                }
            })
            .catch(err => console.log(err));
        }
    });

    socket.on('TeamSingleAnswer', function(text) {//Команда отвечает на текстовый вопрос
        if (session.Game)
            if (session.Team)
            {
                GameTeam.findOne({where: {GameTeamId: session.Game.GameTeamId, CanAnswer: true}})
                .then(gameTeam => {
                    if (gameTeam)
                    {
                        gameTeam.update({CanAnswer: false, Answered: true});
                        io.to('Admins' + session.Game.Id).emit('AddSingleAnswer', {Team: session.Team, GameTeamId: session.Game.GameTeamId, Text: text});
                    }
                })
                .catch(err => console.log(err));
            }
    })

    socket.on('UpdateCorrectAnswer', function(data) { //Администратор отмечает правильность текстового ответа
        if (socket.HasControlGame)
        {
            let {GameTeamId, QuestionCost, Correct} = data;
            
            GameTeam.findOne({where: {GameTeamId: GameTeamId}})
                .then(gameTeam => {
                    if (gameTeam)
                    {
                        gameTeam.update({TempPoints: Correct == true ? QuestionCost : 0});
                    }
                })
                .catch(err => console.log(err));
        }
    });
    
    socket.on('ConfrimSingleAnswers', function() { //Администратор завершает проверку текстовых ответов
        if (socket.HasControlGame)
        {
            socket.emit('SingleConfrimed');
            GetTimer(session.Game.Id, function(Atimer) {
                Atimer.Stop();
                
    
            }, TIMERS.Types.Answering);
        }
    });
    

    function PrepareGame() { //Подготовка игры с Id из session
        if (socket.HasControlGame)
        {
            /*                        PrepareGame  Random Ids and Set Points to 0                      */
            Game.findOne({raw: true, where: {GameId: session.Game.Id}})
            .then(game => {
                GameTeam.findAll({where: {Game_Id: session.Game.Id}})
                .then(async gameTeams => 
                    {
                        var RandomIds = GetRandomIds(gameTeams.length);
                        for (var G in gameTeams)
                        {
                            await gameTeams[G].update({Play: 1, TempPoints: 0, Answered: 0, Points: 0, CanSelect: 0, CanAnswer: 0, PlayId: RandomIds[G]})
                            .then(async (gameTeam) => {
                                await io.emitTeam(gameTeam.dataValues.GameTeamId, 'PrepareGame', {
                                    PlayId: RandomIds[G],
                                    SelectionTime: game.SelectionTime,
                                    AnswerTime: game.AnswerTime
                                });
                            })
                            .catch(err => console.log(err))
                        }
                    })
                .catch(err => console.log(err));
            })
            .catch(err => console.log(err));
            GamePlay.findOne({where: {GamePlayId: session.Game.Id}})
            .then(gamePlay => {
                if (gamePlay)
                    gamePlay.update({StartTime: 0, StopTime: 0});
            })
            .catch(err => console.log(err));
            socket.emit('ReturnPrepareGame', true);
        }
    }

    function CreateGamePlayStructure(callback) {
        /*                          GamePlay Structure                      */
        Game.findOne({raw: true, where: {GameId: session.Game.Id}})
        .then(async game =>
        {
            if (game)
                await GamePlay.findOrCreate({raw: true, where: {Game_Id: game.GameId}})
                .then(async ([gamePlay, created]) =>
                {
                    await Category.findAll({raw: true, where: {Game_Id: game.GameId}})
                    .then(async categories =>
                    {
                        if (categories.length > 0)
                            for (var C in categories)
                            {
                                await GamePlayCategory.findOrCreate({raw: true, where: {Category_Id: categories[C].CategoryId, GamePlay_Id: gamePlay.GamePlayId}})
                                .then(async ([gamePlayCategory, created]) =>
                                {
                                    await Question.findAll({raw: true, where: {Category_Id: categories[C].CategoryId}})
                                    .then(async questions =>
                                    {
                                        for (var Q in questions)
                                        {
                                            await GamePlayQuestion.findOrCreate({raw: true, where: {Question_Id: questions[Q].QuestionId, GamePlayCategory_Id: gamePlayCategory.GamePlayCategoryId}})
                                            .then(async ([gamePlayQuestion, created]) =>
                                            {

                                            })
                                            .catch(err => console.log(err));
                                        }
                                    })
                                    .catch(err => console.log(err));
                                })
                                .catch(err => console.log(err));
                            }
                    })
                    .catch(err => console.log(err));
                })
                .catch(err => console.log(err));
            await callback(true);
        })
        .catch(err => console.log(err));
    }

    function RemoveGamePlayStructure(callback) {
        GamePlay.findOne({where: {Game_Id: session.Game.Id}})
        .then(async gamePlay => 
        {
            if (gamePlay)
            {
                await GamePlayCategory.findAll({where: {GamePlay_Id: gamePlay.dataValues.GamePlayId}})
                .then(async gamePlayCategories => {
                    if (gamePlayCategories.length > 0)
                        for (var gamePlayCategory of gamePlayCategories)
                        {
                            await GamePlayQuestion.destroy({where: {GamePlayCategory_Id: gamePlayCategory.dataValues.GamePlayCategoryId}})
                            await gamePlayCategory.destroy();
                        }
                })
                .catch(err => console.log(err));
                await GamePlay.RemoveStreamImage(gamePlay.dataValues.GamePlayId, function() {})
                await gamePlay.destroy();
                await callback();
            }

        })
        .catch(err => console.log(err));
    }

    function StartAnswering(answers, questionId) {
        if (session.Game)
        {
            GetTimer(session.Game.Id, function(Stimer) {
                if (Stimer)
                {
                    Game.findOne({raw: true, where: {GameId: session.Game.Id}})
                    .then(game => {
                        if (game)
                        {
                            Question.findOne({raw: true, where: {QuestionId: questionId}})
                            .then(question => {
                                if (question)
                                {
                                    GamePlay.findOne({where: {Game_Id: game.GameId}})
                                    .then(gamePlay => {
                                        if (gamePlay)
                                        {
                                            io.to('Teams' + session.Game.Id).emit('StartAnswerQuestion', answers.length == 1 ? answers[0].Question_Id : answers, game.AnswerTime * 1000);
                                            Stimer.Stop(); //Останавливаем выбор вопроса и начинаем ответы
                                            GetTimer(session.Game.Id, function(Atimer) {
                                                var pause = answers.length == 1 ? true : false;
                                                Atimer.Start(pause); //Начинаем ответы в зависимости от типа вопроса

                                                if (pause)
                                                    io.to('Admins' + session.Game.Id).emit('SingleAnswer', {Question: question, Answer: answers[0]});

                                            }, TIMERS.Types.Answering);
                                            gamePlay.update({CurrentQuestionId: questionId})
                                            .then(() => {                                     
                                                io.to('Stream' + session.Game.Id).emit('ReciveQuestion', question);
                                            })
                                        }
                                    })
                                    .catch(err => console.log(err));
                                }
                            })
                            .catch(err => console.log(err));
                        }
                    })
                    .catch(err => console.log(err));
                }

            })
        }
    }
}

function GetRandomIds(Count) {
    var RandomNumbers = [];
    var Result = [];
    var RandomNumber = 0;

    for (var c = 1; c <= Count; c++)
        RandomNumbers.push(c);

    while (Count--) {
        RandomNumber = Math.floor(Math.random() * (Count + 1));
        Result.push(RandomNumbers[RandomNumber]);
        RandomNumbers.splice(RandomNumber, 1);
    }

    return Result;
}

async function GetTimer(gameId, callback, type = TIMERS.Types.Selection) {
    for (var TIMER of TIMERS[type])
    {
        if (TIMER.GameId == gameId)
            return callback(TIMER);
    }
    await callback(null);
}

function ClearTimers(gameId)
{
    for (let Ts in TIMERS.Selection)
    {
        if (TIMERS.Selection[Ts].GameId == gameId)
        {
            TIMERS.Selection[Ts].Clear();
            TIMERS.Selection.splice(Ts, 1);
        }
    }
    for (let Ta in TIMERS.Answering)
    {
        if (TIMERS.Answering[Ta].GameId == gameId)
        {
            TIMERS.Answering[Ta].Clear();
            TIMERS.Answering.splice(Ta, 1);
        }
    }
}

var TIMERS = [];
TIMERS.Selection = [];
TIMERS.Answering = [];
TIMERS.Types = {
    Selection: 'Selection', Answering: 'Answering'
}

function SelectionTimer(gameId, callback, io) {
    var Timer = null;
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
                    Clear: function() {
                        clearInterval(Timer);
                    },
                    Stop: function() {

                        ChangeGameTeamsState(gameId, '2', function(state) {
                            if (state)
                            clearInterval(Timer);
                        }, io); //Меняем состояние команд на ответ
                    },
                    Start: function() {

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
        else
            io.to('Teams' + gameId).emit('WaitSelect');
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

                GamePlay.findOne({where: {Game_Id: gameId}}) //Меняем состояние игры для зрителей
                .then(gamePlay => {
                    gamePlay.update({StreamState: state == 1 ? false : true});
                })
                .catch(err => console.log(err));

                if (state == 2)
                    io.to('Teams' + gameId).emit('CantSelectQuestion', true);
                if (state == 1)
                    io.to('Teams' + gameId).emit('CantAnswer');
            }
        })
        .catch(err => {
            console.log(err);
            callback(false);
        });
}

function AnsweringTimer(gameId, callback, Stimer, io) {
    var Timer = null;
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
            Stop: Stop,
            Clear: function() {
                clearInterval(Timer);
            },
            Start: function(pause = false) {
                Timer = setInterval(function() {
                    Tick(pause);
                }, remaining);
            }
        });
    };

    var Stop = function(pause = false) { //Останавливает таймер ответа и записывает полученные баллы
        clearInterval(Timer);
        if (pause == false)
        {
            ContinueSelection(gameId, function() {
                Stimer.Start();
            }, io);
        }
    }

    var Tick = async function(pause = false)
    {
        Stop(pause);
    }
}

function ContinueSelection(gameId, callback, io)
{
    GameTeam.findAll({where: {Game_Id: gameId}})
            .then(async gameTeams => {
                if (gameTeams.length > 0)
                {
                    var Teams = [];
                    for (var gameTeam of gameTeams)
                    {
                        if (gameTeam.dataValues.Answered)
                        {
                            io.emitTeam(gameTeam.dataValues.GameTeamId, 'AddPoints', gameTeam.dataValues.TempPoints); //Добавить очки команде, ответившей на вопрос 
                        }
                        await gameTeam.update({Points: gameTeam.dataValues.Points + gameTeam.dataValues.TempPoints, Answered: false});
                    }
                    
                    await GameTeam.findAll({raw: true, order: [['Points', 'DESC']], where: {Game_Id: gameId}})
                    .then(async gameTeams => {
                        if (gameTeams.length > 0)
                        {
                            for (var gameTeam of gameTeams)
                            {
                                await Team.findOne({raw: true, where: {TeamId: gameTeam.Team_Id}})
                                .then(team => {
                                    if (team)
                                        Teams.push({
                                            TeamName: team.TeamName,
                                            GameTeamId: gameTeam.GameTeamId,
                                            PlayId: gameTeam.PlayId,
                                            Points: gameTeam.Points,
                                        });
                            })
                            .catch(err => console.log(err));
                            }
                        }
                    })
                    .catch(err => console.log(err));
                    await io.to('Admins' + gameId).emit('ReciveTeams', Teams);
                    GamePlay.findOne({where: {Game_Id: gameId}})
                    .then(async gamePlay =>{
                        if (gamePlay)
                        {
                            GamePlayCategory.findAll({raw: true, where: {GamePlay_Id: gamePlay.GamePlayId}})
                            .then(async gamePlayCategories => {
                                if (gamePlayCategories.length > 0)
                                {
                                    var count = 0;
                                    for (var gamePlayCategory of gamePlayCategories)
                                    {
                                        await GamePlayQuestion.findOne({raw: true, where: {GamePlayCategory_Id: gamePlayCategory.GamePlayCategoryId}})
                                        .then(async gamePlayQuestion => {
                                            if (gamePlayQuestion)
                                                await count++;
                                        })
                                        .catch(err => console.log(err));
                                    }
                                    if (await count == 0)
                                    {
                                        StopGame(gameId);
                                    }
                                }
                            })
                            .catch(err => console.log(err));
                        }
                    })
                    .catch(err => console.log(err));
                        await callback();
                }
            })
            .catch(err => console.log(err));
}

function getUnixTime() {
    return Math.floor(new Date() / 1000)
}

module.exports = GamePlaySockets;