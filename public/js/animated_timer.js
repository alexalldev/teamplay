var animated_timer_value = 5; //Указывается при вызове
var animated_timer_step = 5 //Указывается при вызове

function startTimer(time) {
    window.animated_timer_value = time;
    window.animated_timer_step = time;
    $('.circle_animation').css('stroke-dashoffset', 284);
    var interval = setInterval(function() {
            $('h2').text(animated_timer_step);
            if (animated_timer_step == 0) {  	
        clearInterval(interval);
                return;
        }
        $('.circle_animation').css('stroke-dashoffset', 284 + (440-((animated_timer_step - 1)*(440/animated_timer_value))) - (284-((animated_timer_step - 1)*(284/animated_timer_value))));
        animated_timer_step--;
    }, 1000);
}