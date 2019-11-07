const RoomTeam = require("../models/RoomTeam");
const Team = require("../models/Team");

module.exports = async function GetTeamNamesPoints(roomId) {
  let sortedTeamNamesPoints = [];
  await RoomTeam.findAll({
    where: { Room_Id: roomId },
    raw: true
  })
    .then(async roomTeams => {
      await Team.findAll({
        where: {
          TeamId: roomTeams.map(roomTeam => roomTeam.Team_Id)
        }
      })
        .then(teams => {
          // .filter заодно убирает команду -1 создателя, тк такой не существует
          sortedTeamNamesPoints = teams
            .map(team => {
              return {
                TeamId: team.TeamId,
                TeamName: team.TeamName,
                Points: roomTeams.find(
                  roomTeam => roomTeam.Team_Id == team.TeamId
                ).Points
              };
            })
            .sort(function(a, b) {
              return b.Points - a.Points;
            });
        })
        .catch(err => console.log(err));
    })
    .catch(err => console.log(err));
  return sortedTeamNamesPoints;
};
