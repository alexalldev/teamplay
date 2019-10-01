$(document).ready(function() {
    $('.btnCreateQuiz').click(function() {
        Swal.fire({title: 'Название викторины', input: 'text'}).then(text => {
            if (text.value)
                socket.emit('AddGame', {GameName: text.value})
        })
    });
})

socket.on('GameAdded', function(data) {
    location.reload();
});

