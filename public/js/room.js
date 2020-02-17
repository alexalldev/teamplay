$(document).ready(function() {
  socket.emit("getCreatorStatus");
  socket.emit("getRoomPlayers");
  $(".btnRemoveRoom").click(function() {
    const roomId = $(this).attr("roomId");
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
        $(".group-list").remove();
        $(".roomActions").empty()
          .append(`<button class="btn btn-danger btnFinishGame" onclick="FinishGame()" roomId="<%= room.RoomId %>">
          <i class="fas fa-ban mr-1"></i><span class="h5">Завершить игру</span>
        </button>`);
        clearInterval(window.PrepareGameTimer);
      }
      current--;
    }

    function StartPreparation() {
      if (!window.PrepareGameTimer) {
        $(".roomActions").append(`
        <div class="row cancelRow">
          <div class="col-md-12 text-center mb-2">
          <span class="h4 startGameFrom"></span>
          </div>
        </div>`);
        PrepareGameTimer();
        window.PrepareGameTimer = setInterval(PrepareGameTimer, 1000);
      }
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

function AddPoints(count, userTeamNamePoints, set = false) {
  $(".AddPoints").css("opacity", 1);
  // для тех, кто зашел во время игры
  $(".PointsCount").text(`${userTeamNamePoints.Points - count}`);
  $(".AddPoints").text(`+${count}`);
  animateCSS(".AddPoints", "slideInUp", function() {
    $(".AddPoints").css("opacity", 0);
    $(".PointsCount").text(
      !set ? Number($(".PointsCount").text()) + count : count
    );
  });
}

function ClearRating() {
  $(".table-hover").empty();
  $(".table-teams-rating").fadeTo("slow", 0, function() {
    $(".table-teams-rating").html("");
    $(".table-teams-rating").css("opacity", 1);
  });
}

function SelectTeam(teamId) {
  $(".row-team").each(function(i) {
    $(this).removeClass("table-success");
  });
  $(`.row-team-${teamId}`).addClass("table-success");
  console.log($(`.row-team-${teamId}`));
}
function AddRowTeam(team) {
  $(".table-teams-rating").append(
    `<tr class="row-team row-team-${team.TeamId}" teamId="${team.TeamId}">
      <td>${team.TeamName}</td>
      <td>${team.Points}</td>
  </tr>`
  );
}

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

socket.on(
  "BreakBetweenQuestions",
  (teamNamesPoints, userTeamNamePoints, addedPoints, isRoomCreator) => {
    $(".animated_timer_value").empty();
    $(".answers-form").empty();
    ClearRating();
    $(".table-hover").append(`<thead>
    <th>
      Команда
    </th>
    <th>
      Очки
    </th>
  </thead>
  <tbody class="table-teams-rating"></tbody>`);
    for (const teamNamePoints of teamNamesPoints) {
      AddRowTeam(teamNamePoints);
    }
    if (!isRoomCreator) {
      $(".answers-form").append(
        `<div class="row">
          <div class="col-md-12 text-center mb-2">
          ${addedPoints ? "ВЕРНО" : "НЕВЕРНО"}
          </div>
        </div>`
      );
      if (addedPoints) {
        AddPoints(addedPoints, userTeamNamePoints);
      }
      console.log("do select team");
      SelectTeam(userTeamNamePoints.TeamId);
    }
  }
);

socket.on(
  "sendQuestion",
  (question, answers, type, isRoomCreator, categoryName) => {
    $(".animated_timer")
      .html(`<h2 class="animated_timer_value">${question.AnswerTime}</h2>
    <svg width="80" height="80" xmlns="http://www.w3.org/2000/svg">
      <g>
        <title>Layer 1</title>
        <circle id="circle" class="circle_animation" r="25" cy="40" cx="40" stroke-width="5" stroke="#6fdb6f"
          fill="none" />
      </g>
    </svg>`);
    startTimer(question.AnswerTime - 1);
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
    ClearRating();
    $(".answers-form").empty();
    for (const answer of answers) {
      $(".answers-form").append(
        `<div class="row">
      <div class="col-md-12 text-center mb-2 answer answer-${answer.AnswerId}">
      ${
        isRoomCreator
          ? `Правильный ответ: ${answer.AnswerText}`
          : `${
              type == "checkbox"
                ? `<button answerId="${answer.AnswerId}" class="alert alert-info answerButton" onclick="chooseAnswer('answer-${answer.AnswerId}')">
                ${answer.AnswerText}
                </button>
         <div class="col-md-12 text-center mb-2 whoAnswered"></div>
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

async function chooseAnswer(answerIdClass) {
  const offerAnswerIds = [];
  const answerButton = $(`.${answerIdClass} > .answerButton`);
  if (answerButton.hasClass("alert-info")) {
    answerButton
      .removeClass("alert-info")
      .addClass(`alert-primary chosen-answer`);
  } else if (answerButton.hasClass("alert-primary")) {
    answerButton
      .removeClass(`alert-primary chosen-answer`)
      .addClass("alert-info");
  }

  await $(".chosen-answer").each(function(i) {
    offerAnswerIds.push($(this).attr("answerId"));
  });
  socket.emit("writeOffers", offerAnswerIds);
}

socket.on("sendOffersChanges", offersUsersFIOs => {
  // TODO: при определенном большом количестве пользователей не делать append
  // и после последнего такого пользователя выводить три точки, и добавить
  // подсказку для этого блока при наведению на которую будут показываться все пользователи

  // Очищаем все
  $(".whoAnswered").each(function(index) {
    $(this).empty();
  });
  // Добавляем все новые
  for (const offerUserFIO of offersUsersFIOs) {
    $(`.answer-${offerUserFIO.Answer_Id} > .whoAnswered`).append(
      `${offerUserFIO.UserFIO}`
    );
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
    )}.</span>
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
  Swal.fire("", `Игра начинается через ${current}`, "success");
  if (current < 1) {
    Swal.close();
    $(".group-list").remove();
    $(".btnGroupReady").remove();
    $(".GamePreparationTimer").remove();
  }
});

socket.on("sendTeamPoints", points => {
  $(".PointsCount").html(points);
  $(".points-ticket").html('<i class="fas fa-ticket-alt"></i>');
});

socket.on("RecieveCreatorStatus", function(status) {
  $(".organizer-connection").attr("connection", status);
  $(".organizer-connection").attr(
    "title",
    status ? "Организатор в сети" : "Организатор не в сети"
  );
});

socket.on("roomDeleted", function(status) {
  if (status) location.href = "/";
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

socket.on("GameFinished", () => {
  $(".animated_timer").empty();
  Swal.fire("Игра завершена", "Спасибо за участие", "success").then(result => {
    document.location.reload(true);
  });
});

function FinishGame() {
  socket.emit("FinishGame");
}
