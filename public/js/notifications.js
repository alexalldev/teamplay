const notifcationModel = require('../../models/Notification')
notification = {
    senderId: 1,
    receiverId: 1,
    header: 'Lorem',
    mainText: 'Ipsum',
    isInfoNotification: true,
    isRead: 0
}

module.exports = function (callback) {
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