function NewGamePlayGeneration(socket, io) {
	const session = socket.request.session;

	socket.on('StartGame', function() {
		if (session.isRoomCreator == true) {
			CreateGamePlayStructure(function() {
				PrepareGame();
				io.to('Stream' + session.Game.Id).emit('UpdateStream');
			});
		}
	});

	function CreateGamePlayStructure(callback) {
		/*                          GamePlay Structure                      */
		Game.findOne({ raw: true, where: { GameId: session.Game.Id } })
			.then(async game => {
				if (game)
					await GamePlay.findOrCreate({ raw: true, where: { Game_Id: game.GameId } })
						.then(async ([ gamePlay, created
						]) => {
							await Category.findAll({ raw: true, where: { Game_Id: game.GameId } })
								.then(async categories => {
									if (categories.length > 0)
										for (var C in categories) {
											await GamePlayCategory.findOrCreate({
												raw: true,
												where: { Category_Id: categories[C].CategoryId, GamePlay_Id: gamePlay.GamePlayId }
											})
												.then(async ([ gamePlayCategory, created
												]) => {
													await Question.findAll({ raw: true, where: { Category_Id: categories[C].CategoryId } })
														.then(async questions => {
															for (var Q in questions) {
																await GamePlayQuestion.findOrCreate({
																	raw: true,
																	where: {
																		Question_Id: questions[Q].QuestionId,
																		GamePlayCategory_Id: gamePlayCategory.GamePlayCategoryId
																	}
																})
																	.then(async ([ gamePlayQuestion, created
																	]) => {})
																	.catch(err => console.log(err));
															}
														})
														.catch(err => console.log(err));
												})
												.catch(err => console.log(err));
										}
								})
								.catch(err => console.log(err));
						})
						.catch(err => console.log(err));
				await callback(true);
			})
			.catch(err => console.log(err));
	}
}

module.exports = NewGamePlayGeneration;
