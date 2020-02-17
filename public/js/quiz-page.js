$(document).ready(function() {
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