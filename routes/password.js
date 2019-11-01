/* eslint-disable no-restricted-syntax */
const nodeMailer = require("nodemailer");
const fs = require("fs");
const crypto = require("crypto");
const Hash = require("password-hash");
const validateEmail = require('../modules/validate-email');
const {
  router,
  urlencodedParser,
  User,
} = require("../config/routers-config");

router.post("/ForgotPassword", urlencodedParser, function(req, res) {
    if (req.body.username) {
      if (validateEmail(req.body.username))
        User.findOne({ where: { UserEmail: req.body.username } })
          .then(user => {
            if (user)
              if (user.dataValues.UserIsActive) {
                const transporter = nodeMailer.createTransport({
                  host: "mail.alexall.dev",
                  port: 465,
                  secure: true,
                  auth: {
                    user: "info@teamplay.space",
                    pass: "teamplayspace"
                  }
                });
  
                fs.readFile(
                  `${__dirname}/../html_mail/TeamPlayForgotEmail.html`,
                  "utf-8",
                  function(err, data) {
                    if (err) res.end(JSON.stringify(err));
                    let html_mail_array = data.split("NEW_EMAILBUTTON");
                    let confirmation_hash = crypto
                      .randomBytes(Math.ceil(120 / 2))
                      .toString("hex") // convert to hexadecimal format
                      .slice(0, 120);
                    let html_mail = `${html_mail_array[0] + req.protocol}://${
                      req.hostname
                    }/ChangePassword?confirmation_type=email&security_code=${confirmation_hash}${
                      html_mail_array[1]
                    }`;
  
                    const mailOptions = {
                      from: '"Teamplay info" <info@teamplay.space>', // sender address
                      to: user.UserEmail,
                      subject: "Восстановление пароля TeamPlay", // Subject line
                      html: html_mail
                    };
                    user
                      .update({
                        UserRegistrationToken: confirmation_hash
                      })
                      .then(() => {
                        transporter.sendMail(mailOptions, error => {
                          if (error) {
                            return res.end(JSON.stringify(error));
                          }
                          // console.log('Message %s sent: %s', info.messageId, info.response);
                          res.end("true");
                        });
                      });
                  }
                );
              } else res.end("Please Activate Your Account via Email");
            else res.end("null_user");
          })
          .catch(err => console.log(err));
    } else res.end("null_email");
  });

router.get("/ChangePassword", function(req, res) {
    if (req.query.security_code)
      User.findOne({ where: { UserRegistrationToken: req.query.security_code } })
        .then(user => {
          if (user) {
            req.session.security_code = req.query.security_code;
            res.render("ChangePassword", { username: user.UserEmail });
          } else res.redirect("/");
        })
        .catch(err => console.log(err));
    else res.end("false");
  });
  
  router.post("/ChangePassword", urlencodedParser, function(req, res) {
    if (req.session.security_code)
      if (req.body.firstpass && req.body.secondpass)
        if (
          req.body.firstpass.length > 5 &&
          req.body.firstpass == req.body.secondpass
        )
          User.findOne({
            where: { UserRegistrationToken: req.session.security_code }
          })
            .then(user => {
              if (user)
                user
                  .update({
                    UserPassword: Hash.generate(req.body.firstpass),
                    UserRegistrationToken: ""
                  })
                  .then(() => {
                    delete req.session.security_code;
                    res.end("true");
                  })
                  .catch(err => console.log(err));
              else res.end("Link is inactive");
            })
            .catch(err => console.log(err));
        else res.end("incorrect_pass");
      else res.end("null_data");
    else if (req.session.passport.user) {
      if (req.body.currentpass && req.body.newpass)
        User.findOne({ where: { UserId: req.session.passport.user } })
          .then(user => {
            if (user) {
              if (
                Hash.verify(req.body.currentpass, user.dataValues.UserPassword)
              ) {
                if (req.body.newpass.length > 5)
                  user
                    .update({ UserPassword: Hash.generate(req.body.newpass) })
                    .then(() => {
                      res.end("true");
                    })
                    .catch(err => console.log(err));
                else res.end("short_pass");
              } else res.end("incorrect_pass");
            } else res.end("false");
          })
          .catch(err => console.log(err));
      else res.end("need_pass");
    } else res.end("false");
  });

module.exports = router;