$(document).ready(function() {
    $('.cta').on('click', function() {
        setTimeout(() => {
            $("#sign-up-name").focus();
        }, 0);
    });

    $('.signin').click(function() {
        SwalSignIn();
    })

    $('.sign-up-form').submit(function() {
        let form = $(this).serialize();
        $.ajax({
            type: "POST",
            url: "RegisterNewUser",
            data: form,
            dataType: "text",
            success: function(data) {
                if (data == "incorrect_email") $("#email").addClass("incorrect-input");
                else if (data == "poor_password")
                $("#Info").html(
                    "Длина пароля от 6 символов"
                );
                else if (data == "user_exists")
                $("#Info").html(
                    'Такой email зарегистрирован, хотите <button class="btn btn-warning text-dark" onclick="UserExisitsSignIn();">войти</button>?'
                );
                else if (data == "incorrect_confirm_password")
                $("#Info").html("Неверный повтор пароля");
                else if (data == "incorrect_fio")
                $("#Info").html("Введите ФИО через пробел");
                else if (data == "true") {
                    AnimateSignUp();
                }
            },
            error: function(xhr, str) {
                alert("Возникла ошибка: " + xhr.responseCode);
            }
            });
    })
})

function AnimateSignUp() {
    $('.sign-up-form').addClass('animated');
    $('.sign-up-form').addClass('bounceOut');
    $('.sign-up-form').css('opacity', '0');
    setTimeout(() => {
        $('.SignUpInfo').removeClass('hidden');
    }, 500);
}

function SignIn(credentails) {
    let serialized_credentails = serialize(credentails);
    $.ajax({
        type: "POST",
        url: "SignIn",
        data:  serialized_credentails,
        dataType: "text",
        success: function(data) {
          if (data == "pass") Swal.fire('Неверный пароль')
          else if (data == "null_user")
            Swal.fire({title: "Похоже такого пользователя не существует", html: '<a class="btn-signup text-primary" href="#signup">Зарегистрировать</a>', onBeforeOpen: () => {
                $(".btn-signup").click(function() {
                    $("#sign-up-email").val(credentails.username);
                    Swal.close();
                });
            }});
          else if (data == "Messing credentials")
            Swal.fire("Заполните все поля");
          else if (data == "Please Activate Your Account via Email")
            Swal.fire("Активируйте учетную запись через почту.");
          else if (JSON.parse(data).result) location.reload();
        },
        error: function(xhr, str) {
          alert("Возникла ошибка: " + xhr.responseCode);
        }
      });
}

function SwalSignIn() {
    if (!window.email)
            Swal.fire({ title: "Email", input: "email" }).then(email => {
                if (email.value)
                {
                    window.email = email.value;
                    Swal.fire({ title: "Пароль", input: "password", html: '<div class="row"><div class="col-md-12 text-center">\
                    <a class="text-info forgot-pass">Забыл пароль?</a></div></div>',
                    input: "password",
                    onBeforeOpen: () => {
                        $(".forgot-pass").click(function() {
                            ForgotPassword({username: email.value});
                        });
                    } }).then(pass => {
                        if (pass.value)
                            SignIn({
                                username: email.value,
                                password: pass.value
                            });
                    });
                }
            });
        else
            Swal.fire({ title: "Пароль",
            html: '<div class="row"><div class="col-md-12 text-center"><button class="btn btn-success" id="ChangeEmail">Изменить Email: '+ window.email +'</button></div></div>\
            <div class="row"><div class="col-md-12 text-center">\
            <a class="text-info forgot-pass">Забыл пароль?</a></div></div>',
            input: "password",
            onBeforeOpen: () => {
                $("#ChangeEmail").click(function() {
                    ClearEmail();
                });

                $(".forgot-pass").click(function() {
                    ForgotPassword({username: email.value});
                });
            }}).then(pass => {
                        if (pass.value)
                            SignIn({
                                username: window.email,
                                password: pass.value
                            });
                    });
}

function ClearEmail() {
    delete window.email;
    SwalSignIn();
}

function serialize(object) {
    var serialized_credentails = "";
    for (var key in object) {
        if (serialized_credentails != "") {
            serialized_credentails += "&";
        }
        serialized_credentails += key + "=" + encodeURIComponent(object[key]);
    }
    return serialized_credentails;
}

function ForgotPassword(credentails) {
    let serialized_credentails = serialize(credentails);
    $.ajax({
        type: "POST",
        url: "ForgotPassword",
        data: serialized_credentails,
        dataType: "text",
        success: function(data) {
            if (data == "null_user")
                Swal.fire("Похоже такого пользователя не существует");
            else if (data == "null_email")
                Swal.fire("Введите email");
            else if (data == "Please Activate Your Account via Email")
                Swal.fire("Активируйте учетную запись через почту.");
            else if (data == "true") Swal.fire("Проверьте почту");
        },
        error: function(xhr, str) {
            alert("Возникла ошибка: " + xhr.responseCode);
        }
    });
}

function UserExisitsSignIn() {
    window.email = $("#sign-up-email").val();
    SwalSignIn();
}