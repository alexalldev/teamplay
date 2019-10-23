$(document).ready(function() {
  Load.Categories();

  $("#SelectionTime").on("input", function() {
    SetGameTime(1, $(this).val());
  });
  $("#CreateCategoryForm").submit(function(e) {
    e.preventDefault();
    $.ajax({
      type: "POST",
      url: "CreateCategory",
      data: { CategoryName: $("#CategoryName").val() },
      dataType: "text",
      success(data) {
        const res = JSON.parse(data);
        if (res.CategoryId) {
          AddCategory(res);
        }
        $("#CategoryName").val("");
      },
      error(xhr, str) {
        alert(`Возникла ошибка: ${xhr.responseCode}`);
        $("#CategoryName").val("");
      }
    });
  });
  $(".CreateQuestionForm").submit(function(e) {
    e.preventDefault();
    const dataArray = $(".CreateQuestionForm").serializeArray();

    const data = new FormData();
    data.append("Category_Id", dataArray[0].value);
    data.append("QuestionText", dataArray[1].value);
    data.append("QuestionCost", dataArray[2].value);
    data.append("AnswerTime", dataArray[3].value);
    data.append("QuestionImage", $("#QuestionImage")[0].files[0]);

    $.ajax({
      type: "POST",
      url: "CreateQuestion",
      data,
      cache: false,
      contentType: false,
      processData: false,
      success(data) {
        if (data != "null") {
          if (data == "incorrect_format")
            Swal("Ошибка", "Неверный формат изображения", "error");
          else if (data == "incorrect_size")
            Swal("Ошибка", "Слишком большое изображение", "error");
          else {
            const res = JSON.parse(data);
            if (res.name)
              Swal("Ошибка", `Данные не были получены: ${res.name}`, "error");
            else {
              AddQuestion(res);
            }
          }
        }
        $("#QuestionText").val("");
        $("#QuestionCost").val("");
        $("#AnswerTime").val("");
        $("#QuestionImage").val("");
      },
      error(xhr, str) {
        alert(`Возникла ошибка: ${xhr.responseCode}`);
        $("#QuestionText").val("");
        $("#QuestionCost").val("");
        $("#QuestionImage").val("");
      }
    });
  });

  $(".Edit_Form").submit(function(e) {
    e.preventDefault();

    const type = $(".EditContainer").attr("type");
    const id = $(".EditContainer").attr("id");
    if (type == 1) {
      const CategoryName = $(".EditCategoryName").val();
      $.ajax({
        type: "POST",
        url: "UpdateCategory",
        data: {
          CategoryId: id,
          CategoryName
        },
        dataType: "text",
        success(data) {
          if (data != "true") Swal("Ошибка", data, "error");
          else {
            $(`.CategoryName-${id}`).text(CategoryName);
            $(`.Category-${id}`).attr("categoryname", CategoryName);
            $("#EditModal").modal("hide");
          }
        },
        error(xhr, str) {
          alert(`Возникла ошибка: ${xhr.responseCode}`);
        }
      });
    }
    if (type == 2) {
      const data = new FormData();

      data.append("QuestionId", id);
      data.append("QuestionText", $(".EditQuestionText").val());
      data.append("QuestionCost", $(".EditQuestionCost").val());
      data.append("QuestionImage", $(".EditQuestionImage")[0].files[0]);

      $.ajax({
        type: "POST",
        url: "UpdateQuestion",
        data,
        cache: false,
        contentType: false,
        processData: false,
        success(data) {
          if (data != "true") Swal("Ошибка", data, "error");
          else {
            if ($(".EditQuestionImage")[0].files[0]) {
              $(`.QuestionImage-${id}`).attr("src", null);
              $(`.QuestionImage-${id}`).attr(
                "src",
                `${location.protocol}//${location.host}/QuestionImage?QuestionId=${id}`
              );
            }
            $(`.QuestionText-${id}`).text($(".EditQuestionText").val());
            $(`.QuestionCost-${id}`).text($(".EditQuestionCost").val());
            $(`.Question-${id}`).attr(
              "questiontext",
              $(".EditQuestionText").val()
            );
            $(`.Question-${id}`).attr(
              "questioncost",
              $(".EditQuestionCost").val()
            );

            $("#EditModal").modal("hide");
          }
        },
        error(xhr, str) {
          alert(`Возникла ошибка: ${xhr.responseCode}`);
        }
      });
    }
  });

  $(".btnRemoveGame").click(function() {
    Swal({
      title: "Удаление викторины",
      text: "Удалить викторину?",
      type: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#6699FF",
      confirmButtonText: "Yes"
    }).then(result => {
      if (result.value) {
        socket.emit("RemoveGame", $(this).attr("gameId"));
      }
    });
  });
});

