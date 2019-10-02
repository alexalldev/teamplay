$(document).ready(function() {
    $('.btnCreateQuiz').click(function() {
        Swal.fire({title: 'Название викторины', input: 'text'}).then(text => {
            if (text.value)
                socket.emit('AddGame', {GameName: text.value})
        })
    });

    $('.btnCreateRoom').click(function() {
        $("#createRoomModal").modal();
    });

    $('.MyGamesSelect').submit(function() {
        socket.emit('createRoom', $('#RoomName').val(), $('#MyGamesSelect').val(), $('#RoomMaxTeamPlayers').val());
    });

    $('.quiz').click(function() {
        location.href = '/EditGame/' + $(this).attr('gameTag')
    });

    $('.room').click(function() {
        location.href = '/room/' + $(this).attr('roomTag')
    });
})

socket.on('GameAdded', function(data) {
    location.reload();
});

socket.on('GameExists', function() {
    Swal("Игра", "с таким названием существует", "info");
});

socket.on('roomAdded', function () {
    location.reload();
});

socket.on('roomExists', function () {
    Swal.fire('Комната', 'с таким названием уже существует', 'warning');
});

$('.btnChangePassword').click(function() {
    Swal.fire({title: 'Текущий пароль', input: 'password'}).then(currentpass => {
        if (currentpass.value)
            Swal.fire({title: 'Новый пароль', text: 'Длина пароля не менее 5 символов', input: 'password'}).then(newpass => {
                if (newpass.value)
                    $.ajax({
                        type: "POST",
                        url: '/ChangePassword',
                        data: {currentpass: currentpass.value, 
                            newpass: newpass.value},
                        dataType: 'text',
                        success: function(data) {
                            if (data == 'incorrect_pass') Swal.fire('Неверный текущий пароль', '', 'warning');
                            if (data == 'short_pass') Swal.fire('Длина пароля не менее 5 символов', '', 'warning');
                            if (data == 'need_pass') Swal.fire('Введите оба пароля ', '', 'warning');
                            if (data == 'true') Swal.fire('Пароль изменен', '', 'success');
                        },
                        error: function(xhr, str) {
                            alert('Возникла ошибка: ' + xhr.responseCode);
                            $("#CategoryName").val('');
                        }
                    });
            })
    })
})