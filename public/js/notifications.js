const notifcationModel = require('./../../models/Notification')

module.exports = function (notification, callback) {
    notifcationModel.create({
        senderId: notification.senderId,
        receiverId: notification.receiverId,
        header: notification.header,
        mainText: notification.mainText,
        isInfoNotification: notification.isInfoNotification,
        isRead: notification.isRead
    })
        .then(result => {
            return callback(result)
        })

}