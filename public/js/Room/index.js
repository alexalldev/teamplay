$(document).ready(function () {
	socket.emit('LoadGames');
});

function AddGame (Game) {
	$('.NullGames').remove();
	$('.GamesList').html(
		$('.GamesList').html() +
			'<a href="/Room/' +
			Game.GameTag +
			'"><div class="text-center Game NewGame" id="Game-' +
			Game.GameId +
			'">\
  <table class="GamesGrid">\
      <tr>\
          <td class="text-center"><span class="h1">' +
			Game.GameName +
			'</span></td>\
      </tr>\
  </table>\
</div></a>'
	);
	return true;
}

socket.on('ReciveGames', function (Games) {
	for (var i in Games) {
		AddGame(Games[i]);
	}
});
