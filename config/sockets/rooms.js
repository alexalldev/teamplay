const Room = require('../../models/Room');
const roomPlayer = require('../../models/RoomPlayer');
const User = require('../../models/User');
function roomsSocket (socket, io) {
	socket.on('createRoom', function (roomName, creatorID) {
		console.log(roomName, creatorID);
		gameTag = roomName.replace(/[^a-zA-Zа-яА-Я ]/g, '').toLowerCase().replace(/\s/g, '-');
		socket.join(gameTag);
		Room.findOrCreate({ where: { RoomTag: gameTag, RoomName: roomName, RoomCreatorID: creatorID } })
			.then(([ game, created
			]) => {
				if (created == true) {
					console.log('room was created');
					//.to(gameTag)
					io.emit('roomAdded');
				} else {
					console.log('Room is already exists');
					//.to(gameTag)
					io.emit('roomExists');
				}
			})
			.catch(err => console.log(err));
	});

	socket.on('getConnectedUsers', function (roomTag) {
		let users = {};
		roomPlayer.findAll({ where: { RoomTag: roomTag }, raw: true }).then(room => {
			if (!room) {
				users.err = 'room not found';
			} else {
				console.log('room');
				console.log(room);
				findConnectedUsers(room, users);
			}
		});
	});

	socket.on('user login', function (userId, roomTag) {
		console.log('users:');
		console.log(io.ClientsStore.users());
		User.findOne({ where: { UserId: userId }, raw: true }).then(user => {
			//.to(roomTag)
			socket.emit('user logged in', io.ClientsStore.pushUser(user));
		});
	});

	async function findConnectedUsers (room, users) {
		let roomPlayersArray = [];
		let counter = 0;
		const result = async () => {
			await asyncForEach(room, async player => {
				await User.findOne({ where: { UserId: player.UserID }, raw: true }).then(user => {
					roomPlayersArray[counter] = user;
					counter++;
				});
			});
			users.result = roomPlayersArray;
			console.log(room[0].RoomTag);
			//.to(room[0].RoomTag)
			io.emit('sendConnectedUsers', users);
		};
		result();
	}

	async function asyncForEach (array, callback) {
		for (let index = 0; index < array.length; index++) {
			await callback(array[index], index, array);
		}
	}

	socket.on('getCreatorStatus', function (roomTag) {
		Room.findOne({ where: { RoomTag: roomTag }, raw: true }).then(room => {
			//.to(roomTag)
			io.emit(
				'sendCreatorStatus',

					io.ClientsStore.userById(room.RoomCreatorID) ? true :
					false
			);
		});
	});
}
module.exports = roomsSocket;
