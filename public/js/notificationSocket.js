const socket = io();

socket.on("receiveNotification", function (result) {
	let submitBtns;
	let notification = result.createdNotification;
	let actionUrl = result.actionUrl;
	console.log(notification)
	console.log(actionUrl);
	if (notification.isInfoNotification) {
		submitBtns = `<button class='btn btn-info text-white' onclick='action("${notification.InvitationHash}", "read", "${actionUrl}")'><i class=\"fa fa-check\"></i></button>`;
	} else {
		submitBtns = `<button class='btn btn-success text-white' onclick='action("${notification.InvitationHash}", "accept", "${actionUrl}")'><i class='fa fa-check'></i></button>
			<button class='btn btn-danger text-white' onclick='action("${notification.InvitationHash}", "reject", "${actionUrl}")'><i class='fa fa-times'></i></button>`;
	}
	var page = `<span class='h1 notification-header'>${notification.header}</span><span class='h3 notification-mainText'>
		${notification.mainText}</span><span class='h6 notification-from-to'>
		from: ${notification.senderId} to: ${notification.receiverId}</span>${submitBtns}`;
	$("body").append(page);
});

socket.on("sendAnswer", serverAnswer => {
	let text;
	console.log('sendAnswer');
	console.log(serverAnswer.answer)
	let answer = getAnswer(serverAnswer.InvitationType, serverAnswer.answer);
	console.log(serverAnswer);
	if (serverAnswer.InvitationType) {
		switch (serverAnswer.InvitationType) {
			case "inviteTeam":
				text = `Уважаемый ${serverAnswer.senderFullName.join()}, пользователь ${serverAnswer.receiverFullName.join()} 
			${answer} ваше приглашение.`;
				console.log(text);
				break;
			case "joinTeam":
				text = `Ваша заявка на вступление в команду была ${answer} пользователем ${serverAnswer.receiverFullName.join()}`;
				break;
		}

		page = "<span class='h1'>" + text + "</span>";
		console.log("answerPage");
		console.log(text);
		console.log(page);
		$("body").append(page);
	} else {
		//для теста
		console.log('notification read')
	}
});

function action(InvitationHash, answer, actionUrl) {
	$.ajax({
		type: "POST",
		url: actionUrl,
		data: {
			answer: answer,
			InvitationHash: InvitationHash
		},
		dataType: "text",
		success: function (data) {
			console.log('data')
			console.log(data);
		},
		error: function (xhr, str) {
			alert("Возникла ошибка: " + xhr.responseCode);
		}
	});
}

function getAnswer(InvitationType, answer) {
	if (InvitationType == "inviteTeam") {
		if (answer == "reject") {
			return "отклонил";
		} else if (answer == "accept") {
			return "принял";
		}
	} else if (InvitationType == "joinTeam") {
		if (answer == "reject") {
			return "отклонена";
		} else if (answer == "accept") {
			return "принята";
		}
	}
}
