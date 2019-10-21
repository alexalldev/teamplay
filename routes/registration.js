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

router.post("/RegisterNewUser", urlencodedParser, function(req, res) {
    if (req.body.password === req.body.confirmpassword) {
      if (req.body.password.length > 5) {
        if (validateEmail(req.body.email)) {
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
            `${__dirname}/../html_mail/TeamPlayVerificationEmail.html`,
            "utf-8",
            function(err, data) {
              if (err) res.end(JSON.stringify(err));
              let html_mail_array = data.split("CONFIRM_NEW_USER_BUTTON");
              let confirmation_hash = crypto
                .randomBytes(Math.ceil(120 / 2))
                .toString("hex") // convert to hexadecimal format
                .slice(0, 120);
              let html_mail = `${html_mail_array[0] + req.protocol}://${
                req.hostname
              }/ConfirmNewUserAccount?confirmation_type=email&security_code=${confirmation_hash}${
                html_mail_array[1]
              }`;
  
              const mailOptions = {
                from: '"Teamplay info" <info@teamplay.space>', // sender address
                to: req.body.email,
                subject: "Подтвердите регистрацию Teamplay", // Subject line
                html: html_mail
              };
  
              let UserFio = req.body.fullname.split(" ");
              if (
                UserFio.length == 3 &&
                UserFio[0] != "" &&
                UserFio[1] != "" &&
                UserFio[2] != ""
              )
                User.findOrCreate({
                  where: {
                    UserEmail: req.body.email.toLowerCase()
                  },
                  defaults: {
                    UserName:
                      UserFio[1].charAt(0).toUpperCase() +
                      UserFio[1].substring(1).toLowerCase(),
                    UserFamily:
                      UserFio[0].charAt(0).toUpperCase() +
                      UserFio[0].substring(1).toLowerCase(),
                    UserLastName:
                      UserFio[2].charAt(0).toUpperCase() +
                      UserFio[2].substring(1).toLowerCase(),
                    UserPassword: Hash.generate(req.body.password),
                    UserRegistrationToken: confirmation_hash
                  }
                })
                  .then(([user, created]) => {
                    if (created == true) {
                      transporter.sendMail(mailOptions, error => {
                        if (error) {
                          return res.end(JSON.stringify(error));
                        }
                        res.end("true");
                      });
                    } else {
                      res.end("user_exists");
                    }
                  })
                  .catch(err => console.log(err));
              else res.end("incorrect_fio");
            }
          );
        } else res.end("incorrect_email");
      } else res.end("poor_password");
    } else res.end("incorrect_confirm_password");
  });
  
  router.get("/ConfirmNewUserAccount", function(req, res) {
    if (req.query.confirmation_type == "email")
      if (req.query.security_code != "")
        User.findOne({
          where: { UserRegistrationToken: req.query.security_code }
        })
          .then(user => {
            if (user) {
              user
                .update({
                  UserRegistrationToken: "",
                  UserIsActive: true
                })
                .then(() => {
                  req.logIn(user, function(err) {
                    if (err) throw err;
                    else res.redirect("/");
                  });
                });
            } else res.redirect("/");
          })
          .catch(err => console.log(err));
  });

module.exports = router;