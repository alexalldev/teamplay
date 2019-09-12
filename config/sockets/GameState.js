function GameState() {
    this.Answering = 'Answering';
    this.Selection = 'Selection';
    this.Pause = 'Pause';

    this.Change = function(state) {
        console.log(state);
    }
}

module.exports = GameState;