socket.on("GameRemoved", function(GameId) {
  location.href = "/";
});

function SetGameTime(type, time) {
  $.ajax({
    type: "POST",
    url: "SetGameTime",
    data: { time, type },
    dataType: "text",
    success(data) {
      $(".Time_info_label").text("");
      if (data != "true")
        if (data == "min_time")
          $(".Time_info_label").text("Минимальное время 5 секунд.");
    },
    error(xhr, str) {
      alert(`Возникла ошибка: ${xhr.responseCode}`);
    }
  });
}

function CreateAnswer(questionId) {
  $.ajax({
    type: "POST",
    url: "CreateAnswer",
    data: {
      QuestionId: questionId
    },
    dataType: "text",
    success(data) {
      if (data !== null) {
        const res = JSON.parse(data);
        if (res.name)
          Swal("Ошибка", `Данные не были получены: ${res.name}`, "error");
        else {
          AddAnswer(res);
        }
      }
    },
    error(xhr, str) {
      alert(`Возникла ошибка: ${xhr.responseCode}`);
    }
  });
}

function OpenCreateQuestionModal() {
  // Загрузить список категорий в CreateQuestionModal
  $(".CreateQuestionCategoriesList").html("");
  $(".Category").each(function(i) {
    $(".CreateQuestionCategoriesList").append(
      `<option value="${$(this).attr("categoryid")}">${$(this).attr(
        "categoryname"
      )}</option>`
    );
  });
  $("#CreateQuestionModal").modal();
}

function AddCategory(category) {
  // Добавить блок категории
  $(".CategoriesList").html(
    `${$(
      ".CategoriesList"
    ).html()}<div class="col-md-12 text-center CategoryContainer-${
      category.CategoryId
    }">\
                    <div class="alert alert-info text-center Category mt-2 Category-${
                      category.CategoryId
                    }"  onclick="OpenCategory(${
      category.CategoryId
    })" categoryid="${category.CategoryId}" categoryname="${
      category.CategoryName
    }">\
                    <table style="width: 100%">\
                        <tr>\
                            <td align="left">\
                            <i class="fa fa-trash fa-2x text-secondary" onclick="RemoveCategory(${
                              category.CategoryId
                            })"></i>\
                            <i class="fa fa-edit fa-2x text-secondary" onclick="Edit(1, ${
                              category.CategoryId
                            })"></i>\
                            </td>\
                            <td align="right"><span class="h5">Category: </span><span class="h2 CategoryName-${
                              category.CategoryId
                            }"> ${category.CategoryName}</span></td>\
                        </tr>\
                    </table>\
                    </div>\
                  </div>`
  );
  animateCSS(`.Category-${category.CategoryId}`, "fadeIn", function() {
    $(`.Category-${category.CategoryId}`).removeClass("New");
  });
  $("#CreateCategoryModal").modal("hide");
}

