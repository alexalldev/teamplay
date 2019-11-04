var Color1 = Color2 = Color3 = '#397798';
var ctx = document.getElementsByClassName('myChart')[0].getContext('2d');
var chart = new Chart(ctx, {
    // The type of chart we want to create
    type: 'bar',

    // The data for our dataset
    data: {
        labels: ["01—10.09 2019", "11—20.09 2019", "21—30.09 2019", "01—10.10 2019", "11—20.10 2019", "21—31.10 2019"],
        datasets: [{
            label: 'количество игр за 10 дней',
            data: [0, 8, 12, 15, 11, 18],
            backgroundColor: Color1,
            borderColor: Color1,
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
                fontColor: 'black'
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
