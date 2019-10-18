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
    AddPlayer(player);
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

function AddPlayer(player) {
  console.log({
    AddPlayerBeforeIf: player
  });

  if ($(".group").length > 0)
    $(".group").each(function(i) {
      if (!player.isPlayerInTeam) {
        if ($(this).attr("TeamId") == player.TeamId) {
          AddPlayerToGroup(player);
        } else CreateGroup(player);
        player.isPlayerInTeam = true;
      }
    });
  else CreateGroup(player);
}

function AddPlayerToGroup(player) {
  console.log({ AddPlayerToGroup: player });
  $(`.group-players-${player.TeamId}`).append(
    `<div class="row Player Player-${player.RoomPlayersId} mt-2 mb-2">
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

function CreateGroup(player) {
  console.log({ CreateGroup: player });
  $(".group-list").append(
    `<div class="group group-${player.TeamId} col-md-4 mr-1 mb-1" TeamId="${player.TeamId}">
        <span class="h4">${player.TeamName}</span>
        <div class="group-players group-players-${player.TeamId}">
        </div>
    </div>`
  );
  AddPlayerToGroup(player);
}
