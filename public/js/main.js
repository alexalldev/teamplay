const socket = io();
$(document).ready(function () { });

socket.on('receiveNotification', function (notification) {
	var submitBtns = '';
	if (notification.isInfoNotification) {
		submitBtns =
			"<button class='btn btn-info text-white' onclick=\"action('" +
			notification.actionUrl +
			"', 'read')\"><i class='fa fa-check'></i></button>";
	} else {
		submitBtns =
			"<button class='btn btn-success text-white' onclick=\"action('" +
			notification.actionUrl +
			"', 'accept', " +
			notification.senderId +
			", " +
			notification.receiverId +
			", \'" +
			notification.InvitationType +
			"\')\"><i class='fa fa-check'></i></button><button class='btn btn-danger text-white' onclick=\"action('" +
			notification.actionUrl +
			"', 'reject', " +
			notification.senderId +
			", " +
			notification.receiverId +
			", \'" +
			notification.InvitationType +
			'\')\"><i class=\'fa fa-times\'></i></button>';
	}
	var page =
		"<span class='h1 notification-header'>" +
		notification.header +
		"</span><span class='h3 notification-mainText'>" +
		notification.mainText +
		"</span><span class='h6 notification-from-to'>" +
		'from:' +
		notification.senderId +
		': to:' +
		notification.receiverId +
		'</span>' +
		submitBtns;
	$('body').append(page);
});

socket.on('sendAnswer', (serverAnswer) => {
	let text;
	let answer = getAnswer(serverAnswer.InvitationType, serverAnswer.answer);
	console.log('serverAnswer');
	console.log(serverAnswer.answer)
	console.log('answer');
	console.log(answer);
	console.log('serverAnswer.InvitationType');
	console.log(serverAnswer.InvitationType);
	console.log('serverAnswer');
	console.log(serverAnswer);
	console.log(serverAnswer.InvitationType == 'inviteTeam');
	if (serverAnswer.InvitationType == 'inviteTeam') {
		text =
			'Уважаемый ' +
			serverAnswer.senderFullName.join(' ') +
			', пользователь ' +
			serverAnswer.receiverFullName.join(' ') +
			' ' +
			answer +
			' ваше приглашение.'
		console.log(text);
	} else if (serverAnswer.InvitationType == 'joinTeam') {
		text =
			'Ваша заявка на вступление в команду была ' +
			answer +
			' пользователем ' +
			serverAnswer.receiverFullName.join(' ');
	}
	page = "<span class='h1'>" + text + '</span>';
	console.log('answerPage');
	console.log(text);
	console.log(page);
	$('body').append(page);
});

function action(actionUrl, answer, senderId, receiverId, InvitationType) {
	$.ajax({
		type: 'POST',
		url: actionUrl,
		data: {
			answer: answer,
			senderId: senderId,
			receiverId: receiverId,
			InvitationType: InvitationType
		},
		dataType: 'text',
		success: function (data) {
			console.log(data);
		},
		error: function (xhr, str) {
			alert('Возникла ошибка: ' + xhr.responseCode);
		}
	});
}

function getAnswer(InvitationType, answer) {
	if (InvitationType == 'inviteTeam') {
		if (answer == 'reject') {
			return 'отклонил';
		} else if (answer == 'accept') {
			return 'принял';
		}
	} else if (InvitationType == 'joinTeam') {
		if (answer == 'reject') {
			return 'отклонена';
		} else if (answer == 'accept') {
			return 'принята';
		}
	}
}
