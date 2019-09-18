$(function () {

    $(document).ready(function () {
        $.ajax({
            type: "POST",
            url: '/getNotification',
            data: {},
            dataType: 'json',
            success: async function (data) {
                console.log('data:')
                console.log(data)
                var page = "<span class='h1 notification-header'>" + data.header + "</span><span class='h3 notification-mainText'>" + data.mainText + "</span><span class='h6 notification-from-to'>" + "from:" + data.senderId + ":" + "to:" + data.receiverId + "</span><input type='submit' value='Accept'><input type='submit' value='Reject'>"
                //TODO: аякс запрос при нажатии на кнопку
                $('#notificationForm').append(page)
            },
            error: function (xhr, str) {
                alert('Возникла ошибка: ' + xhr.responseCode);
            }
        });
        $('#notificationForm').on("submit", function (event) {
            var res = ($(document.activeElement).val()).toLowerCase()
            //TODO: без if
            if (res == 'accept' || res == 'ok') {
                console.log(true)
            } else if (res == 'reject') {
                console.log(false)
            }
            window.location.replace("");
            event.preventDefault()
        })
    });
}); 