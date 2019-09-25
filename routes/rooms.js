let {
    router
} = require('../config/routers-config');

const Room = require("../models/Room");

router.post("/createRoom", function (req, res) {
    Room.FindOne({ where:{ RoomName: req.body.roomName } }).then(room => {
        if(!room){
            res.send(false);
        } else {
            Room.create({ RoomName: req.body.roomName }).then( createdRoom => {
                console.log("Room " + req.body.roomName + " was created");
            }).catch(err => {
                console.log("CreateTeamError");
            });
        }
    });
});