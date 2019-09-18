const {
    router,
    passport,
    Team,
    Player,
    urlencodedParser
} = require('../config/routers-config')

const notifcationModel = require('./../models/Notification')

const nodeMailer = require('nodemailer')

let transporter = nodeMailer.createTransport({
    host: 'mail.alexall.dev',
    port: 465,
    secure: true,
    auth: {
        user: 'info@teamplay.space',
        pass: 'teamplayspace'
    }
})

router.get('/notification', function (req, res) {
    res.render('notifications')
})

router.post('/getNotification', urlencodedParser, async function (req, res) {

    let info = await transporter.sendMail({
        from: 'info@teamplay.space', // sender address
        to: 'ilubvys@gmail.com', // list of receivers
        subject: 'Hello' // Subject line
    })
    console.log('req.body')
    console.log(req.body)

    notifcationModel.create({
        senderId: req.body.senderId,
        receiverId: req.body.receiverId,
        header: req.body.header,
        mainText: req.body.mainText,
        isInfoNotification: req.body.isInfoNotification,
        isRead: req.body.isRead
    })
        .then(result => {
            console.log('result')
            console.log(result)
            res.json(result)
        })
        .catch(err => {
            console.log(err)
        })
})

module.exports = router