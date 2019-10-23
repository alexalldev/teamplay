$(document).ready(function() {
  socket.emit("getCreatorStatus");
  socket.emit("getRoomPlayers");
  $(".btnRemoveRoom").click(function() {
    let roomId = $(this).attr("roomId");
    Swal({
      title: "Удаление комнаты",
      text: "Удалить комнату?",
      type: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#6699FF",
      confirmButtonText: "Yes"
    }).then(result => {
      if (result.value) {
        socket.emit("deleteRoom", roomId);
      }
    });
  });

  $(".btnStartGame").click(async () => {
    const roomId = $(".btnStartGame").attr("roomId");
    let current = 3;

    socket.emit("getCanStartGame");

    function PrepareGameTimer() {
      socket.emit("GamePreparation", current);
      $(".startGameFrom").html(`Начало игры через ${current} c.`);
      if (current < 1) {
        socket.emit("gameStarted", roomId);
        $(".cancelRow").remove();
        $(".btnStartGame").remove();
        clearInterval(window.PrepareGameTimer);
      }
      current--;
    }

    function StartPreparation() {
      $(".roomActions").after(`
      <div class="row cancelRow">
        <div class="col-md-12 text-center mb-2">
        <label class="h5">Отмена</label>
        <button
          class="btn btn-warning btnStartGame mr-3"
          onclick="cancelGame(${roomId})">
          <i class="fas fa-ban"></i>
        </button>
        <span class="h4 startGameFrom"></span>
        </div>
      </div>`);
      PrepareGameTimer();
      window.PrepareGameTimer = setInterval(PrepareGameTimer, 1000);
    }

    socket.on("receiveCanStartGame", function(message) {
      switch (message) {
        case "true":
          StartPreparation();
          break;
        case "noTeams":
          Swal.fire(
            "В комнате нет ни одной команды",
            "Сейчас вы не можете начать игру",
            "warning"
          );
          break;
        case "teamsNotReady":
          Swal.fire({
            title: "Не все команды еще готовы!",
            text: "Вы уверены, что хотите начать игру?",
            type: "warning",
            showCancelButton: true,
            confirmButtonColor: "#3085d6",
            cancelButtonColor: "#d33",
            confirmButtonText: "Да"
          }).then(result => {
            if (result.value) {
              StartPreparation();
            }
          });
          break;
      }
    });
  });

  $(".btnGroupReady").click(() => {
    // TODO: удалить кнопку при ответном сокете
    socket.emit("GroupReadyClick");
  });
});

function CreateGroup(player) {
  $(".group-list").append(
    `<div class="group group-${player.TeamId} col-md-4 mr-1 mb-1" TeamId="${player.TeamId}">
        <span class="h4">${player.TeamName}</span>  
        <span class="team-readyState" ReadyState="" style="visibility: hidden">•</span>
        <div class="group-players group-players-${player.TeamId}">
        </div>
    </div>`
  );
  socket.emit("getGroupStatus", player);
}
//  Надо передать сюда результаты: команды и их тимпоинты
socket.on("end game", () => {
  $("body").append("this game ended");
});

socket.on(
  "BreakBetweenQuestions",
  (correctAnswers, teamNamesPoints, userTeamNamePoints, addedPoints) => {
    $(".answers-form").empty();
    $(".answers-form").append(
      `<div class="row">
        <div class="col-md-12 text-center mb-2">
        ${
          addedPoints
            ? `Вы ответили верно +${addedPoints}`
            : "Вы ответили неверно"
        }
        </div>
      </div>
      <div class="row">
      <div class="col-md-12 text-center mb-2">
    ${
      correctAnswers.length > 1 ? "Правильные ответы" : "Правильный ответ"
    }: ${correctAnswers
        .map(correctAnswer => correctAnswer.AnswerText)
        .join("; ")}
      </div>
    </div>`
    );
    for (const teamNamePoints of teamNamesPoints) {
      $(".answers-form").append(
        `<div class="row">
        <div class="col-md-12 text-center mb-2">
          ${teamNamePoints.TeamName} - ${teamNamePoints.Points} ${
          teamNamePoints.Team_Id == userTeamNamePoints.Team_Id
            ? ` (Ваша команда)`
            : ``
        }
        </div>
      </div>`
      );
    }
  }
);

