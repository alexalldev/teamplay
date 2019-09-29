$(function() {
	$('.btn').click(function() {
		ToggleBtn();
	});
});

$('a').click(function(e) {
	e.preventDefault();
});

function ToggleBtn(u_toggle = false) {
	if (u_toggle) $('#Info').html('');
	$('.form-signin').toggleClass('form-signin-left');
	$('.form-signup').toggleClass('form-signup-left');
	$('.frame').toggleClass('frame-long');
	$('.signup-inactive').toggleClass('signup-active');
	$('.signin-active').toggleClass('signin-inactive');
	$('.forgot').toggleClass('forgot-left');
	$(this).removeClass('idle').addClass('active');
}

$(function() {
	$('#RegisterNewUserForm').submit(function(e) {
		e.preventDefault();
		var RegisterNewUserFormData = $('#RegisterNewUserForm').serialize();
		$.ajax({
			type: 'POST',
			url: 'RegisterNewUser',
			data: RegisterNewUserFormData,
			dataType: 'text',
			success: function(data) {
				if (data == 'incorrect_email') $('#email').addClass('incorrect-input');
				else if (data == 'poor_password')
					$('#Info').html('Позаботьтесь о своей безопасности, придумав пароль длинной от шести символов.');
				else if (data == 'user_exists')
					$('#Info').html('Такой email зарегистрирован, хотите <u class="u-enter-toggle" onclick="ToggleBtn(true)">войти<u>?');
				else if (data == 'incorrect_confirm_password') $('#Info').html('Неверный повтор пароля');
				else if (data == 'incorrect_fio') $('#Info').html('Введите ФИО через пробел');
				else if (data == 'true') {
					$('.nav').toggleClass('nav-up');
					$('.form-signup-left').toggleClass('form-signup-down');
					$('.success').toggleClass('success-left');
					$('.frame').toggleClass('frame-short');
				}
			},
			error: function(xhr, str) {
				alert('Возникла ошибка: ' + xhr.responseCode);
			}
		});
	});
});

$('.form-signin').submit(function(e) {
	$('#Message').text('');
	e.preventDefault();
	var SignzinFormData = $('.form-signin').serialize();
	$.ajax({
		type: 'POST',
		url: 'SignIn',
		data: SignzinFormData,
		dataType: 'text',
		success: function(data) {
			if (data == 'pass') $('#password').addClass('incorrect-input');
			else if (data == 'null_user') $('#Message').text('Похоже такого пользователя не существует');
			else if (data == 'Messing credentials') $('#Message').text('Заполните все поля');
			else if (data == 'Please Activate Your Account via Email') $('#Message').text('Активируйте учетную запись через почту.');
			else if (JSON.parse(data).result) SignIn(JSON.parse(data));
		},
		error: function(xhr, str) {
			alert('Возникла ошибка: ' + xhr.responseCode);
		}
	});
});

function SignIn(User) {
	$('.welcome').text('Привет, ' + User.UserName);
	$('.profile-photo').attr('src', User.UserImage);
	$('.btn-animate').toggleClass('btn-animate-grow');
	$('.welcome').toggleClass('welcome-left');
	$('.cover-photo').toggleClass('cover-photo-down');
	$('.frame').toggleClass('frame-short');
	$('.profile-photo').toggleClass('profile-photo-down');
	$('.btn-forward').toggleClass('btn-forward-up');
	$('.forgot').toggleClass('forgot-fade');
	$('.btn-forward').removeClass('btn-hidden');
	WelcomeUrl(User.UserName);
}

function ShowTheDoors() {
	clearInterval(window.WelcomeUrlTimer);
	$('.door').removeClass('door-hidden');
	OpenTheDoors();
}

function OpenTheDoors() {
	$('.content').html('');
	$('.door-right').addClass('door-open-right');
	$('.door-left').addClass('door-open-left');
	LoadPage('home');
}

function LoadPage(pageName) {
	history.pushState({ page: pageName }, '', pageName);
	location.reload();
	//if (pageName)
	// $.ajax({
	//     type: "POST",
	//     url: pageName,
	//     dataType: 'text',
	//     success: function (data) {
	//         displayContent(data);
	//         OpenTheDoors();
	//     },
	//     error: function (xhr, str) {
	//         alert('Возникла ошибка при загрузке страницы: ' + xhr.responseCode);
	//     }
	// });
}

window.onpopstate = function(e) {
	if (e.state) LoadPage(e.state.page);
};

window.WelcomeMessage = 'Добро-пожаловать-в-Teamplay—';
window.WelcomeCounter = 0;

function WelcomeUrl(UserName) {
	if (!window.WelcomeUrlTimer) {
		window.WelcomeMessage += UserName;
		window.WelcomeUrlTimer = setInterval(() => {
			WelcomeUrl();
		}, 100);
	} else if (!window.history.state || window.history.state.message != window.WelcomeMessage) {
		window.history.replaceState(
			{ message: window.WelcomeMessage.substr(0, window.WelcomeCounter) },
			'',
			window.WelcomeMessage.substr(0, window.WelcomeCounter)
		);
		window.WelcomeCounter++;
	} else {
		clearInterval(window.WelcomeUrlTimer);
		window.WelcomeCounter = 0;
	}
}
