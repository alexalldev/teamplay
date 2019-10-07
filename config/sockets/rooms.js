const Room = require('../../models/Room');
const RoomPlayer = require('../../models/RoomPlayer');
const User = require('../../models/User');
const Team = require('../../models/Team');
function roomsSocket(socket, io) {
	const session = socket.request.session;
	socket.on('createRoom', function(roomName, gameId, roomMaxTeamPlayers) {
		var creatorId = session.passport.user;
		roomTag = roomName.replace(/[^a-zA-Zа-яА-Я0-9 ]/g, '').toLowerCase().replace(/\s/g, '-');
		Room.findOrCreate({ where: { RoomTag: roomTag, RoomCreatorId: creatorId } })
			.then(([ room, created
			]) => {
				if (created == true) {
					room
						.update({ RoomName: roomName, Game_Id: gameId, RoomMaxTeamPlayers: roomMaxTeamPlayers })
						.then(() => socket.emit('roomAdded', created))
						.catch(err => console.log(err));
				} else {
					socket.emit('roomExists');
				}
			})
			.catch(err => console.log(err));
	});

	socket.on('getRoomPlayers', function() {
		let users = {};
		RoomPlayer.findAll({ where: { Room_Id: session.roomId }, raw: true }).then(async room => {
			socket.emit('recieveRoomPlayers', await findRoomPlayers(room, users));
		});
	});

	socket.on('enter room', function(userId, roomTag) {
		socket.join(roomTag);
		RoomPlayer.create({ RoomTag: roomTag, UserId: userId }).then(roomPlayer => {
			User.findOne({ where: { UserId: userId }, raw: true }).then(user => {
				//.to(roomTag)
				if (user) socket.emit('entered room', setUserFIOproperty(user));
			});
		});
	});

	socket.on('leave room', function(userId, roomTag) {
		RoomPlayer.destroy({ where: { UserId: userId, RoomTag: roomTag }, raw: true }).then(roomPlayer => {
			//.to(roomTag)
			//session.passport.user
			User.findOne({ where: { UserId: userId }, raw: true }).then(user => {
				//.to(roomTag)
				socket.emit('left room', setUserFIOproperty(user));
			});
		});
	});

	socket.on('getCreatorStatus', function() {
		if (session.roomId)
			Room.findOne({ where: { RoomId: session.roomId }, raw: true })
				.then(room => {
					RoomPlayer.findOne({ where: { Room_Id: session.roomId }, raw: true }).then(roomPlayer => {
						if (roomPlayer)
							User.findOne({ where: { UserId: roomPlayer.User_Id }, raw: true })
								.then(user => {
									if (user)
										socket.emit('RecieveCreatorStatus', io.ClientsStore.creatorById(room.RoomCreatorId) ? true : false);
									else console.log('rooms.js: There is no user');
								})
								.catch(err => console.log(err));
						else console.log('rooms.js: There is no room creator');
					});
				})
				.catch(err => console.log(err));
		else console.log('rooms.js: There is no roomId in session');
	});

	socket.on('deleteRoom', function(roomId) {
		if (session.passport.user)
			RoomPlayer.destroy({ where: { Room_Id: roomId } })
				.then(() => {
					Room.destroy({ where: { RoomCreatorId: session.passport.user, RoomId: roomId } })
						.then(room => {
							if (room) io.to('RoomUsers' + session.roomId).emit('roomDeleted', true);
							else socket.emit('roomDeleted', 'You cant delete this room');
						})
						.catch(err => console.log(err));
				})
				.catch(err => console.log(err));
		else console.log('There is no roomId in session');
	});

	socket.on('disconnect', () => {});

	async function findRoomPlayers(room, users) {
		let roomPlayersArray = [];
		let counter = 0;
		for await (const player of room) {
			if (!player.isRoomCreator)
				await User.findOne({ where: { UserId: player.User_Id }, raw: true }).then(async user => {
					await Team.findOne({ where: { TeamId: user.Team_Id }, raw: true }).then(team => {
						roomPlayersArray[counter] = {
							RoomPlayersId: player.RoomPlayersId,
							UserName: user.UserName,
							UserFamily: user.UserFamily,
							UserLastName: user.UserLastName,
							RoomId: player.Room_Id,
							TeamId: player.Team_Id,
							TeamName: player.isRoomCreator ? '' : team.TeamName,
							isRoomCreator: player.isRoomCreator,
							isGroupCoach: player.isGroupCoach
						};
						counter++;
					});
				});
		}
		return roomPlayersArray;
	}

	function setUserFIOproperty(user) {
		user.UserFIO = `${user.UserName} ${user.UserFamily} ${user.UserLastName}`;
		return user;
	}
}
module.exports = roomsSocket;
