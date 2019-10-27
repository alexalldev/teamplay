const session = require("express-session");
const fs = require("fs");
const FileStore = require("session-file-store")(session);
const passport = require("passport");

const app = require("./config/server-config");
const Question = require("./models/Question");
const GamePlay = require("./models/GamePlay");
const Room = require("./models/Room");
const RoomPlayer = require("./models/RoomPlayer");

const sessionMiddleware = session({
  secret: "TEAMPLAYCOOKIESETRETWORDFORSESSION",
  store: new FileStore({ logFn: () => {} }),
  cookie: {
    path: "/",
    httpOnly: true
  },
  resave: false,
  saveUninitialized: false
});

app.use((req, res, next) => {
  if (req.hostname == "teamplay.alex-all.ru")
    if (req.path == "/Admin") res.redirect(301, "https://teamplay.space/Admin");
    else res.redirect(301, "https://teamplay.space");
  return next();
});

app.use(sessionMiddleware);

require("./config/passport-config");

app.use(passport.initialize());
app.use(passport.session());

const db = require("./config/database");

db.authenticate()
  .then(() => {
    console.log("Connection has been established successfully.");
  })
  .catch(err => {
    console.error("Unable to connect to the database:", err);
  });

app.use((req, res, next) => {
  if (req.session.roomId) {
    if (req.path.toLowerCase().includes("leaveroom")) return next();
    if (!req.path.toLowerCase().includes("room/")) {
      Room.findOne({ where: { RoomId: req.session.roomId } })
        .then(room => {
          if (room)
            RoomPlayer.findOne({
              where: { Room_Id: room.RoomId },
              raw: true
            }).then(roomPlayer => {
              if (roomPlayer)
                return res.render("info", {
                  message: "LEAVE_ROOM",
                  room
                });
              return next();
            });
          else {
            delete req.session.roomId;
            // return res.render("info", { message: "Комната удалена" });
          }
        })
        .catch(err => console.log(err));
    } else return next();
  } else return next();
});

const io = require("./config/sockets");

io.use((socket, next) => {
  sessionMiddleware(socket.request, socket.request.res, next);
});

// LoggedAdmin
io.use((socket, next) => {
  if (socket.request.session.passport) socket.LoggedAdmin = !!socket.request.session.passport.user;
  else socket.LoggedAdmin = null;
  next();
});

// HasControlGame
io.use((socket, next) => {
  socket.HasControlGame = !!(socket.request.session.Game && socket.LoggedAdmin);
  next();
});

/* SERVER */

app.use("/", require("./routes/main"));

app.use("/EditGame", require("./routes/editGame"));

app.use("/Stream", require("./routes/stream"));

app.use("/notification", require("./routes/notifications"));

app.use("/teamOperation", require("./routes/team-operation"));

app.get("/QuestionImage", (req, res) => {
  if (req.query.QuestionId)
    Question.findOne({ raw: true, where: { QuestionId: req.query.QuestionId } })
      .then(question => {
        if (question == null) {
          res.writeHead(200, { "Content-Type": "application/msword" });
          fs.createReadStream(`${__dirname}/IMAGES/NULL_IMAGE`).pipe(res);
        } else if (question.QuestionImagePath.length == 0) {
          res.writeHead(200, { "Content-Type": "application/msword" });
          fs.createReadStream(`${__dirname}/IMAGES/NULL_IMAGE`).pipe(res);
        } else {
          const file = `${__dirname}/IMAGES/QUESTIONS_IMAGES/${question.QuestionImagePath}`;
          fs.access(file, fs.constants.F_OK, err => {
            if (err) {
              res.writeHead(200, { "Content-Type": "application/msword" });
              fs.createReadStream(`${__dirname}/IMAGES/NULL_IMAGE`).pipe(res);
            } else {
              res.writeHead(200, { "Content-Type": "application/msword" });
              fs.createReadStream(`${__dirname}/IMAGES/QUESTIONS_IMAGES/${question.QuestionImagePath}`).pipe(res);
            }
          });
        }
      })
      .catch(err => res.end(err.toString()));
  else {
    res.writeHead(200, { "Content-Type": "application/msword" });
    fs.createReadStream(`${__dirname}/IMAGES/NULL_IMAGE`).pipe(res);
  }
});

app.get("/StreamImage", function(req, res) {
  if (req.query.GamePlayId)
    GamePlay.findOne({ raw: true, where: { GamePlayId: req.query.GamePlayId } })
      .then(gamePlay => {
        if (gamePlay == null) {
          res.writeHead(200, { "Content-Type": "application/msword" });
          fs.createReadStream(`${__dirname}/IMAGES/NULL_IMAGE`).pipe(res);
        } else if (gamePlay.StreamImagePath.length == 0) {
          res.writeHead(200, { "Content-Type": "application/msword" });
          fs.createReadStream(`${__dirname}/IMAGES/NULL_IMAGE`).pipe(res);
        } else {
          const file = `${__dirname}/IMAGES/STREAM_IMAGES/${gamePlay.StreamImagePath}`;
          fs.access(file, fs.constants.F_OK, err => {
            if (err) {
              res.writeHead(200, { "Content-Type": "application/msword" });
              fs.createReadStream(`${__dirname}/IMAGES/NULL_IMAGE`).pipe(res);
            } else {
              res.writeHead(200, { "Content-Type": "application/msword" });
              fs.createReadStream(`${__dirname}/IMAGES/STREAM_IMAGES/${gamePlay.StreamImagePath}`).pipe(res);
            }
          });
        }
      })
      .catch(err => res.end(err.toString()));
  else {
    res.writeHead(200, { "Content-Type": "application/msword" });
    fs.createReadStream(`${__dirname}/IMAGES/NULL_IMAGE`).pipe(res);
  }
});

app.get("/UserImage", (req, res) => {
  res.writeHead(200, { "Content-Type": "application/msword" });
  fs.createReadStream(`${__dirname}/IMAGES/NULL_IMAGE`).pipe(res);
});

app.use(function(req, res, next) {
  res.redirect("/");
});
