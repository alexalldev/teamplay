const express = require("express");
var cookieParser = require("cookie-parser");

var app = express();

app.use(cookieParser());

app.Hash = require("password-hash");

app.set("trust proxy", 1); // trust first proxy

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.set("view engine", "ejs");
app.use("/public", express.static("public"));

app.protect = (req, res, next) => {
  if (req.isAuthenticated()) {
    next();
  } else {
    return res.redirect("/");
  }
};

module.exports = app;
