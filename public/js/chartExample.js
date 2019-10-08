var Color1 = RandomColor(255, 255, 255, 0.5);
var Color2 = RandomColor(255, 255, 255, 0.5);
var Color3 = RandomColor(255, 255, 255, 0.5);
var ctx = document.getElementsByClassName('myChart')[0].getContext('2d');
var chart = new Chart(ctx, {
    // The type of chart we want to create
    type: 'bar',

    // The data for our dataset
    data: {
        labels: ["Red", "Blue", "Yellow", "Green", "Purple", "Orange", "Red", "Blue", "Yellow", "Green", "Purple", "Orange"],
        datasets: [{
            label: '# of Votes',
            data: [12, 19, 3, 5, 2, 3, 12, 19, 3, 5, 2, 3],
            backgroundColor: Color1,
            borderColor: ChangeColorProportionally(Color1, 50),
            borderWidth: 2
        },
        {
            label: '# of Votes',
            data: [12, 19, 3, 5, 2, 3, 12, 19, 3, 5, 2, 3],
            backgroundColor: Color2,
            borderColor: ChangeColorProportionally(Color2, 50),
            borderWidth: 2
        },
        {
            label: '# of Votes',
            data: [12, 19, 3, 5, 2, 3, 12, 19, 3, 5, 2, 3],
            backgroundColor: Color3,
            borderColor: ChangeColorProportionally(Color3, 50),
            borderWidth: 2
        }]
    },
    options:
    {
        legend:
        {
            display: true,
            labels:
            {
                fontColor: 'rgb(255, 99, 132)'
            },
            onClick: function (e, p) {
                alert(p.text);
            }
        }
    }

});

function RandomColor(rmax, gmax, bmax, opacity) {
    return 'rgb(' + Math.round(Math.random() * rmax + 1) + ', ' + Math.round(Math.random() * gmax + 1) + ', ' + Math.round(Math.random() * bmax + 1) + ', ' + opacity + ')';
}

function ChangeColorProportionally(RgbColor, Percents) {
    var colors = String(String(RgbColor.split('(')[1]).split(')')).split(',');

    var opacity = colors[3];

    var R = Math.round((colors[0] * Percents) / 100) >= 0 && Math.round((colors[0] * Percents) / 100) <= 255
        ? Math.round((colors[0] * Percents) / 100) : colors[0];

    var G = Math.round((colors[1] * Percents) / 100) >= 0 && Math.round((colors[1] * Percents) / 100) <= 255
        ? Math.round((colors[1] * Percents) / 100) : colors[1];

    var B = Math.round((colors[2] * Percents) / 100) >= 0 && Math.round((colors[2] * Percents) / 100) <= 255
        ? Math.round((colors[2] * Percents) / 100) : colors[2];

    return 'rgb(' + R + ', ' + G + ', ' + B + ', ' + opacity + ')';
}
