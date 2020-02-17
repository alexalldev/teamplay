$(document).ready(function() {
    
    socket.emit('LoadGames');

    $('.NewGame').submit(function(e) {
        e.preventDefault();
        socket.emit('AddGame', {
            GameName: $("#GameName").val()
        });
    });

    $('.VerifyTeam').click(function(e) {
        var target = $(e.target);
        if (target.attr('verified') == 'true')
        {
            target.attr('verified', 'false');
        }
        else
        {
            target.attr('verified', 'true');
        }
    });
});

function AddGame(Game) {
    $('.NullGames').remove();
    $('.GamesList').html($('.GamesList').html() + '\
    <tr class="cubeRow Game-'+ Game.GameId +'" onclick="OpenGame('+ Game.GameId +', \''+ Game.GameName +'\', \''+ Game.GameTag +'\')">\
        <td>\
            <div class="cubeContainer cubeId-'+ Game.GameId +'">');
                for (let i = 1; i <= 6; i++) {
                    $('.cubeId-'+ Game.GameId +'').html($('.cubeId-'+ Game.GameId +'').html() +'<div class="side-'+ i +' side">\
                    <table style="width: 100%; height: 100%;">\
                        <tr align="center">\
                            <td valign="center">\
                                '+ (i <= 5 ? '<img src="/public/images/logo.svg" width="100" height="100">' : '<span class="h2 text-white">'+ Game.GameName +'</span>')  +'\
                            </td>\
                        </tr>\
                    </table>\
                </div>');
                }
                $('.GamesList').html($('.GamesList').html() + '</div>\
        </td>\
    </tr>');
    return true;
}

function OpenGame(gameId, gameName, gameTag) {
    $('.GameMenu_GameName').text(gameName);
    $('.GameMenu_EditGame').attr('href', '/EditGame/' + gameTag);
    $('.GameMenu_ControlPanel').attr('href', '/ControlPanel/' + gameTag);
    $('.btnRemoveGame').attr('GameId', gameId);

    $('#GameMenu').modal();
}

function RemoveGame(GameId) {
    socket.emit("RemoveGame", {GameId: GameId});
}

socket.on('ReciveGames', function(Games) {
    for (var i in Games)
    {
        AddGame(Games[i]);
    }
    for(var game of Games)
    {
        animateCSS('.Game-' + game.GameId, 'zoomIn');
    }
});

socket.on('GameExists', function() {
    Swal("Игра", "с таким названием существует", "info");
});

socket.on('GameRemoved', function(GameId) {
    $('.Game-' + GameId).animate({opacity: 0}, 500, function() {
        $('.Game-' + GameId).remove();
    })
    $("#GameMenu").modal('hide');
});

socket.on('GameAdded', function(data) {
    AddGame(data);
    animateCSS('.Game-' + data.GameId, 'zoomIn');
});

function RemoveGame(gameId) {
    Swal({
        title: 'Удаление игры',
        text: "Удалить игру и связанные с ней категории и вопросы?",
        type: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#6699FF',
        confirmButtonText: 'Yes'
      }).then((result) => {
        if (result.value) {
            socket.emit('RemoveGame', gameId)
        }
      })
}