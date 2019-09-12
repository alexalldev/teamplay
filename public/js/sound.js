function PlaySound(soundName) {
    var audio = new Audio(); // Создаём новый элемент Audio
    audio.src = '/public/sounds/'+ soundName +'.mp3'; // Указываем путь к звуку "клика"
    audio.autoplay = true; // Автоматически запускаем
}