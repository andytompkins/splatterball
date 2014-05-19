import animate;
import device;
import ui.View;
import ui.ImageView;
import ui.ImageScaleView;
import ui.resource.Image as Image;
import src.soundcontroller as soundcontroller;
import src.util as util;
import math.geom.Line as Line;
import math.geom.Point as Point;

var whole_cannon = new Image({url: "resources/images/cannon2.png"});//lazily using this for sizing
var boxWidth = whole_cannon.getWidth();
var boxHeight = whole_cannon.getHeight();

var cannon_base_img = new Image({url: "resources/images/cannonbase.png"});
var cannon_barrel_img = new Image({url: "resources/images/cannonbarrel.png"});

var baseWidth = cannon_base_img.getWidth();
var baseHeight = cannon_base_img.getHeight();
		
var bx = 0;
var by = boxHeight - baseHeight;

var barrelWidth = cannon_barrel_img.getWidth();
var barrelHeight = cannon_barrel_img.getHeight();
		
var cx = Math.floor((baseWidth - barrelWidth) / 2);
var cy = 0;
var ax = Math.floor(barrelWidth / 2);
var ay = barrelHeight;

var scaled_ax = util.scaleX(util.getCannonX() + ax);
var scaled_ay = util.scaleY(util.getCannonY() + ay);

exports = Class(ui.View, function (supr) {

	this.init = function (opts) {
		opts = merge(opts, {
			width:	boxWidth,
			height: boxHeight
		});

		supr(this, 'init', [opts]);

		this.build();
	};

	this.fireCannon = function() {
		var bh = this._cannon.style.height;
		var absAngle = Math.abs(this._cannon.style.r);
		var opp = Math.sin(absAngle) * bh;
		var adj = Math.cos(absAngle) * bh;
		var bubbleX = scaled_ax + opp;
		if (this._cannon.style.r < 0) {
			bubbleX = scaled_ax - opp;
		}
		var bubbleY = scaled_ay - adj;
		this.emit('cannon:fire', new Point(scaled_ax, scaled_ay), this._cannon.style.r, new Point(bubbleX, bubbleY));
	};
	
	this.moveCannon = function(event, point) {
		var scaled_py = util.scaleY(util.getCannonY()) + point.y;
		var opp = new Line(point.x, scaled_py, scaled_ax, scaled_py);
		var adj = new Line(scaled_ax, scaled_ay, scaled_ax, scaled_py);
		var angle = Math.atan(opp.getLength() / adj.getLength());
		if (point.x < scaled_ax) { angle = 0.0 - angle; }
		
		this._animator.now({r: angle});
	};
	
	/*
	 * Layout subviews
	 */
	this.build = function () {

		this._cannonbase = new ui.ImageScaleView({
			superview: this,
			zIndex: 1,
			image: cannon_base_img,
			x: util.scaleX(bx),
			y: util.scaleY(by),
			width: util.scaleX(baseWidth),
			height: util.scaleY(baseHeight),
			scaleMethod: 'stretch'
		});

		this._cannon = new ui.ImageScaleView({
			superview: this,
			zIndex: 0,
			image: cannon_barrel_img,
			x: util.scaleX(cx),
			y: util.scaleY(cy),
			anchorX: util.scaleX(ax),
			anchorY: util.scaleY(ay),
			width: util.scaleX(barrelWidth),
			height: util.scaleY(barrelHeight),
			scaleMethod: 'stretch'
		});

		this._animator = animate(this._cannon);
		this._interval = null;
	};
});
