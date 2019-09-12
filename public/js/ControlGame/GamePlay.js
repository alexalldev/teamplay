$(document).ready(function() {
    $('.btnStopGame').click(function() {
        socket.emit('AdminStopGame');
    });
});

async function PrepareGame() {
    var flag = true;
    if ($('i').is('.VerifyTeam'))
    {
        $('.VerifyTeam').each(function(i) {
            if ($(this).attr('verified') == 'false')
            {
                flag = false;
            }
        })
        if (flag == true)
            socket.emit('PrepareGame');
        else
            Swal("Верификация", "Не все команды верифицированы. Можно удалить неверифицированные и начать игру.", "warning");
    }
    else
        Swal("Нет команд", "Подождите, пока игроки войдут в игру.", "warning");
}

function StartGame() {
    socket.emit('StartGame');
}

function PrepareTeams() {
    $('.card').each(function(i) {
        $(this).delay(i*100).animate(
            {opacity:0},
            {queue: true, duration: 100}); 
    });
    setTimeout(() => {
        $('.TeamsList').remove();
        socket.emit('LoadTeams');
    }, 200);
}

socket.on('ReturnPrepareGame', function(prepared) {
    if (prepared == true)
    {
        PrepareTeams();
    }
});

socket.on('ReturnStartGame', function(started) {
    if (started == true)
        Swal("Отлично!", "Игра начата", "success");
    else if (started == 'null_questions')
        Swal("Игра не начата", "В этой игре нет вопросов", "info");
    else if (started == 'null_categories')
        Swal("Игра не начата", "В этой игре нет категорий", "info");
});

socket.on('AddTeamPoints', async function(data) { //Сортировка при каждом получении баллов
    let {GameTeamId, Points} = data;
    var min = null;
    var Teams = [];
    $('.Team').each(function(i) {
        Teams.push({
            Id: $(this).attr('GameTeamId'),
            Points: Number($('.TeamPoints-' + $(this).attr('GameTeamId')).text())
        });
    });
    await console.log(Teams);
});

socket.on('SingleAnswer', function(data) {
    let {Question, Answer} = data;
    $('.SingleAnswersContainer').css('display', 'block');
    $('.QuestionCost').text('Стоимость: ' + Question.QuestionCost);
    $('.QuestionCost').attr('QuestionCost', Question.QuestionCost);
    $('.SingleAnswersContainer').attr('QuestionId', Question.questionId);
    $('.TextAnswer').text('Ответ: ' + Answer.AnswerText);
    $('.QuestionText').text('Вопрос: ' + Question.QuestionText);
    
});

socket.on('AddSingleAnswer', function(data) {
    let {Team, GameTeamId, Text} = data;
    $('.SingleAnswersList').append('<tr>\
    <td>'+ Team.TeamName +'</td>\
    <td>'+ Text +'</td>\
    <td>\
        <div class="d-flex align-items-center justify-content-center h-1">\
            <label class="Checkcontainer text-center mb-4 ml-1">\
                <input type="checkbox" onchange="UpdateCorrectAnswer('+ GameTeamId +', $(this).prop(\'checked\'))">\
                <span class="checkmark"></span>\
            </label>\
        </div>\
    </td>\
  </tr>');
});


socket.on('SingleConfrimed', function() {
    Swal("Ответы записаны", "", "success");
});

function UpdateCorrectAnswer(gameTeamId, correct)
{
    socket.emit('UpdateCorrectAnswer', {GameTeamId: gameTeamId, QuestionCost: $('.QuestionCost').attr('QuestionCost'), Correct: correct})
}

socket.on('StopGame', function(count) {
    Swal("Игра завершена!", "", "success");
});

function ConfrimSingleAnswers()
{
    ClearSingleAnswers();
    socket.emit('ConfrimSingleAnswers');
}
