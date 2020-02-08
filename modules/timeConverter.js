module.exports = function timeConverter(unixTimestamp) {
  const date = new Date(unixTimestamp * 1000);
  const months = [
    "Январь",
    "Февраль",
    "Март",
    "Апрель",
    "Май",
    "Июнь",
    "Июль",
    "Август",
    "Сентябрь",
    "Октябрь",
    "Ноябрь",
    "Декабрь"
  ];
  const year = date.getFullYear();
  const month = date.getMonth();
  const textMonth = months[month];
  let hours = date.getHours();
  hours = hours < 10 ? `0${hours}` : hours;
  const dayOfMonth = date.getDate();
  let minutes = date.getMinutes();
  minutes = minutes < 10 ? `0${minutes}` : `${minutes}`;
  const time = `${hours}:${minutes}`;
  return { time, textMonth, month, dayOfMonth, year, hours, minutes };
};
