import device;
import ui.StackView as StackView;
import ui.ImageScaleView;
import src.TitleScreen as TitleScreen;
import src.GameScreen as GameScreen;
import src.soundcontroller as soundcontroller;
import src.util as util;

exports = Class(GC.Application, function () {

	/* Run after the engine is created and the scene graph is in
	 * place, but before the resources have been loaded.
	 */
	this.initUI = function () {
		
		var scale = Math.min(this.view.style.width / device.screen.width, 
							 this.view.style.height / device.screen.height);
		var width = this.view.style.width * scale;
		var height = this.view.style.height * scale;
		
		//Add a new StackView to the root of the scene graph
		var rootView = new StackView({
			superview: this.view,
			scale: scale,
			x: 0,
			y: 0,
			width: device.screen.width,
			height: device.screen.height
		});
		
		var titlescreen = new TitleScreen({
			width: device.screen.width,
			height: device.screen.height
		});
		var gamescreen = new GameScreen({
			width: device.screen.width,
			height: device.screen.height
		});
		var studioSplash = new ui.ImageScaleView({
			scaleMethod: 'stretch',
			image: 'resources/images/whispersoft.png'
		});
		
		var sound = soundcontroller.getSound();
		
		rootView.push(studioSplash);
		
		setTimeout(function() {
			rootView.pop();
			rootView.push(titlescreen);
			sound.play(soundcontroller.getMusic(0));
		}, 1500);		

		/* Listen for an event dispatched by the title screen when
		 * the start button has been pressed. Hide the title screen,
		 * show the game screen, then dispatch a custom event to the
		 * game screen to start the game.
		 */
		titlescreen.on('titlescreen:start', function () {
			sound.stop(soundcontroller.getMusic(0));
			rootView.push(gamescreen);
			gamescreen.emit('app:start');
		});

		/* When the game screen has signalled that the game is over,
		 * show the title screen so that the user may play the game again.
		 */
		gamescreen.on('gamescreen:end', function () {
			rootView.pop();
			
			sound.play(soundcontroller.getMusic(0));
		});
	};

	/* Executed after the asset resources have been loaded.
	 * If there is a splash screen, it's removed.
	 */
	this.launchUI = function () {};
});