socket.on(
  "sendQuestion",
  (question, answers, type, isRoomCreator, categoryName) => {
    let answerTime = question.AnswerTime;

    $(".QuestionArea").html(
      `<div class="row"><div class="col-md-12 text-center mb-2 CategoryName">${categoryName}</div></div> 
    ${question.QuestionText}
    ${
      question.QuestionImagePath
        ? `<div class="row"><div class="col-md-12 text-center mb-2 QuestionImage"><img src="http://localhost/QuestionImage?QuestionId=${question.QuestionId} alt=""></div></div>}`
        : ``
    }
  `
    );
    $(".answers-form").empty();
    for (const answer of answers) {
      $(".answers-form").append(
        `<div class="row">
      <div class="col-md-12 text-center mb-2">
      ${
        isRoomCreator
          ? `Правильный ответ: <span>${answer.AnswerText}</span>`
          : `${
              type == "checkbox"
                ? `<button answerId="${answer.AnswerId}" class="alert alert-info answer answer-${answer.AnswerId}" onclick="chooseAnswer('answer-${answer.AnswerId}')">
          ${answer.AnswerText}
         </button>
         <div class="col-md-12 text-center mb-2 whoAnswered-answer-${answer.AnswerId}">
         `
                : `<input type="text" answerId="${answer.AnswerId}" class="form-control text-left answer">`
            }
            `
      }

      </div>
      </div>`
      );
    }
  }
);

async function chooseAnswer(elemClass) {
  let offerAnswerIds = [];
  if ($(`.${elemClass}`).hasClass("alert-info")) {
    $(`.${elemClass}`)
      .removeClass("alert-info")
      .addClass(`alert-primary chosen-answer`);
  } else if ($(`.${elemClass}`).hasClass("alert-primary")) {
    $(`.${elemClass}`)
      .removeClass(`alert-primary chosen-answer`)
      .addClass("alert-info");
  }
  await $(".chosen-answer").each(function(i) {
    offerAnswerIds.push($(this).attr("answerId"));
  });
  socket.emit("writeOffers", offerAnswerIds);
}

socket.on("sendOffersChanges", async usersFioOffers => {
  //TODO: при определенном большом количестве пользователей не делать append
  // и после последнего такого пользователя выводить три точки, и добавить
  //подсказку для этого блока при наведению на которую будут показываться все пользователи

  // Очищаем все
  await $("[answerid]").each(function(index) {
    $(this).val("");
  });

  // Добавляем все новые
  for (const user of usersFioOffers) {
    for (const offer of user.Offers) {
      $(`.whoAnswered-answer-${offer}`).append(`${user.UserFIO}`);
    }
  }
});

socket.on("sendGroupStatus", (teamId, status) => {
  $(`.group-${teamId} > .team-readyState`).removeAttr("style");
  $(`.group-${teamId} > .team-readyState`).attr("ReadyState", !!status);
});

async function isTeamInRoom(player) {
  let result = false;
  await $(".group").each(function(i) {
    if ($(this).attr("TeamId") == player.TeamId) {
      result = true;
      // to stop loop
      return false;
    }
  });
  return result;
}

function AddPlayerToGroup(player) {
  $(`.group-players-${player.TeamId}`).append(
    `<div class="row Player Player-${player.RoomPlayersId} mt-2 mb-2 ">	
		<div class="col-md-12 text-left">
            <img class="user_organizer" src="/public/user-icon.png" alt="">
            <span style="font-size: 30px; position:relative; top: 5%"> ${
              player.UserFamily
            } ${player.UserName.slice(0, 1)}.${player.UserLastName.slice(
      0,
      1
    )}    .</span>
          <span class="isGroupCoach-${player.RoomPlayersId}">${
      player.isGroupCoach
        ? '<span style="position: absolute; left:90%; bottom:30%"><i class="fas fa-star text-warning"></i></span>'
        : ""
    }
        </div>
    </div>`
  );
}

async function AddPlayer(player) {
  if (!(await isTeamInRoom(player))) CreateGroup(player);
  AddPlayerToGroup(player);
}

socket.on("GroupReady", (status, teamId) => {
  $(`.group-${teamId} > .team-readyState`).attr("ReadyState", status);
});

socket.on("MyGroupReadyState", function(status) {
  if (status) {
    $(".btnGroupReady")
      .removeClass("btn-success")
      .addClass("btn-danger")
      .html(
        `<i class="far fa-times-circle pr-1"></i>
      <span>Отмена</span>`
      );
  } else {
    $(".btnGroupReady")
      .removeClass("btn-danger")
      .addClass("btn-success").html(`<i class="far fa-check-circle pr-1"></i>
    <span>Команда готова!</span>
      </div>`);
  }
});

socket.on("GamePreparationTick", current => {
  $(".GamePreparationTimer").remove();
  $("body").append(`<div class="GamePreparationTimer"></div>`);
  $(".GamePreparationTimer").html(`Игра начнется через ${current} с.`);
  if (current == 0) {
    $(".btnGroupReady").remove();
    $(".GamePreparationTimer").remove();
  }
});

socket.on("StopGamePreparationTick", () => {
  clearInterval(window.PrepareGameTimer);
  $(".btnGroupReady").remove();
  $(".GamePreparationTimer").remove();
});

socket.on("RecieveCreatorStatus", function(status) {
  $(".organizer-connection").attr("connection", status);
  $(".organizer-connection").attr(
    "title",
    status ? "Организатор в сети" : "Организатор не в сети"
  );
});

socket.on("roomDeleted", function(status) {
  if (status) location.href = "/leaveRoom";
  else Swal.fire("Ошибка", status, "warning");
});

socket.on("sendRoomPlayers", async function(players) {
  for await (player of players) {
    await AddPlayer(player);
  }
});

socket.on("AddUserToRoom", function(player) {
  AddPlayer(player);
});

socket.on("RoomPlayerLeaved", function(RoomPlayerId) {
  $(`.Player-${RoomPlayerId}`).remove();
});

socket.on("RoomGroupRemoved", function(TeamId) {
  $(`.group-${TeamId}`).remove();
});

socket.on("NewRoomGroupCoach", function(roomPlayer) {
  $(`.isGroupCoach-${roomPlayer.RoomPlayersId}`).html("");
  $(`.isGroupCoach-${roomPlayer.RoomPlayersId}`).html(
    '<span style="position: absolute; left:90%; bottom:30%"><i class="fas fa-star text-warning"></i></span>'
  );
});

function cancelGame(roomId) {
  $(".cancelRow").remove();
  socket.emit("StopGamePreparation");
}
