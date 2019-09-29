$(document).ready(function() {
    socket.emit('getCreatorStatus');
})

socket.on('RecieveCreatorStatus', function(status) {
    console.log(status);
    $('.organizer-connection').attr('connection', status)
});