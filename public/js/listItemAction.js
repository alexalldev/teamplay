function teamInvite(userId) {
	(async () => {
		const { value: text } = await Swal.fire({
			title: '',
			html: `<label for="swal-input1">Заголовок</label>
            <input id="swal-input1" class="swal2-input">
            <label for="swal-input2">Основной текст</label>
            <input id="swal-input2" class="swal2-input">`,
			focusConfirm: false,
			preConfirm: () => {
				return [
					document.getElementById('swal-input1').value,
					document.getElementById('swal-input2').value
				];
			}
		});
		console.log(text);
		if (text) {
			$.ajax({
				type: 'POST',
				url: '/getCurrUserId',
				success: function(session) {
					$.ajax({
						type: 'POST',
						url: '/teamOperation/invite',
						dataType: 'text',
						data: {
							senderId: session.userId,
							receiverId: userId,
							header: text[0],
							mainText: text[1],
							isInfoNotification: false,
							shouldCreate: 'true'
						},
						success: function(data) {},
						error: function(xhr, str) {
							alert(`Возникла ошибка: ${str} ${xhr.responseCode}`);
						}
					});
				},
				error: function(xhr, str) {
					alert(`Возникла ошибка: ${str} ${xhr.responseCode}`);
				}
			});
		}
	})();
}
