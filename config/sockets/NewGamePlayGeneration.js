const Category = require("../../models/Category");
const Question = require("../../models/Question");
const Answer = require("../../models/Answer");
const Room = require("../../models/Room");
const RoomTeam = require("../../models/RoomTeam");
const RoomPlayer = require("../../models/RoomPlayer");
const Game = require("../../models/Game");
const GamePlay = require("../../models/GamePlay");
const GamePlayCategory = require("../../models/GamePlayCategory");
const GamePlayQuestion = require("../../models/GamePlayQuestion");
const RoomOfferAnswer = require("../../models/RoomOfferAnswer");
const User = require("../../models/User");
const util = require("util");

function NewGamePlayGeneration(socket, io) {

  const { session } = socket.request;

  const NextRandomQuestion = require('./NextRandomQuestion');
  const GamePlayStructure = require('./GamePlayStructure');

  socket.on("gameStarted", async ()  => {
    if (session.isRoomCreator) {
      // TODO: roomPlayers, roomTeams destroy при входе в комнату, чтобы не было вдруг there is no roomId in session

      // TODO: проверить работоспособность RemoveGamePlayStructure
      // await RemoveGamePlayStructure();
      if (await getCanStartGame())
      {
        await GamePlayStructure.Create(session);
      
        await NextRandomQuestion(socket, io, session);
      }
    }
  });

  async function getCanStartGame() {
    await RoomTeam.findAll({where: {Room_Id: session.roomId, ReadyState: true}, raw: true})
      .then(async roomTeams => {
        if (roomTeams.length == 0)
          return false
        else
          return true
      })
      .catch(err => {
        console.log(err)
        return false;
      });
  }

  socket.on('getCanStartGame', async function() {
    console.log(await getCanStartGame());
    if (session.isRoomCreator)
      socket.emit('reciveCanStartGame', await getCanStartGame());
  });

  socket.on("writeOffers", async offerIds => {
    let usersFioOffers = [];
    if (offerIds) {
      await RoomTeam.findOne({
        where: { Room_Id: session.roomId, Team_Id: session.TeamId }
      })
        .then(async roomTeam => {
          console.log({ offerIds });
          await RoomOfferAnswer.destroy({
            where: {
              RoomPlayer_Id: session.roomPlayersId
            }
          })
            .then(async () => {
              for await (const offerId of offerIds) {
                await RoomOfferAnswer.create({
                  RoomPlayer_Id: session.roomPlayersId,
                  RoomTeam_Id: roomTeam.RoomTeamId,
                  Answer_Id: offerId
                }).catch(err => console.log(err));
              }
              // .then(async () => {
              await RoomOfferAnswer.findAll({
                where: {
                  RoomTeam_Id: roomTeam.RoomTeamId
                },
                raw: true
              }).then(async roomOfferAnswers => {
                // roomPlayer answerid roomteamid
                // OFFERS == ANSWER_IDS ARRAY !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
                console.log({ roomOfferAnswers });
                let usersOffers = [];

                const roomPlayersOffers = await roomOfferAnswers.map(
                  roomOfferAnswer => {
                    return {
                      RoomPlayerId: roomOfferAnswer.RoomPlayer_Id,
                      Offers: roomOfferAnswers
                        .filter(
                          roomOfferAnswer2 =>
                            roomOfferAnswer2.RoomPlayer_Id ==
                            roomOfferAnswer.RoomPlayer_Id
                        )
                        .map(roomOfferAnswer3 => roomOfferAnswer3.Answer_Id)
                    };
                  }
                );
                // найти все ответы для определенного roomPlayerId в roomOfferAnswers
                console.log("RoomPlayersOffers");
                console.log(
                  util.inspect(roomPlayersOffers, {
                    showHidden: false,
                    depth: null
                  })
                );
                await RoomPlayer.findAll({
                  where: {
                    RoomPlayersId: roomPlayersOffers.map(
                      roomPlayerOffer => roomPlayerOffer.RoomPlayerId
                    )
                  },
                  raw: true
                }).then(roomPlayers => {
                  console.log({ roomPlayers });
                  usersOffers = roomPlayers.map(roomPlayer => {
                    return {
                      UserId: roomPlayer.User_Id,
                      Offers: roomPlayersOffers.filter(
                        roomPlayerOffer =>
                          roomPlayerOffer.RoomPlayerId ==
                          roomPlayer.RoomPlayersId
                      )[0].Offers
                    };
                  });
                  console.log("usersOffers");
                  console.log(
                    util.inspect(usersOffers, {
                      showHidden: false,
                      depth: null
                    })
                  );
                });
                await User.findAll({
                  where: {
                    UserId: usersOffers.map(userOffer => userOffer.UserId)
                  },
                  raw: true
                }).then(async users => {
                  usersFioOffers = users.map(user => {
                    return {
                      UserFIO: `${user.UserFamily} ${user.UserName.slice(
                        0,
                        1
                      )}. ${user.UserLastName.slice(0, 1)}.`,
                      Offers: usersOffers.filter(
                        userOffers => userOffers.UserId == user.UserId
                      )[0].Offers
                    };
                  });
                  console.log("usersFioOffers");
                  console.log(
                    util.inspect(usersFioOffers, {
                      showHidden: false,
                      depth: null
                    })
                  );
                });
              });
              // })
              // .catch(err => console.log(err));
              // }
            })
            .catch(err => console.log(err));
          console.log("offersUsers");
          console.log(
            util.inspect(usersFioOffers, {
              showHidden: false,
              depth: null
            })
          );
          // TODO: emit to somebody?
          socket.emit("sendOffersChanges", usersFioOffers);
        })
        .catch(err => console.log(err));
    }
  });

  socket.on("GamePreparation", current => {
    io.to(`RoomPlayers${session.roomId}`).emit("GamePreparationTick", current);
  });

  socket.on("StopGamePreparationTick", () => {
    if (session.isRoomCreator)
      io.to(`RoomPlayers${session.roomId}`).emit("StopGamePreparationTick");
  });
 
  socket.on("RemoveGamePlayStructure", (roomId, gameId) => {
    GamePlayStructure.Remove(session);
  });

  socket.on("getGroupStatus", player => {
    RoomTeam.findOne({
      where: { Room_Id: player.RoomId, Team_Id: player.TeamId },
      raw: true
    }).then(roomTeam => {
      if (roomTeam)
        io.to(`RoomUsers${session.roomId}`).emit(
          "sendGroupStatus",
          player.TeamId,
          roomTeam.ReadyState
        );
    });
  });

  socket.on("GroupReadyClick", () => {
    RoomPlayer.findOne({
      where: {
        RoomPlayersId: session.roomPlayersId,
        Room_Id: session.roomId,
        Team_Id: session.TeamId,
        isGroupCoach: true
      }
    })
      .then(groupCoach => {
        if (groupCoach) {
          RoomTeam.findOne({
            where: { Room_Id: session.roomId, Team_Id: session.TeamId }
          })
            .then(roomTeam => {
              if (roomTeam)
                roomTeam
                  .update({
                    ReadyState: !roomTeam.ReadyState
                  })
                  .then(() => {
                    socket.emit("MyGroupReadyState", roomTeam.ReadyState);
                    io.to(`RoomUsers${session.roomId}`).emit(
                      "GroupReady",
                      roomTeam.ReadyState,
                      session.TeamId
                    );
                  });
            })
            .catch(err => console.log(err));
        }
      })
      .catch(err => console.log(err));
  });
}

function getUnixTime() {
  return Math.floor(new Date() / 1000);
}

module.exports = NewGamePlayGeneration;
