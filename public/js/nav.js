$(document).ready(function() {
    $('.nav-notifications').click(function() {
        $('.notifications-menu').toggle('collapse');
    });

    socket.on('receiveNotification', function(notification) {
        $('.notifications-menu').append("<div class='nav-notification'></div>");
    });
})