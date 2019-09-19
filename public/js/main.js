const socket = io();

$(document).ready(function() {
    
})

socket.on('recieveNotification', function(notification) {
    console.log(notification);
});