import ui.View;
import ui.ImageView;
import ui.ImageScaleView;
import ui.TextView;
import animate;
import src.util as util;

/* 
 * The title screen is added to the scene graph when it becomes
 * a child of the main application
 */
exports = Class(ui.View, function(supr) {
	
	this.init = function(opts) {
		
		opts = merge(opts, {
			x: 0,
			y: 0,
			image: "resources/images/splatterball.png"
		});		

		supr(this, 'init', [opts]);

		this.build();
	};

	this.build = function() {
		
		// background
		this._bg = new ui.ImageScaleView({
			superview: this,
			x: 0,
			y: 0,
			width: this.style.width,
			height: this.style.height,
			scaleMethod: 'stretch',
			image: 'resources/images/splatterball.png'
		});
		
		// tap to start text
		var sy = util.scaleY(800);
		this._startText = new ui.TextView({
			superview: this,
			x: 0,
			y: sy,
			width: this.style.width,
			height: 50,
			autoSize: false,
			size: 38,
			layout: 'box',
			wrap: true,
			color: '#FFFFFF',
			fontFamily: 'PressStart2P'
		});
		this._startText.setText(util.text.START)
		util.pulse.call(this._startText);
		
		// input catcher
		this._startButton = new ui.View({
			superview: this,
			x: 0,
			y: 0,
			width: this.style.width,
			height: this.style.height
		});

		/* 
		 * Listening for a touch or click event, and will dispatch a
		 * custom event to the title screen, which is listened for in
		 * the top-level application file.
		 */
		this._startButton.on('InputSelect', bind(this, function () {
			this.emit('titlescreen:start');
		}));
	};
});


