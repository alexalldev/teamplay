$(document).ready(function() {
  const ptrn = /user\/\d$/i;
  userUrl = ptrn.exec(window.location.href)[0];
  socket.emit("GetStatData", userUrl[userUrl.length - 1]);
});
socket.on("SendStatData", datesGamesTeamResults => {
  const Color1 = (Color2 = Color3 = "#397798");
  const ctx = document.getElementsByClassName("myChart")[0].getContext("2d");
  const chart = new Chart(ctx, {
    // The type of chart we want to create
    type: "bar",
    // The data for our dataset
    data: {
      labels: datesGamesTeamResults.map(
        dateGameTeamResult =>
          `${dateGameTeamResult.date.month}, ${dateGameTeamResult.date.year}`
      ),
      datasets: [
        {
          label: "Количество игр в месяц",
          data: datesGamesTeamResults.map(
            dateGameTeamResult => dateGameTeamResult.number
          ),
          backgroundColor: Color1,
          borderColor: Color1,
          borderWidth: 2
        }
      ]
    },
    options: {
      legend: {
        display: true,
        labels: {
          fontColor: "black"
        }
      },
      scales: {
        yAxes: [
          {
            ticks: {
              min: 0,
              stacked: true
            }
          }
        ]
      }
    }
  });
  function RandomColor(rmax, gmax, bmax, opacity) {
    return `rgb(${Math.round(Math.random() * rmax + 1)}, ${Math.round(
      Math.random() * gmax + 1
    )}, ${Math.round(Math.random() * bmax + 1)}, ${opacity})`;
  }

  function ChangeColorProportionally(RgbColor, Percents) {
    const colors = String(String(RgbColor.split("(")[1]).split(")")).split(",");

    const opacity = colors[3];

    const R =
      Math.round((colors[0] * Percents) / 100) >= 0 &&
      Math.round((colors[0] * Percents) / 100) <= 255
        ? Math.round((colors[0] * Percents) / 100)
        : colors[0];

    const G =
      Math.round((colors[1] * Percents) / 100) >= 0 &&
      Math.round((colors[1] * Percents) / 100) <= 255
        ? Math.round((colors[1] * Percents) / 100)
        : colors[1];

    const B =
      Math.round((colors[2] * Percents) / 100) >= 0 &&
      Math.round((colors[2] * Percents) / 100) <= 255
        ? Math.round((colors[2] * Percents) / 100)
        : colors[2];

    return `rgb(${R}, ${G}, ${B}, ${opacity})`;
  }
});
