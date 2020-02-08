function getTextNotificationType(invitationType) {
  switch (invitationType) {
    case "inviteUser":
      return "Присоединиться?";
    case "joinTeam":
      return "Разрешить присоединиться?";
    default:
      return "";
  }
}

function getNotificationAnswerText(invitationType, answer) {
  switch (invitationType) {
    case "inviteUser":
      return answer == "reject"
        ? { answer: "отклонил", type: "error" }
        : { answer: "принял", type: "success" };
    case "joinTeam":
      return answer == "reject"
        ? { answer: "отклонена", type: "error" }
        : { answer: "принята", type: "success" };
    case "sentBefore":
      return answer == "inviteUser"
        ? { answer: "Вы уже приглашали этого игрока", type: "info" }
        : { answer: "Вы уже подали заявку в эту команду", type: "info" };
  }
}

function action(actionUrl) {
  $.ajax({
    type: "GET",
    url: actionUrl,
    dataType: "json",
    success(notification) {
      if (notification) {
        if (notification.isAnswered) {
          $(`.notification-${notification.notificationId}`)
            .removeClass("notAnswered")
            .addClass("Answered");
          $(`.submitButtons-${notification.notificationId}`).html(
            notification.isInfoNotification
              ? "Прочитано"
              : notification.answer
              ? "Да"
              : "Нет"
          );
        }
      }
    },
    error(xhr, str) {
      alert(`Возникла ошибка: ${xhr.responseCode}`);
    }
  });
}

socket.on("receiveNotification", function(result) {
  if (result !== null) {
    $(".no-new-notifications").empty();
    const { notification } = result.createdNotification;
    if (result.createdNotification.shouldAdd) {
      let submitButtons = "";
      const actionUrl = `${window.location.origin}/${result.notificationActionLink}`;
      if (notification.isInfoNotification) {
        if (notification.isAnswered) {
          submitButtons = "Прочитано";
        } else {
          submitButtons = `<div class="row"><div class="col-md-12 text-center submitButtons submitButtons-${notification.notificationId}"><button class='btn btn-info text-white' onclick='action("${actionUrl}read")'><i class='fa fa-check'></i></button></div></div>`;
        }
      } else if (notification.isAnswered) {
        submitButtons = notification.answer ? "Да" : "Нет";
      } else {
        submitButtons = `<div class="row"><div class="col-md-12 text-center submitButtons submitButtons-${notification.notificationId}"><button class='btn btn-success text-white' onclick='action("${actionUrl}accept")'><i class='fa fa-check'></i></button>
          <button class='btn btn-danger text-white' onclick='action("${actionUrl}reject")'><i class='fa fa-times'></i></button></div></div>`;
      }
      const fromToNotificationPart = `<span class='h6'>
      ${
        notification.teamName !== undefined
          ? `[<a href="/team/${notification.teamName}">${notification.teamName}</a>]`
          : ``
      } <a href="/user/${notification.senderId}">${notification.senderFIO}</a>
      </span>`;

      const fullNotification = `
     <div class="nav-notification ${
       notification.isAnswered ? "Answered" : ""
     } notification-${notification.notificationId}">
     <div class='container'>
     <div class='row'>
     <div class='col-md-12 text-left notification-from-to'>
         ${fromToNotificationPart}
     </div>
 </div>
 <div class='row'>
 <div class='col-md-12 text-left notificationTimestamp'>
 ${notification.textTimestamp.month + 1}/${
        notification.textTimestamp.dayOfMonth
      }/${notification.textTimestamp.year} в ${notification.textTimestamp.time} 
 </div>
</div>
      <div class="user-message card">
      <div class='row'>
      <div class='col-md-12 text-center'>
          <h6 class='notification-header card-title'>${notification.header}</h6>
      </div>
  </div>
  <div class='row'>
   <div class='col-md-12 text-center'>
     <span class='text-dark notification-mainText card-body'>${
       notification.mainText
     }</span>
   </div>
  </div>
      </div>
      <div class="row mt-1 mb-1">
      <div class="col-md-12 text-center">
      ${getTextNotificationType(notification.InvitationType)}
      </div>
      </div>
      <div class="row mt-1 mb-1">
      <div class="col-md-12 text-center">
        ${submitButtons}
      </div>
      </div>
     </div>`;
      if (result.createdNotification.addToStart)
        $(".notifications").prepend(fullNotification);
      else $(".notifications").append(fullNotification);
    } else {
      const { answer, type } = getNotificationAnswerText(
        "sentBefore",
        notification.InvitationType
      );
      Swal.fire("", answer, type);
    }
  } else {
    $(".no-new-notifications").html(
      "<div class='text-center'>Нет новых уведомлений</div>"
    );
  }
});

socket.on("sendAnswer", serverAnswer => {
  let text;
  const { answer, type } = getNotificationAnswerText(
    serverAnswer.InvitationType,
    serverAnswer.answer
  );
  if (serverAnswer.InvitationType) {
    switch (serverAnswer.InvitationType) {
      case "inviteUser":
        text = `Пользователь ${serverAnswer.receiverFullName} ${answer} ваше приглашение в команду.`;
        break;
      case "joinTeam":
        text = `Ваша заявка на вступление в команду "${serverAnswer.teamName}" была ${answer}`;
        break;
    }
    Swal.fire("", text, type);
  }
});

socket.on("sendInfo", message => {
  Swal.fire("", message, "info");
});
