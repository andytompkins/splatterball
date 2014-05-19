import AudioManager;

exports.sound = null;

var music = [
	{ 'name': 'bubbles', 		'level': 0, 	'length': 134 },
	{ 'name': 'bacteriallove', 	'level': 1, 	'length': 263 },
	{ 'name': 'missingyou', 	'level': 2, 	'length': 257 },
	{ 'name': 'pirate', 		'level': 3, 	'length': 244 },
	{ 'name': 'airbrushed', 	'level': 4, 	'length': 237 },
	{ 'name': 'pleasures', 		'level': 5, 	'length': 231 },
	{ 'name': 'raceway', 		'level': 6, 	'length': 212 },
	{ 'name': 'eastyboys',	 	'level': 7, 	'length': 201 },
	{ 'name': 'florafauna', 	'level': 8, 	'length': 197 },
	{ 'name': 'leafless', 		'level': 9, 	'length': 196 },
	{ 'name': '2nrobot', 		'level': 10, 	'length': 193 },
	{ 'name': 'melodious', 		'level': 11, 	'length': 184 },
	{ 'name': 'skateboard', 	'level': 12, 	'length': 181 },
	{ 'name': 'chipcore', 		'level': 13, 	'length': 175 },
	{ 'name': 'itcrowd', 		'level': 14, 	'length': 171 },
	{ 'name': 'videochallenge', 'level': 15, 	'length': 165 },
	{ 'name': 'control', 		'level': 16, 	'length': 164 },
	{ 'name': 'python', 		'level': 17, 	'length': 161 },
	{ 'name': 'stingop', 		'level': 18, 	'length': 160 },
	{ 'name': 'ladygreen', 		'level': 19, 	'length': 148 },
	{ 'name': 'konamized', 		'level': 20, 	'length': 109 }
];

var effects = [ 'cannon', 'pop' ];

var files = {};
	
for (var i = 0; i < music.length; i++) {
	var song = music[i];
	files[song.name] = {
		path: 'music',
		volume: 0.4,
		background: true,
		loop: true
	};
}
for (i = 0; i < effects.length; i++) {
	files[effects[i]] = {
		path: 'effect',
		background: false
	};
}

exports.getLevelTime = function(level) {
	return music[level].length;
};
exports.getMusic = function(level) {
	return music[level].name;
};

/* 
 * Initialize the audio files if they haven't been already.
 */
exports.getSound = function() {

  if (!exports.sound) {
    exports.sound = new AudioManager({
      path: 'resources/sounds',
      files: files
    });
  }
  return exports.sound;
};
