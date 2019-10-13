socket.on("receiveNotification", function(result) {
  let notification = result.createdNotification.notification;
  if (result.createdNotification.shouldAdd) {
    let submitBtns;
    let actionUrl = result.actionUrl;
    if (notification.isInfoNotification) {
      submitBtns = `<div class="row"><div class="col-md-12 text-center"><button class='btn btn-info text-white' onclick='action("${actionUrl}read")'><i class='fa fa-check'></i></button></div></div>`;
    } else {
      submitBtns = `<div class="row"><div class="col-md-12 text-center"><button class='btn btn-success text-white' onclick='action("${actionUrl}accept")'><i class='fa fa-check'></i></button>
			<button class='btn btn-danger text-white' onclick='action("${actionUrl}reject")'><i class='fa fa-times'></i></button></div></div>`;
    }
    let notificationBlock = `<span class='h6 notification-from-to'>
	От: ${
    notification.userTeam && notification.userTeam != 0
      ? `[${notification.userTeam}]`
      : ``
  } ${notification.senderFIO} </span>${submitBtns}`;
    let ringNotification = `
	 <div class="nav-notification">
        <div class='container'>
            <div class='row'>
                <div class='col-md-12 text-center'>
                    <span class='h6 notification-header'>${notification.header}</span>
                </div>
            </div>
			<div class='col-md-12 text-center'>
                    <span class='text-dark notification-mainText'>${notification.mainText}</span>
            <div class='row'>
                </div>
			</div>
			 <div class='row'>
				 <div class='col-md-12 text-center'>
					${notificationBlock}
				</div>
			</div>
		</div>
	</div>`;
    if (result.createdNotification.addToStart)
      $(".notifications-menu").prepend(ringNotification);
    else $(".notifications-menu").append(ringNotification);
  } else {
    let answer = getAnswer("sentBefore", notification.InvitationType);
    Swal.fire("", answer, "info");
  }
});

socket.on("sendAnswer", serverAnswer => {
  let text;
  let answer = getAnswer(serverAnswer.InvitationType, serverAnswer.answer);
  if (serverAnswer.InvitationType) {
    switch (serverAnswer.InvitationType) {
      case "inviteTeam":
        text = `Уважаемый ${serverAnswer.senderFullName.join(
          " "
        )}, пользователь ${serverAnswer.receiverFullName.join(" ")} 
				${answer} ваше приглашение.`;
        type = "success";
        break;
      case "joinTeam":
        text = `Ваша заявка на вступление в команду была ${answer} пользователем ${serverAnswer.senderFullName.join(
          " "
        )}`;
        type = "error";
        break;
    }
    Swal.fire("", text, "info");
  } else {
    //для теста
    console.log("notification read");
  }
});

function action(actionUrl) {
  $.ajax({
    type: "GET",
    url: actionUrl,
    dataType: "text",
    success: function(data) {
      console.log(data);
    },
    error: function(xhr, str) {
      alert("Возникла ошибка: " + xhr.responseCode);
    }
  });
}

function getAnswer(InvitationType, answer) {
  switch (InvitationType) {
    case "inviteTeam":
      return answer == "reject" ? "отклонил" : "принял";
    case "joinTeam":
      return answer == "reject" ? "отклонена" : "принята";
    case "sentBefore":
      return answer == "inviteTeam"
        ? "Вы уже приглашали этого игрока"
        : "Вы уже подали заявку в эту команду";
  }
}