function AddQuestion(question) {
  // Добавить блок вопроса в нужную категорию
  $(`.QuestionsList-${question.Category_Id}`).append(
    `\
    <div class="QuestionsContainer-${question.QuestionId}">\
        <div class="alert alert-secondary text-center Question Question-${
          question.QuestionId
        }" onclick="OpenQuestion(${question.QuestionId})" ImgSrc="${
      question.QuestionImage ? question.QuestionImage : "/QuestionImage"
    }" QuestionText="${question.QuestionText}" QuestionCost="${
      question.QuestionCost
    }">\
        <table style="width: 100%">\
            <tr>\
                <td align="left">\
                <i class="fa fa-trash fa-2x text-secondary" onclick="RemoveQuestion(${
                  question.QuestionId
                })"></i>\
                <i class="fa fa-edit fa-2x text-secondary" onclick="Edit(2, ${
                  question.QuestionId
                })"></i>\
                </td>\
                <td><span class="h2 QuestionText-${question.QuestionId}">${
      question.QuestionText
    }</span></td>\
                <td align="right"><span class="h2 QuestionCost-${
                  question.QuestionId
                }">${question.QuestionCost}</span></td>\
            </tr>\
        </table>\
        </div>\
    </div>`
  );
  OpenCategory(question.Category_Id);
  $("#CreateQuestionModal").modal("hide");
}

function AddAnswer(answer) {
  // Добавить блок ответа в нужную категорию
  $(`.AnswersList-${answer.Question_Id}`).append(
    `<div class="row Answer Answer-${answer.AnswerId}">\
        <div class="col-md-12">\
            <table style="width: 100%">\
                <tr>\
                <td><i class="fa fa-trash fa-2x pointer text-danger pointer" onclick="RemoveAnswer(${
                  answer.AnswerId
                })"></i></td>\
                    <td><input type="text" class="form-control m-2 AnswerText AnswerText-${
                      answer.AnswerId
                    }" oninput="UpdateAnswer(${
      answer.AnswerId
    }, $(this).val(), $('.AnswerCorrect-${
      answer.AnswerId
    }').prop('checked'));" value="${answer.AnswerText}"></td>\
                    <td>\
                        <div class="d-flex align-items-center justify-content-center h-1">\
                            <label class="Checkcontainer text-center mb-4 ml-1">\
                                <input class="ExistCheck AnswerCorrect-${
                                  answer.AnswerId
                                }" type="checkbox" ${
      answer.Correct ? "checked" : ""
    } onchange="UpdateAnswer(${answer.AnswerId}, $('.AnswerText-${
      answer.AnswerId
    }').val(), $(this).prop('checked'));">\
                                <span class="checkmark"></span>\
                            </label>\
                        </div>\
                    </td>\
                </tr>\
            </table>\
        </div>\
    </div>`
  );
  animateCSS(`.Answer-${answer.AnswerId}`, "slideInRight");
}

function OpenCategory(categoryId) {
  // Сработает один раз для одной категории
  if (!$(".QuestionsList").is(`.QuestionsList-${categoryId}`)) {
    $(`.CategoryContainer-${categoryId}`).append(
      `<div class="collapse m-2 QuestionsList QuestionsList-${categoryId}"></div>`
    );
    Load.Questions(categoryId); // Загрузка вопросов категории
    console.log({ editGameQuestionsList: $(`.QuestionsList-${categoryId}`) });
    $(`.QuestionsList-${categoryId}`).collapse();
    $(`.Category-${categoryId}`).attr("data-toggle", "collapse");
    $(`.Category-${categoryId}`).attr(
      "data-target",
      `.QuestionsList-${categoryId}`
    );
    $(`.Category-${categoryId}`).attr("onclick", "");
  }
}

function OpenQuestion(questionId) {
  // Сработает один раз для одного вопроса
  if (!$(".AnswersList").is(`.AnswersList-${questionId}`)) {
    const ImgSrc = $(`.Question-${questionId}`).attr("ImgSrc");
    console.log(ImgSrc);
    $(`.QuestionsContainer-${questionId}`).append(
      `<div class="collapse m-2 AnswersList AnswersList-${questionId}">\
            <div class="row mb-2">\
                <div class="col-md-12 text-center">\
                <button class="btn btn-outline-secondary btnDeleteQuestionImage" onclick="RemoveQuestionImage(${questionId})"><i class="fa fa-trash"></i></button>
                    <img src="${ImgSrc}" class="QuestionImage QuestionImage-${questionId}" alt="">\
                </div>\
            </div>\
            <div class="row">\
                <div class="col-md-12 text-center">\
                    <button class="btn btn-outline-success" onclick="CreateAnswer(${questionId})">Добавить ответ</button>\
                </div>\
            </div>\
        </div>`
    );
    Load.Answers(questionId); // Загрузка вопросов категории
    $(`.AnswersList-${questionId}`).collapse();
    $(`.Question-${questionId}`).attr("data-toggle", "collapse");
    $(`.Question-${questionId}`).attr(
      "data-target",
      `.AnswersList-${questionId}`
    );
    $(`.Question-${questionId}`).attr("onclick", "");
  }
}

