import device;
import ui.View;
import animate;

var lang = 'en';

/*
 * Strings
 */
var localized_strings = {
	en: {
		START: "Tap to Start",
		READY: "Ready",
		SET: "Set",
		GO: "Go!",
		GAME_WON: "WINNER!",
		GAME_OVER: "Game Over",
		PLAY_AGAIN: "Tap to play again",
		HIGH_SCORE: "New high score!"
	}
};


exports.getCannonX = function() { return 192; }
exports.getCannonY = function() { return 788; }

exports.scaleX = function(x, range) {
	range = range || 576;
	return Math.floor((device.screen.width * x) / range);
};
exports.scaleY = function(y, range) {
	range = range || 1024;
	return Math.floor((device.screen.height * y) / range);
};

exports.unscaleX = function(sx, range) {
	range = range || 576;
	return Math.floor((sx * range) / device.screen.width);
};
exports.unscaleY = function(sy, range) {
	range = range || 1024;
	return Math.floor((sy * range) / device.screen.height);
};

exports.pulse = function() {
	animate(this).clear().now({opacity: 0}, 1000).then({opacity: 1}, 1000).then(exports.pulse.bind(this));
}

// object of strings used in game
exports.text = localized_strings[lang.toLowerCase()];


exports.getLevelBg = function(level) {
	var files = [	'1easter.png', '2egypt.png', '3fuji.png', '4rushmore.png', '5scotland.png', 
					'6stonehenge.png', '7tajmahal.png', '8machu.png', '9sydney.png', '10greatwall.png', 
					'11eiffel.png', '12moscow.png', '13chitza.png', '14santorini.png', '15pisa.png', 
					'16hagia.png', '17castle.png', '18everest.png', '19vicfalls.png', '20sagrada.png'
	];
	var l = level - 1;
	if (l < 0) { l = 0; }
	if (l > 19) { l = 19; }
	var fileName = files[l];
	return fileName;
};
