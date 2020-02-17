$(document).ready(function () {
    socket.emit('Update');
})

function AddTeam(Team) {

    $('.TeamsList').html($('.TeamsList').html() + '<tr class="Team NewTeam" id="Team-' + Team.GameTeamId + '" GameTeamId="' + Team.GameTeamId + '">\
        <td class=" h3 TeamPoints TeamPoints-'+ Team.GameTeamId + '">' + Team.Points + '</td>\
        <td class="h3">'+ Team.PlayId + '</td>\
        <td class="h3 TeamName-'+ Team.GameTeamId + '">' + Team.TeamName + '</td>\
    </tr>');
    setTimeout(() => {
        $('.Team').removeClass('NewTeam');
    }, 1000);
}

function ClearTeamsList() {
    $('.TeamsContainer').html('');
}

function ClearQuestion() {
    $('.QuestionText').text('');
    $('.QuestionImage').attr('src', '');
}

socket.on('ReciveTeams', function (teams) {
    ClearTeamsList();
    ClearQuestion();
    $('.TeamsContainer').html('<div class="row">\
    <div class="col-md-12 text-center">\
\
        <table class="table table-hover">\
        <thead>\
            <th class="h3 text-center"><i class="fas fa-trophy text-warning"></i></th>\
            <th class="h3 text-center">№</th>\
            <th class="h3 text-center">Команда</th>\
        </thead>\
        <tbody class="TeamsList">\
            \
        </tbody>\
        </table>\
\
    </div>\
</div>');
    for (var team of teams)
        AddTeam(team)
})

socket.on('ReciveQuestion', function (question) {
    ClearTeamsList();
    ClearQuestion();
    $('.QuestionText').text(question.QuestionText);
    $('.QuestionImage').attr('src', location.protocol + '//' + location.host + '/QuestionImage?QuestionId=' + question.QuestionId);
});

socket.on('UpdateStream', function () {
    socket.emit('Update');
})