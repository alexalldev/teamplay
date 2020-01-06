$(".btnUserResults").click(() => {
  const ptrn = /user\/\d$/i;
  userUrl = ptrn.exec(window.location.href)[0];
  socket.emit("GetUserResults", userUrl[userUrl.length - 1]);
});

socket.on("SendUserResults", gameResults => {
  $.each(gameResults, (i, vi) => {
    $(".GameResult").append(`
    <div class="row alert alert-info" data-toggle="collapse"
      data-target="#GameCollapse-${i}" style="cursor: pointer">
        <div class="col-md-12">
          <span>${vi.GameName} ${vi.Timestamp}</span>
        </div>
    </div>`);
    $(`[data-target="#GameCollapse-${i}"]`).after(`
    <div class="row collapse" id="GameCollapse-${i}">
      <div class="col-md-12">
        <table class="table table-hover userResultsTable-${i}">
            <thead>
                <th>Текст вопроса</th>
                <th>Верно/Неверно</th>
            </thead>
        </table>
      </div>
    </div>
    `);

    $.each(vi.questions, (j, vj) => {
      $(`.userResultsTable-${i}`).append(`                
      <tr>
      <th>
          <div class="row" data-toggle="collapse" data-target="#QuestionCollapse-${i}-${j}" style="cursor: pointer">
              <div class="col-md-12">
                  <span>${vj.questionText}</span>
                  <div class="row collapse" id="QuestionCollapse-${i}-${j}">
                      <div class="col-md-12">
                          <table class="table table-hover">
                              <thead class="userQuestionsTable-${i}-${j}">
                                  <th>Текст ответа</th>
                                  <th>Верно/Неверно</th>
                              </thead>
                          </table>
                      </div>
                  </div>
              </div>
          </div>
      </th>
      <th>
        <span>${vj.isAnsweredCorrectly == true ? "✓" : "☓"}</span>
      </th>
  </tr>
`);

      $.each(vj.answers, (k, vk) => {
        $(`.userQuestionsTable-${i}-${j}`).after(`
          <tr>
            <th>
              ${vk.answerText}
            </th>
            <th>
             ${vk.isCorrect}
            </th>
          </tr>
      `);
      });
    });
  });
});