const UpdateTimer = new Timer(function(updateFields) {
  $.ajax({
    type: "POST",
    url: "UpdateAnswer",
    data: { data: JSON.stringify(updateFields) },
    dataType: "text",
    success(data) {
      Swal({
        position: "top-end",
        type: data == "true" ? "success" : "error",
        title: data == "true" ? "Сохранено" : "Ошибка",
        text: data == "true" ? "" : "Данные не сохранены на сервере",
        showConfirmButton: false,
        backdrop: "none",
        timer: data == "true" ? 500 : 2000
      });
    },
    error(xhr, str) {
      alert(`Возникла ошибка: ${xhr.responseCode}`);
    }
  });
}, 2000);

function UpdateAnswer(answerId, answerText, answerCorrect) {
  UpdateTimer.addUpdateFields(answerId, answerText, answerCorrect);
  UpdateTimer.restart();
}

function RemoveCategory(categoryId) {
  Swal({
    title: "Удаление категории",
    text: "Удалить категорию?",
    type: "warning",
    showCancelButton: true,
    confirmButtonColor: "#3085d6",
    cancelButtonColor: "#6699FF",
    confirmButtonText: "Yes"
  }).then(result => {
    if (result.value) {
      $.ajax({
        type: "POST",
        url: "RemoveCategory",
        data: { CategoryId: categoryId },
        dataType: "text",
        success(data) {
          if (data == "true") {
            $(`.CategoryContainer-${categoryId}`).animate(
              { opacity: 0 },
              50,
              function() {
                $(`.CategoryContainer-${categoryId}`).remove();
              }
            );
          }
        },
        error(xhr, str) {
          alert(`Возникла ошибка: ${xhr.responseCode}`);
        }
      });
    }
  });
}

function RemoveQuestion(questionId) {
  Swal({
    title: "Удаление вопроса",
    text: "Удалить вопрос?",
    type: "warning",
    showCancelButton: true,
    confirmButtonColor: "#3085d6",
    cancelButtonColor: "#6699FF",
    confirmButtonText: "Yes"
  }).then(result => {
    if (result.value) {
      $.ajax({
        type: "POST",
        url: "RemoveQuestion",
        data: { QuestionId: questionId },
        dataType: "text",
        success(data) {
          if (data == "true") {
            $(`.QuestionsContainer-${questionId}`).animate(
              { opacity: 0 },
              50,
              function() {
                $(`.QuestionsContainer-${questionId}`).remove();
              }
            );
          } else alert(data);
        },
        error(xhr, str) {
          alert(`Возникла ошибка: ${xhr.responseCode}`);
        }
      });
    }
  });
}

function RemoveQuestionImage(questionId) {
  Swal({
    title: "Удаление изображения",
    text: "Удалить изображение?",
    type: "warning",
    showCancelButton: true,
    confirmButtonColor: "#3085d6",
    cancelButtonColor: "#6699FF",
    confirmButtonText: "Yes"
  }).then(result => {
    if (result.value) {
      $.ajax({
        type: "POST",
        url: "RemoveQuestionImage",
        data: { questionId: questionId },
        dataType: "text",
        success(data) {
          if (data == "true") {
            $(`.QuestionImage-${questionId}"`).animate({ opacity: 0 }, 50, function() {
              $(`.QuestionImage-${questionId}"`).remove();
            });
          }
        },
        error(xhr, str) {
          alert(`Возникла ошибка: ${xhr.responseCode}`);
        }
      });
    }
  });
}

