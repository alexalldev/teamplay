$(document).ready(function() {
  ClearCategoriesList();
  ClearAnswersList();
  socket.emit("GetVerification");
  socket.emit("GetPrepared");
  socket.emit("GetCanSelect");
  socket.emit("GetPoints");
});

function Verificate(state) {
  if (state) $(".VerificationText").text("Команда верифицирована");
  else $(".VerificationText").text("Заявите о своем присутствии");
  $(".Verification").attr("verified", state == true ? "true" : "false");
}

socket.on("Kick", function(reason) {
  location.href = "/logout?reason=" + reason;
});

socket.on("VerifiedToggle", function(state) {
  Verificate(state);
});

socket.on("ReciveVerification", function(state) {
  Verificate(state);
});

socket.on("Broadcast", function(message) {
  PlaySound("In");
  Swal("Вещание", message, "info");
});

socket.on("PrepareGame", function(GameParams) {
  let { PlayId, SelectionTime, AnswerTime } = GameParams;
  $(".GameName").css("font-size", "0.7rem");
  $(".TeamName").css("font-size", "0.5rem");
  $(".Points").css("display", "block");
  animateCSS(".Points", "slideInRight", function() {});
  animateCSS(".Verification", "slideOutDown", function() {
    $(".Verification").css("display", "none");
  });
  ShowInfo(
    "Подготовка к началу игры",
    [
      "На выбор вопроса предоставляется " + SelectionTime + " с",
      "На ответ предоставляется " + AnswerTime + " с",
      "___",
      "Ваша команда выбирает вопрос " + PlayId + "-ой"
    ],
    true
  );
});

socket.on("StartGame", function() {
  HideInfo();
});

socket.on("SelectQuestion", function(rem) {
  InfoLabel("Выбирайте вопрос");
  HideLoader();
  CreateTimer(rem);
  ClearAnswersList();
  socket.emit("GetCategoriesList"); //Запросить список вопросов
});

socket.on("CantSelectQuestion", function(answering = false) {
  if (!answering) {
    InfoLabel("Ожидаем выбора вопроса ..");
    ShowLoader();
    clearInterval(window.Timer);
    $(".Timer").css("display", "none");
  }
  ClearCategoriesList();
});

socket.on("WaitSelect", function() {
  InfoLabel("Подрждите, ожидаем выбора вопроса ..");
  ShowLoader();
});

socket.on("CantAnswer", function() {
  ClearAnswersList();
});

function ShowInfo(Header, fields, loader = false) {
  $(".InfoTittle").text(Header);
  $(".InfoText").html("");
  fields.forEach(field => {
    $(".InfoText").html(
      $(".InfoText").html() +
        '<tr align="center">\
        <td valign="top">\
          <span class="h2">' +
        field +
        "</span>\
        </td>\
      </tr>"
    );
  });
  $(".Info").attr("show", "true");

  if (loader == true) setTimeout(() => {}, 1000);
  PlaySound("Message");
}

function HideInfo() {
  $(".Info").addClass("Hide");
  setTimeout(() => {
    $(".Info").attr("show", "false");
    $(".Info").removeClass("Hide");
  }, 1000);
}

socket.on("ReciveCategoriesList", async function(Categories) {
  ClearCategoriesList();
  for (var C in Categories) {
    if (Categories[C].Questions) {
      var insertText = "";
      insertText +=
        '<div class="row">\
            <div class="col-md-12 text-center">\
            <span class="h2 CategoryName">' +
        Categories[C].CategoryName +
        '</span>\
            <table class="table table-hover">\
                <tr>';
      Categories[C].Questions = await bubbleSort(Categories[C].Questions);
      for (var Q in Categories[C].Questions) {
        insertText +=
          '<td class="Question-Item" onclick="(SelectQuestion(' +
          Categories[C].Questions[Q].GamePlayQuestionId +
          '))">' +
          Categories[C].Questions[Q].QuestionCost +
          "</td>";
      }
      await $(".CategoriesList").html(
        $(".CategoriesList").html() +
          insertText +
          "</tr>\
            </table>\
            </div>\
        </div>"
      );
    }
  }
});

function bubbleSort(arr) {
  for (var i = 0, endI = arr.length - 1; i < endI; i++) {
    var wasSwap = false;
    for (var j = 0, endJ = endI - i; j < endJ; j++) {
      if (arr[j].QuestionCost > arr[j + 1].QuestionCost) {
        var swap = arr[j];
        arr[j] = arr[j + 1];
        arr[j + 1] = swap;
        wasSwap = true;
      }
    }
    if (!wasSwap) break;
  }
  return arr;
}

function ClearCategoriesList() {
  $(".CategoriesList").html("");
}

function ClearAnswersList() {
  $(".AnswersListContainer").html("");
}

