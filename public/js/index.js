$(document).ready(function() {
    $('.cta').on('click', function() {
        setTimeout(() => {
            $("#sign-up-name").focus();
        }, 0);
    });

    $('.sign-up-form').submit(function() {
        let form = $(this).serializeArray();
        if (form[2].value == form[3].value)
        {

        }
        else
            Swal.fire('', 'Пароли должны совпадать', 'info')
    })
})