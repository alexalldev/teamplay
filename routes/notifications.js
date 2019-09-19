const {
    router,
    urlencodedParser
} = require('../config/routers-config')

const notification = require('../modules/teamplay-norifications');

router.get('/notification', function (req, res) {
    res.render('notifications')
})

router.post('/sendNotification', urlencodedParser, async function (req, res) {
    notification(11, 'Head', 'Text', true, function(err) {
        if (err)
            res.end(JSON.stringify(err));
        else
            res.end('true');
    });
})

module.exports = router