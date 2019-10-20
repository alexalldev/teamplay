$(document).ready(function() {
    $("#sign-up-name").on('input', function() {
        let UserFio = $("#sign-up-name").val().split(" ");
            if (
              !(UserFio.length == 3 &&
              UserFio[0] != "" &&
              UserFio[1] != "" &&
              UserFio[2] != "")
              )
                $("#Info").html('Введите Фамилию Имя и Отчество через пробел');
            else
                $("#Info").html('')
    });

    $("#sign-up-password").on('input', function() {
        Password();
    });

    $("#sign-up-password-onemore").on('input', function() {
        Password();
    });
    
    function Password() {
        if ($("#sign-up-password").val().length < 6)
            $("#Info").html('Длина пароля от 6 символов');
        else  if ($("#sign-up-password-onemore").val() != $("#sign-up-password").val())
            $("#Info").html('Пароли должны совпадать');
        else
            $("#Info").html('')
    }
})