function RemoveAnswer(answerId) {
  Swal({
    title: "Удаление ответа",
    text: "Удалить ответ?",
    type: "warning",
    showCancelButton: true,
    confirmButtonColor: "#3085d6",
    cancelButtonColor: "#6699FF",
    confirmButtonText: "Yes"
  }).then(result => {
    if (result.value) {
      $.ajax({
        type: "POST",
        url: "RemoveAnswer",
        data: { AnswerId: answerId },
        dataType: "text",
        success(data) {
          if (data == "true") {
            $(`.Answer-${answerId}`).animate({ opacity: 0 }, 50, function() {
              $(`.Answer-${answerId}`).remove();
            });
          }
        },
        error(xhr, str) {
          alert(`Возникла ошибка: ${xhr.responseCode}`);
        }
      });
    }
  });
}

function Edit(type, Id) {
  if (type == 1) {
    $(".EditModal_Tittle").html("Редактировать категорию");
    $(".EditModal_Body").html(
      `\
        <div class="EditContainer" id="${Id}" type="${type}">\
            <input type="text" class="form-control EditCategoryName" value="${$(
              `.Category-${Id}`
            ).attr("CategoryName")}">\
        </div>`
    );

    $("#EditModal").modal();
  } else if (type == 2) {
    $(".EditModal_Tittle").html("Редактировать вопрос");
    $(".EditModal_Body").html(
      `\
        <div class="EditContainer" id="${Id}" type="${type}">\
            <div class="form-group">\
                <input type="text" class="form-control EditQuestionText" value="${$(
                  `.Question-${Id}`
                ).attr("QuestionText")}">\
            </div>\
            <div class="form-group">\
                <input type="number"  min="0" step="10" class="form-control EditQuestionCost" value="${$(
                  `.Question-${Id}`
                ).attr("QuestionCost")}">\
            </div>\
            <div class="form-group text-left">\
                <label>Изображение к вопросу</label>\
                <label class="text-danger">2 МБ</label>\
                <input type="file" class="form-control EditQuestionImage">\
            </div>\
        </div>`
    );

    $("#EditModal").modal();
  }
}

var Load = {
  Categories() {
    LoadThings("1");
  },
  Questions(categoryId) {
    LoadThings("2", categoryId);
  },
  Answers(questionId) {
    LoadThings("3", "", questionId);
  }
};

function LoadThings(loadType, categoryId = "", questionId = "") {
  ShowLoader();
  $.ajax({
    type: "POST",
    url: "Load",
    data: {
      LoadType: loadType,
      CategoryId: categoryId,
      QuestionId: questionId
    },
    dataType: "text",
    success(data) {
      if (data !== "null") {
        const res = JSON.parse(data);
        if (res.name)
          Swal("Ошибка", `Данные не были получены: ${res.name}`, "error");
        else {
          if (loadType == 1) {
            // LoadCategories To CategoriesList
            for (let i = 0; i < res.length; i++) {
              AddCategory(res[i]);
            }
          }
          if (loadType == 2) {
            // LoadQuestions To QuestionsList
            for (let i = 0; i < res.length; i++) {
              AddQuestion(res[i]);
            }
            $(`.QuestionsList-${categoryId}`).collapse();
          }
          if (loadType == 3) {
            for (let i = 0; i < res.length; i++) {
              AddAnswer(res[i]);
            }
            $(`.AnswersList-${questionId}`).collapse();
          }
        }
      }
      HideLoader();
    },
    error(xhr, str) {
      HideLoader();
      alert(`Возникла ошибка: ${xhr.responseCode}`);
    }
  });
}

function Timer(callback, delay) {
  let timerId;
  const remaining = delay;

  let UpdateFields = [];

  this.restart = function() {
    window.clearTimeout(timerId);
    timerId = window.setTimeout(function() {
      callback(UpdateFields);
      UpdateFields = [];
    }, remaining);
  };

  this.addUpdateFields = function(AnswerId, AnswerText, AnswerCorrect) {
    let flag = true;
    for (const U in UpdateFields) {
      if (UpdateFields[U].AnswerId == AnswerId) {
        UpdateFields[U].AnswerText = AnswerText;
        UpdateFields[U].AnswerCorrect = AnswerCorrect;
        flag = false;
        break;
      }
    }
    if (flag)
      UpdateFields.push({
        AnswerId,
        AnswerText,
        AnswerCorrect
      });
  };
}
