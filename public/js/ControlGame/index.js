$(document).ready(function () {
    socket.emit('LoadTeams');
    $('.btnStreamParametrs').click(function () {
        $('.StreamParametrsModal').modal('show');
    });

    $("#AddStreamImage").submit(function (e) {
        e.preventDefault();
        var data = new FormData();
        data.append('StreamImage', $("#StreamImage")[0].files[0]);
        $.ajax({
            type: "POST",
            url: '/SetStreamBackground',
            data: data,
            cache: false,
            contentType: false,
            processData: false,
            success: function (data) {
                console.log(data);
                if (data != 'null') {
                    if (data == 'incorrect_format')
                        Swal("Ошибка", "Неверный формат изображения", "error");
                    else if (data == 'incorrect_size')
                        Swal("Ошибка", "Слишком большое изображение", "error");
                    else {
                        var res = JSON.parse(data);
                        if (res.name)
                            Swal("Ошибка", "Данные не были получены: " + res.name, "error");
                        else {
                            Swal("Готово", "фон установлен", "success");
                        }
                    }
                }
                $("#QuestionImage").val('');
            },
            error: function (xhr, str) {
                alert('Возникла ошибка: ' + xhr.responseCode);
                $("#QuestionImage").val('');
            }
        });
    });
});

async function AddTeam(Team) {
    Team.playersList = '';
    for (const P in Team.players) {
        if (Team.players[P].Capitan == true) {
            Team.Capitan = Team.players[P];
            Team.players.splice(P, 1);
        }
    }
    for (const player of Team.players) {
        Team.playersList += player.PlayerFamily
            + ' ' + player.PlayerName.charAt(0)
            + '.' + player.PlayerLastName.charAt(0) + '. ';
    }
    var flag = false;
    $('.Team').each(function (i) {
        if ($('.Team').is("#Team-" + Team.GameTeamId))
            flag = true;
    });
    if (!flag) $('.TeamsList').html($('.TeamsList').html() + '<div class="card Team NewTeam" id="Team-' + Team.GameTeamId + '">\
    <div class="card-body text-center">\
    <table style="width: 100%"><tr><td align="left"><i class="far fa-check-circle fa-2x VerifyTeam" onclick="ToggleVerifyTeam('+ Team.GameTeamId + ')" id="ToggleVerifyTeam-' + Team.GameTeamId + '" verified="' + (Team.Verified ? 'true' : 'false') + '" title="Верифицировать команду"></i></td>\
      <td align="right"><i class="fa fa-trash fa-2x btnKickTeam" onclick="KickTeam('+ Team.GameTeamId + ')" title="Исключить команду"></i></td></tr></table>\
        <div class="row">\
            <div class="col-md-12">\
                <span class="h1">'+ Team.TeamName + '</span>\
            </div>\
        </div>\
        <div class="row RowGroupName">\
            <div class="col-md-12">\
                <span class="h2">'+ Team.GroupName + '</span>\
            </div>\
        </div>\
        <div class="row RowCapitan">\
            <div class="col-md-12 text-center">\
                <span class="h4"><u>Capitan: '+ Team.Capitan.PlayerFamily + ' '
        + Team.Capitan.PlayerName.charAt(0) + '.'
        + Team.Capitan.PlayerLastName.charAt(0) + '</u></span>\
            </div>\
        </div>\
        <div class="row RowplayersList">\
            <div class="col-md-12 text-center">\
                '+ Team.playersList + '\
            </div>\
        </div>\
    </div>\
    </div>');
    setTimeout(() => {
        $('.Team').removeClass('NewTeam');
    }, 1000);
    TryNullTeams();
    return true;
}

async function AddPreparedTeam(Team) {
    var flag = false;
    $('.Team').each(function (i) {
        if ($('.Team').is("#Team-" + Team.GameTeamId))
            flag = true;
    });
    if (!flag) $('.TeamsList').html($('.TeamsList').html() + '<tr class="Team NewTeam" id="Team-' + Team.GameTeamId + '" GameTeamId="' + Team.GameTeamId + '">\
        <td class="TeamPoints TeamPoints-'+ Team.GameTeamId + '">' + Team.Points + '</td>\
        <td>'+ Team.PlayId + '</td>\
        <td class="TeamName-'+ Team.GameTeamId + '">' + Team.TeamName + '</td>\
        <td><i class="fa fa-trash btnKickTeam" onclick="KickTeam('+ Team.GameTeamId + ', true)" title="Исключить команду"></i></td>\
    </tr>');
    setTimeout(() => {
        $('.Team').removeClass('NewTeam');
    }, 1000);
    TryNullTeams();
    return true;
}

