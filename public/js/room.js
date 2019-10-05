$(document).ready(function() {
    socket.emit('getCreatorStatus');
    $('.btnRemoveRoom').click(function() {
        var roomId = $(this).attr('roomId');
        Swal({
            title: 'Удаление комнаты',
            text: "Удалить комнату?",
            type: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#6699FF',
            confirmButtonText: 'Yes'
          }).then((result) => {
            if (result.value) {
                socket.emit('deleteRoom', roomId);
            }
          })
    });
})

socket.on('RecieveCreatorStatus', function(status) {
    $('.organizer-connection').attr('connection', status)
    $('.organizer-connection').attr('title', status ? 'Организатор в сети' : 'Организатор не в сети')
});

socket.on('roomDeleted', function(status) {
    if (status)
        location.href = '/leaveRoom';
    else
        Swal.fire('Ошибка', status, 'warning');
});

socket.on('AddUserToRoom', function(player) {
    console.log(player);
});