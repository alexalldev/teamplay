const Room = require('../../models/Room');
const RoomPlayer = require('../../models/RoomPlayer');
const User = require('../../models/User');
function roomsSocket(socket, io) {
	const session = socket.request.session;
	socket.on('createRoom', function(roomName, creatorID) {
		gameTag = roomName.replace(/[^a-zA-Zа-яА-Я0-9 ]/g, '').toLowerCase().replace(/\s/g, '-');
		Room.findOrCreate({ where: { RoomTag: gameTag, RoomName: roomName, RoomCreatorID: creatorID } })
			.then(([ game, created
			]) => {
				if (created == true) {
					io.emit('roomAdded', created);
				} else {
					io.emit('roomExists');
				}
			})
			.catch(err => console.log(err));
	});

	socket.on('getRoomPlayers', function(roomTag) {
		let users = {};
		RoomPlayer.findAll({ where: { RoomTag: roomTag }, raw: true }).then(async room => {
			//.to(room[0].RoomTag)
			io.emit('sendRoomPlayers', await findRoomPlayers(room, users));
		});
	});

	socket.on('enter room', function(userId, roomTag) {
		socket.join(roomTag);
		RoomPlayer.create({ RoomTag: roomTag, UserID: userId }).then(roomPlayer => {
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

	socket.on('getCreatorStatus', function(roomTag) {
		Room.findOne({ where: { RoomTag: roomTag }, raw: true }).then(room => {
			//.to(roomTag)
			io.emit('sendCreatorStatus', io.ClientsStore.userById(room.RoomCreatorID) ? true : false);
		});
	});

	socket.on('disconnect', () => {});

	async function findRoomPlayers(room, users) {
		let roomPlayersArray = [];
		let counter = 0;
		for await (const player of room) {
			await User.findOne({ where: { UserId: player.UserID }, raw: true }).then(user => {
				roomPlayersArray[counter] = user;
				counter++;
			});
		}
		users.result = roomPlayersArray;
		return users;
	}

	function setUserFIOproperty(user) {
		user.UserFIO = `${user.UserName} ${user.UserFamily} ${user.UserLastName}`;
		return user;
	}
}
module.exports = roomsSocket;