function SelectQuestion(gamePlayQuestionId) {
  socket.emit("TeamSelectQuestion", gamePlayQuestionId);
}

socket.on("StartAnswerQuestion", function(answers, rem) {
  InfoLabel("Выберите один или несколько вариантов ответа");
  HideLoader();
  ClearCategoriesList();
  ClearAnswersList();

  if (answers >= 0) {
    CreateTimer(rem, function() {
      InfoLabel("Ожидаем подтверждения администратора");
      ShowLoader();
      ClearAnswersList();
    });
    LoadAnswer(answers); //answers == QuestionId
  } else if (answers.length > 1) {
    CreateTimer(rem);
    LoadAnswers(answers);
  }
});

async function Answer(questionId) {
  if ($(".Answer").is(".SingleAnswerText")) {
    socket.emit("TeamSingleAnswer", $(".SingleAnswerText").val());
    InfoLabel("Ожидаем подтверждения администратора");
    ShowLoader();
    ClearAnswersList();
  } else {
    var answers = [];
    $(".Answer-" + questionId).each(function(i) {
      answers.push({
        AnswerId: $(this).attr("AnswerId"),
        Value: $(this).prop("checked")
      });
    });
    await socket.emit("TeamAnswer", {
      answers: answers,
      questionId: questionId
    });
  }
}

function AddPoints(count, set = false) {
  $(".AddPoints").css("opacity", 1);
  $(".AddPoints").text(`+${count}`);
  animateCSS(".AddPoints", "slideInUp", function() {
    $(".AddPoints").css("opacity", 0);
    $(".PointsCount").text(
      !set ? Number($(".PointsCount").text()) + count : count
    );
  });
}

socket.on("ReciveCanSelect", function(state) {
  if (state) {
    InfoLabel(
      "Похоже, вы перезагрузили страницу. Выбирайте вопрос, у вас еще есть время."
    );
    socket.emit("GetCategoriesList");
  }
});

function InfoLabel(message) {
  $(".InfoLabel").text(message);
}

function CreateTimer(rem, callback = false) {
  clearInterval(window.Timer);
  $(".TimerText").text(rem / 1000 + " c");
  rem -= 1000;
  $(".Timer").css("display", "block");
  window.remaining = rem;
  window.Timer = setInterval(() => {
    if (window.remaining == 0) {
      clearInterval(window.Timer);
      if (callback != false) {
        callback();
      }
    }
    $(".TimerText").text(window.remaining / 1000 + " c");
    window.remaining -= 1000;
  }, 1000);
}

socket.on("AnswerSaved", function() {
  InfoLabel("Ваш ответ записан. Ожидаем ответов от других команд.");
  ClearAnswersList();
});

socket.on("AddPoints", function(count) {
  AddPoints(count);
});

socket.on("RecivePoints", function(count) {
  AddPoints(count, true);
});

socket.on("StopGame", function(teams) {
  var rating = [];
  for (var team of teams) {
    rating.push(team.Points + " - " + team.TeamName);
  }
  rating.push(
    '<a href="/logout" class="btn btn-outline-info text-white">Готово</a>'
  );
  ShowInfo("Игра завершена", rating);
});

function LoadAnswers(answers) {
  var insertText =
    '<div class="row">\
        <div class="col-md-12 text-center">\
        <form action="javascript:void(null)" onsubmit="Answer(' +
    answers[0].Question_Id +
    ')">\
            <div class="form-group">\
            <table style="width: 100%">';
  for (var answer of answers) {
    insertText +=
      '<tr>\
                    <td><span class="h2">' +
      answer.AnswerText +
      '</span></td>\
                    <td>\
                        <div class="d-flex align-items-center justify-content-center h-1">\
                            <label class="Checkcontainer text-center mb-4 ml-1">\
                                <input type="checkbox" class="Answer-' +
      answer.Question_Id +
      " AnswerCheck-" +
      answer.AnswerId +
      '" AnswerId="' +
      answer.AnswerId +
      '">\
                                <span class="checkmark"></span>\
                            </label>\
                        </div>\
                    </td>\
                </tr>';
  }
  insertText +=
    '</table>\
            </div>\
            <button class="btn AnswerButton">Ответить</button>\
        </form>\
        </div>\
    </div>';
  $(".AnswersListContainer").html(insertText);
}

function LoadAnswer(questionId) {
  $(".AnswersListContainer").html(
    '<div class="row">\
    <div class="col-md-12 text-center">\
        <form action="javascript:void(null)" onsubmit="Answer(' +
      questionId +
      ')">\
            <div class="form-group">\
                <input type="text" class="h2 form-control Answer SingleAnswerText" placeholder="Напишите ответ">\
            </div>\
            <div class="form-group">\
                <button class="btn AnswerButton">Ответить</button>\
            </div>\
        </form>\
    </div>\
  </div>'
  );
}