function RemoveTeam(gameTeamId) {
    var team = $("#Team-" + gameTeamId);
    team.addClass('RemoveTeam');
    setTimeout(() => {
        team.remove();
        if ($('tr').is('.Team') == false)
            socket.emit('LoadTeams');
    }, 1000);
    TryNullTeams();
}

function ClearTeamsList() {
    $('.TeamsList').html('');
}

function ClearSingleAnswers() {
    $('.SingleAnswersContainer').css('display', 'none');
    $('.SingleAnswersList').html('');
}

function TryNullTeams() {
    if ($('.card').is('.Team') || $('tbody').is('.TeamsList'))
        $('.NullTeams').css('display', 'none');
    else
        $('.NullTeams').css('display', 'block');
}

function KickTeam(gameTeamId, play = false) {
    if (play == true)
        KickAnswer(function () {
            socket.emit('KickTeam', gameTeamId);
        });
    else {
        if ($("#ToggleVerifyTeam-" + gameTeamId).attr('verified') == 'true') {
            KickAnswer(function () {
                socket.emit('KickTeam', gameTeamId);
            });
        }
        else {
            socket.emit('KickTeam', gameTeamId);
        }
    }
}

function KickAnswer(callback) {
    Swal({
        title: 'Исключение команды',
        text: "Исключить верифицированную команду?",
        type: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#6699FF',
        confirmButtonText: 'Yes'
    }).then((result) => {
        if (result.value) {
            callback()
        }
    })
}

function ToggleVerifyTeam(gameTeamId) {
    var state = $("#ToggleVerifyTeam-" + gameTeamId).attr('verified');
    socket.emit('ToggleVerifyTeam', gameTeamId, state);
    $("#ToggleVerifyTeam-" + gameTeamId).attr('verified', state == 'true' ? 'false' : 'true');
}

$('.BroadcastForm').submit(function (e) {
    e.preventDefault();
    var message = $('.BroadcastMessage').val();
    socket.emit('BroadcastTeams', message);
    $('.BroadcastMessage').val('');
    animateCSS('.BroadcastMessage', 'bounceOutRight', function () {
        animateCSS('.BroadcastMessage', 'bounceInLeft');
    });
});

socket.on('ReciveTeams', function (Teams, Play) {
    if (Play == 1 || Play == 2) {
        PrepareTeamList.Prepared();

        TryNullTeams();
        for (var i in Teams) {
            AddPreparedTeam(Teams[i]);
        }
    }
    else if (Play == 0) {
        PrepareTeamList.noPrepared();

        TryNullTeams();
        for (var i in Teams) {
            AddTeam(Teams[i]);
        }
    }
});

socket.on('JoinTeam', function (Team) {
    AddTeam(Team);
    PlaySound('In');
});

socket.on('LeftTeam', function (gameTeamId) {
    RemoveTeam(gameTeamId);
    PlaySound('Out');
});


var PrepareTeamList = {
    noPrepared: function () {
        $('.ConditionText').text('Команды онлайн');

        $('.btnStopGame').css('display', 'none');
        $('.btnStreamParametrs').css('display', 'none');
        $('.btnStartGame').text('P R E P A R E');
        $('.btnStartGame').addClass('btnPrepareGame');
        $('.btnStartGame').removeClass('btn-info');
        $('.btnStartGame').addClass('btn-success');
        $('.btnPrepareGame').attr('onclick', 'PrepareGame()')
        $('.btnStartGame').removeClass('btnStartGame');
        $('.TeamsContainer').html('<div class="card-columns TeamsList"></div>');
    },
    Prepared: function () {
        $('.ConditionText').text('Игра готова, можно начинать');

        $('.btnStopGame').css('display', 'block');
        $('.btnStreamParametrs').css('display', 'block');
        $('.btnPrepareGame').text('S T A R T');
        $('.btnPrepareGame').addClass('btnStartGame');
        $('.btnPrepareGame').removeClass('btn-success');
        $('.btnPrepareGame').addClass('btn-info');
        $('.btnPrepareGame').attr('onclick', 'StartGame()')
        $('.btnPrepareGame').removeClass('btnPrepareGame');
        $('.TeamsContainer').html('<div class="row">\
        <div class="col-md-12 text-center">\
    \
            <table class="table table-hover">\
            <thead>\
                <th class="h3 text-center"><i class="fas fa-trophy text-warning\"></i></th>\
                <th class="h3 text-center">№</th>\
                <th class="h3 text-center">Команда</th>\
                <th class="h5 text-center"><i class="fa fa-trash text-danger"></i></th>\
            </thead>\
            <tbody class="TeamsList">\
                \
            </tbody>\
            </table>\
    \
        </div>\
        </div>');
    }
}