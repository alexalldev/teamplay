$(document).ready(function() {
  $(".nav-notifications").click(function() {
    const state = $(this).data("state");
    $(".notifications-menu").toggle("collapse");
    switch (state) {
      case 1:
      case undefined:
        $(".notifications").html("");
        $("#nav-ring").replaceWith(
          '<i id="nav-ring" class="far fa-bell text-white">'
        );
        $.ajax({
          type: "POST",
          url: "/getCurrUserId",
          success(session) {
            $.ajax({
              type: "POST",
              url: "/teamOperation/invite",
              dataType: "text",
              data: {
                receiverId: session.userId,
                shouldCreate: "false"
              },
              success(data) {},
              error(xhr, str) {
                alert(`Возникла ошибка: ${str} ${xhr.responseCode}`);
              }
            });
          },
          error(xhr, str) {
            alert(`Возникла ошибка: ${str} ${xhr.responseCode}`);
          }
        });
        $(this).data("state", 2);
        break;
      case 2:
        $("#nav-ring").replaceWith(
          '<i id="nav-ring" class="fa fa-bell text-white"></i>'
        );
        $(this).data("state", 1);
        break;
    }
  });
});
