import animate;
import device;
import ui.View;
import ui.ImageView;
import ui.ImageScaleView;
import ui.SpriteView;
import ui.TextView;
import ui.StackView as StackView;
import ui.resource.Image as Image;
import ui.ParticleEngine as ParticleEngine;
import math.geom.Point as Point;
import math.geom.Rect as Rect;
import math.geom.intersect as intersect;
import src.entities.Cannon as Cannon;
import src.util as util;
import src.soundcontroller as soundcontroller;

var __debug = false;

var demo_mode = false;

var score = 0;
var high_score = 30;
var game_on = false;
var game_won = false;

var sound = soundcontroller.getSound();

var level = 1;
var game_length =  0; // millis
var countdown_secs = 0; // secs

var gridX = 34;
var gridY = 114;
var gridRows = 16;
var gridRowThreshold = 10;
var magazineSize = 3;
var bubbleColors = 3;
if (demo_mode) { bubbleColors = 1; }
var rowsToFill = 4;

var clockTick = null;
var gameLenTimer = null;
var warningTimer = null;


exports = Class(ui.View, function (supr) {
	
	/*
	 * Init
	 */
	this.init = function(opts) {
		opts = merge(opts, {
			x: 0,
			y: 0,
			width: 320,
			height: 480
		});
		supr(this, 'init', [opts]);

		this.build();
	};
	
	/*
	 * Setup level backgrounds
	 */
	this.initBackgrounds = function() {
		
		this._bg = new StackView({
			superview: this,
			x: 0,
			y: 0,
			width: device.screen.width,
			height: device.screen.height
		});
		
		this._backgrounds = [];
		
		for (var i = 1; i <= 20; i++) {
			var img = util.getLevelBg(i);
			var imgFile = 'resources/images/backgrounds/' + img;
			
			this._backgrounds.push(new ui.ImageScaleView({
				zIndex: -1,
				scaleMethod: 'stretch',
				image: imgFile
			}));
		}
	};

	/*
	 * Load a bubble from the never-ending random magazine
	 */
	this.loadBubble = function() {
		this.magazine.push(Math.floor((Math.random() * bubbleColors)));
		return this.magazine.shift();
	};
	
	/*
	 * Create bubble at x,y with color
	 */
	this.makeBubble = function(bx, by, color) {
		var w = util.scaleX(64);
		var h = util.scaleY(64);
		var bubble = new ui.SpriteView({
			superview: this,
			zIndex: 1,
			x: bx,
			y: by,
			width: w,
			height: h,
			autoSize: false,
			sheetData: {
				url: 'resources/images/bubblesheet.png',
				sheetWidth: 6,
				sheetHeight: 1,
				width: 64,
				height: 64,
				anims: {
					still: [ [color, 0] ]
				}
			},
			defaultAnimation: 'still',
			autoStart: true
		});
		return {
			view: bubble,
			color: color,
			angle: 0.0,
			speed: 0.0
		};
	};
	
	/*
	 * Fire a bubble from the cannon
	 */
	this.launchBubble = function(origin, angle, barrel) {
		
		var color = this.loadBubble();
		this.updatePreview();

		var x = barrel.x + util.scaleX(32);
		var y = barrel.y - util.scaleY(32);
		
		sound.play('cannon');
		
		var bubbleObj = this.makeBubble(x, y, color);
		bubbleObj.angle = angle;
		bubbleObj.speed = util.scaleY(1024); // pix per sec

		if (__debug)
			console.log("LAUNCH BUBBLE at (" + x + "," + y + ") with size (" + w + "," + h + ")");
		
		var opp = origin.y * Math.tan(Math.abs(angle));		
		var hyp = opp / Math.sin(Math.abs(angle));
		if (opp === 0.0 || hyp === 0.0) {
			hyp = origin.y;
		}
		var animTime = (hyp / bubbleObj.speed) * 1000;
		
		var tx = origin.x + opp;
		if (angle < 0) {
			tx = origin.x - opp;
		}
		var ty = 0;
		
		this._activeBubble = bubbleObj;
		this._activeBubbleAnim = animate(bubbleObj.view);
		this._activeBubbleAnim.now({x: tx, y: ty}, animTime, animate.linear).then(bind(this, function() {
			this._activeBubble = null;
		}));
	};
	
	/*
	 * Burst bubble at x,y with color and score points
	 */
	this.explodeBubble = function(ex, ey, color, points) {
		var that = this;
		var ew = util.scaleX(128);
		var eh = util.scaleY(128);
		
		var bubbleExplosion = new ui.SpriteView({
			superview: this,
			zIndex: 1,
			x: ex,
			y: ey,
			width: ew,
			height: eh,
			autoSize: false,
			sheetData: {
				url: 'resources/images/bubble-explosions.png',
				sheetWidth: 3,
				sheetHeight: 6,
				width: 128,
				height: 128,
				anims: {
					explode: [ [0, color], [1, color], [2, color] ]
				}
			},
			defaultAnimation: 'explode',
			autoStart: false
		});
		
		sound.play('pop');
		
		(function(bExp) {
			bExp.startAnimation('explode', {
				iterations: 1,
				loop: false,
				delay: 100,
				callback: function() {
					that.removeSubview(bExp);
					score += points;
					that._scoreboard.setText(score.toString());
				}
			});
		}(bubbleExplosion));
	};
	
	/*
	 * Update magazine upcoming bubbles preview
	 */
	this.updatePreview = function() {
		var cannonRect = this._cannon.getBoundingShape();
		var x = cannonRect.x + util.scaleX(64);  // 64
		var y = cannonRect.y + util.scaleY(114); // 128
		
		if (this._bubblePreview1 !== null) {
			this.removeSubview(this._bubblePreview1);
		}
		this._bubblePreview1 = new ui.SpriteView({
			superview: this,
			zIndex: 3,
			x: x,
			y: y,
			scale: 0.9,
			width: util.scaleX(64),
			height: util.scaleY(64),
			autoSize: false,
			sheetData: {
				url: 'resources/images/bubblesheet.png',
				sheetWidth: 6,
				sheetHeight: 1,
				width: 64,
				height: 64,
				anims: {
					still: [ [this.magazine[0], 0] ]
				}
			},
			defaultAnimation: 'still',
			autoStart: true
		});
		
		x += util.scaleX(48);
		y += util.scaleY(56);
		if (this._bubblePreview2 !== null) {
			this.removeSubview(this._bubblePreview2);
		}
		this._bubblePreview2 = new ui.SpriteView({
			superview: this,
			zIndex: 3,
			x: x,
			y: y,
			scale: 0.6,
			width: util.scaleX(64),
			height: util.scaleY(64),
			autoSize: false,
			sheetData: {
				url: 'resources/images/bubblesheet.png',
				sheetWidth: 6,
				sheetHeight: 1,
				width: 64,
				height: 64,
				anims: {
					still: [ [this.magazine[1], 0] ]
				}
			},
			defaultAnimation: 'still',
			autoStart: true
		});
		
		x += util.scaleX(48);
		y += util.scaleY(32);
		if (this._bubblePreview3 !== null) {
			this.removeSubview(this._bubblePreview3);
		}
		this._bubblePreview3 = new ui.SpriteView({
			superview: this,
			zIndex: 3,
			x: x,
			y: y,
			scale: 0.3,
			width: util.scaleX(64),
			height: util.scaleY(64),
			autoSize: false,
			sheetData: {
				url: 'resources/images/bubblesheet.png',
				sheetWidth: 6,
				sheetHeight: 1,
				width: 64,
				height: 64,
				anims: {
					still: [ [this.magazine[2], 0] ]
				}
			},
			defaultAnimation: 'still',
			autoStart: true
		});
	};
	
	/*
	 * Make the bubble grid
	 */
	this.buildGrid = function() {
		var numRows = gridRows;
		this.grid = [];
		for (var i = 0; i < numRows; i++) {
			this.grid[i] = [];
			var numCols = 8;
			var rowOffset = 0;
			if (i % 2 !== 0) {
				numCols = 7;
				rowOffset = 32;
			}
			for (var j = 0; j < numCols; j++) {
				var sx = util.scaleX(gridX + rowOffset + (j * 64));
				var sy = util.scaleY(gridY + (i * 64));
				var sw = util.scaleX(64);
				var sh = util.scaleY(64);
				var slot = new Rect(sx, sy, sw, sh);
				var bubble = null;
				if (i < rowsToFill) {
					var color = Math.floor((Math.random() * bubbleColors));
					bubble = this.makeBubble(sx, sy, color);
				}
				var slotObj = {
					bubble: bubble,
					pop: false,
					attached: false,
					bounds: slot
				}
				this.grid[i][j] = slotObj;
				
				/*
				// used for debugging the grid placement
				this.addSubview(new ui.View({
					zIndex: 25,
					x: sx,
					y: sy,
					width: sw,
					height: sh,
					backgroundColor: '#00FF00'
				}));
				*/
			} 
		}
	};
	
	/*
	 * Load the background for this level
	 */
	this.setBackground = function() {
		var l = level - 1;
		if (l < 0) { l = 0; }
		if (l > 19) { l = 19; }
		
		this._bg.popAll();
		this._bg.push(this._backgrounds[l]);
	};
	
	/*
	 * Layout the grid and views
	 */
	this.build = function () {
		this.collide = true;
		this._activeBubble = null;
		this._activeBubbleAnim = null;
		
		// bubble grid
		this.buildGrid();
		
		// magazine
		this.magazine = [];
		for (i = 0; i < magazineSize; i++) {
			this.magazine[i] = Math.floor((Math.random() * bubbleColors));
		}
		
		// frame
		this._frame = new ui.ImageScaleView({
			superview: this,
			zIndex: 0,
			x: 0,
			y: 0,
			width: this.style.width,
			height: this.style.height,
			scaleMethod: 'stretch',
			image: 'resources/images/sandbags.png'
		});
		
		
		// the start event is emitted from the start button via the main application
		this.on('app:start', start_game_flow.bind(this));
		
		
		// next level event is emitted from the pop check routine
		this.on('next:level', next_level.bind(this));

		// cannon
		var cx = util.scaleX(util.getCannonX());
		var cy = util.scaleY(util.getCannonY());
		if (__debug)
			console.log("cannon at: (" + cx + "," + cy + ")");
		
		this._cannon = new Cannon({
			superview: this,
			x: cx,
			y: cy
		});
		
		this._cannon.on('cannon:fire', bind(this, function(origin, angle, barrel) {
			if (game_on && this._activeBubble === null) {
				if (__debug)
					console.log('cannon fire from (' + origin.x + ',' + origin.y + ') at ' + angle + ' rads');
				this.launchBubble(origin, angle, barrel);
			}
		}));
		
		// bubble previews
		this._bubblePreview1 = null;
		this._bubblePreview2 = null;
		this._bubblePreview3 = null;
		this.updatePreview();
		
		// input catcher
		this._inputview = new ui.View({
			superview: this,
			zIndex: 10,
			x: 0,
			y: cy,
			width: device.screen.width,
			height: device.screen.height - cy
		});
		
		this._inputview.on('InputMove', bind(this._cannon, 'moveCannon'));
		this._inputview.on('InputSelect', bind(this._cannon, 'fireCannon'));
		
		// collision views
		this._leftWall = new ui.View({
			superview: this,
			zIndex: -1,
			x: util.scaleX(0),
			y: util.scaleY(96),
			width: util.scaleX(20),
			height: util.scaleY(916)
		});
		this._rightWall = new ui.View({
			superview: this,
			zIndex: -1,
			x: util.scaleX(556),
			y: util.scaleY(96),
			width: util.scaleX(20),
			height: util.scaleY(916)
		});
		this._ceiling = new ui.View({
			superview: this,
			zIndex: -1,
			x: util.scaleX(0),
			y: util.scaleY(0),
			width: util.scaleX(576),
			height: util.scaleY(114)
		});
		
		
		// the scoreboard displays the "ready, set, go" message, and then the current score
		this._scoreboard = new ui.TextView({
			superview: this,
			x: 0,
			y: util.scaleY(42),
			width: this.style.width,
			height: util.scaleY(50),
			color: '#000000',
			fontFamily: 'PressStart2P'
		});

		//Set up countdown timer
		this._countdown = new ui.TextView({
			superview: this,
			visible: false,
			x: device.screen.width - util.scaleX(110),
			y: util.scaleY(10),
			width: util.scaleX(100),
			height: util.scaleY(100),
			color: '#000000',
			verticalAlign: 'top',
			horizontalAlign: 'right',
			fontFamily: 'PressStart2P'
		});
		
		// level display
		this._level = new ui.TextView({
			superview: this,
			visible: false,
			x: util.scaleX(10),
			y: util.scaleY(10),
			width: util.scaleX(150),
			height: util.scaleY(100),
			color: '#000000',
			verticalAlign: 'top',
			horizontalAlign: 'left',
			fontFamily: 'PressStart2P'
		});
		
		 // particle engine setup
		 this.pEngine = new ParticleEngine({
			 superview: this,
			 width: 1,
			 height: 1,
			 initCount: 100
		 });
		
	};
	
	/*
	 * Calculate grid slot from point
	 */
	this.getGridSlot = function(pt) {
		// calculate grid slot that it is in
		var row = Math.floor((pt.y - gridY) / 64);
		var rowOffset = 0;
		var odd = (row % 2 !== 0);
		if (odd) {
			rowOffset = 32;
		}
		var col = Math.floor((pt.x - (gridX + rowOffset)) / 64);
		if (__debug)
			console.log("slot " + row + "," + col);
		if (odd) {
			if (col < 0) { col = 0; }
			if (col > 6) { col = 6; }
		}
		if (row >= gridRowThreshold) {
			this.gameOver();
		}
		return new Point(row, col);
	};
	
	/*
	 * Get animation point for closest grid slot
	 */
	this.getGridAnimationPoint = function(bubbleObj) {
		var bubbleRect = bubbleObj.view.getBoundingShape();
		// get unscaled center pt of bubble
		var pt = bubbleRect.getCenter();
		var ux = util.unscaleX(pt.x);
		var uy = util.unscaleY(pt.y);
		var gridSlot = this.getGridSlot(new Point(ux, uy));
		var slotObj = this.grid[gridSlot.x][gridSlot.y];
		slotObj.bubble = bubbleObj;
		slotObj.pop = true;
		return slotObj.bounds.getCorner(Rect.CORNERS.TOP_LEFT);
	};
	
	/*
	 * Check for collisions of activeBubble and walls,ceiling,other bubbles
	 */
	this.checkCollision = function() {
		if (!game_on || this._activeBubble === null || this.collide === false) { 
			//console.log("checkCollision: bubble was null");
			return; 
		}
		
		var bubbleRect = this._activeBubble.view.getBoundingShape();
		var x, y, slotObj, bubbleObj, bubbleView, opp, hyp, animPoint, animTime, tx, ty;
		
		var leftRect = this._leftWall.getBoundingShape();
		if (intersect.rectAndRect(bubbleRect, leftRect)) {
			if (__debug)
				console.log('hit left wall');
			this._activeBubbleAnim.clear();
			x = leftRect.x + leftRect.width + 2;
			this._activeBubble.view.style.x = x;
			bubbleRect = this._activeBubble.view.getBoundingShape(); // it moved
			
			bubbleObj = this._activeBubble;
			bubbleObj.angle = Math.PI - bubbleObj.angle;
			opp = this._activeBubble.view.style.y * Math.tan(Math.abs(bubbleObj.angle));
			
			hyp = Math.abs(util.unscaleX(opp) / Math.sin(Math.abs(bubbleObj.angle)));
			animTime = (hyp / bubbleObj.speed) * 1000;
			if (__debug)
				console.log("animTime = " + animTime);
			
			tx = x + opp;
			if (bubbleObj.angle < 0) {
				tx = x - opp;
			}
			ty = 0;
			if (__debug)
				console.log("new anim to (" + tx + "," + ty + ")");
		
			this._activeBubbleAnim.now({x: tx, y: ty}, animTime, animate.linear).then(bind(this, function() {
				var gridSlot = this.getGridSlot(this._activeBubble.view.getBoundingShape().getCenter());
				var slotObj = this.grid[gridSlot.x][gridSlot.y];
				slotObj.bubble = this._activeBubble;
				slotObj.pop = true;
				this._activeBubble = null;
			}));
						
			return;
		}
		
		var rightRect = this._rightWall.getBoundingShape();
		if (intersect.rectAndRect(bubbleRect, rightRect)) {
			if (__debug)
				console.log('hit right wall');
			this._activeBubbleAnim.clear();
			x = rightRect.x - this._activeBubble.view.style.width - 2;
			if (__debug) {
				console.log("new x = " + x);
				console.log("old x = " + this._activeBubble.view.style.x);
			}
			this._activeBubble.view.style.x = x;
			bubbleRect = this._activeBubble.view.getBoundingShape(); // it moved
			
			bubbleObj = this._activeBubble;
			bubbleObj.angle = Math.PI - bubbleObj.angle;
			opp = this._activeBubble.view.style.y * Math.tan(Math.abs(bubbleObj.angle));
		
			hyp = Math.abs(util.unscaleX(opp) / Math.sin(Math.abs(bubbleObj.angle)));
			animTime = (hyp / bubbleObj.speed) * 1000;
			if (__debug)
				console.log("animTime = " + animTime);
			
			tx = x + opp;
			if (bubbleObj.angle < 0) {
				tx = x - opp;
			}
			ty = 0;
			if (__debug)
				console.log("new anim to (" + tx + "," + ty + ")");
		
			this._activeBubbleAnim.now({x: tx, y: ty}, animTime, animate.linear).then(bind(this, function() {
				var gridSlot = this.getGridSlot(this._activeBubble.view.getBoundingShape().getCenter());
				var slotObj = this.grid[gridSlot.x][gridSlot.y];
				slotObj.bubble = this._activeBubble;
				slotObj.pop = true;
				this._activeBubble = null;
			}));
			
			return;
		}
		
		var ceilingRect = this._ceiling.getBoundingShape();
		if (intersect.rectAndRect(bubbleRect, ceilingRect)) {
			//console.log('hit ceiling');
			this._activeBubbleAnim.clear();
			y = ceilingRect.y + ceilingRect.height - 2;
			//console.log('ceiling y barrier=' + y);
			//console.log('activeBubble.y=' + this._activeBubble.view.style.y);
			this._activeBubble.view.style.y = y;
			
			// snap to grid - animate bubble to slot
			animPoint = this.getGridAnimationPoint(this._activeBubble);
			//console.log("animPoint is " + animPoint.x + "," + animPoint.y);
			this.collide = false;
			this._activeBubbleAnim.now({x: animPoint.x, y: animPoint.y}).then(bind(this, function() {
				this._activeBubble = null;
				this.collide = true;
			}));
			return;
		}
		
		// bubble collisions
		for (var i = 0; i < this.grid.length; i++) {
			for (var j = 0; j < this.grid[i].length; j++) {
				slotObj = this.grid[i][j];
				if (slotObj.bubble === null) { continue; }
				bubbleView = slotObj.bubble.view;
				if (bubbleView.getTag() === this._activeBubble.view.getTag()) {
					continue; // don't collide with self
				}
				if (intersect.rectAndRect(bubbleRect, bubbleView.getBoundingShape())) {
					// snap to grid - animate bubble to slot
					animPoint = this.getGridAnimationPoint(this._activeBubble);
					//console.log("animPoint is " + animPoint.x + "," + animPoint.y);
					this.collide = false;
					this._activeBubbleAnim.now({x: animPoint.x, y: animPoint.y}).then(bind(this, function() {
						this._activeBubble = null;
						this.collide = true;
					}));
				}
			}
		}
		
		
		
	};
		
	/*
	 * Recursively finds grid slots from row,col and runs the action function
	 * action returns false to signal findMatches to return, and true to keep processing
	 */
	this.findMatches = function(row, col, action) {
		var slotObj = this.grid[row][col];
		if (!action(slotObj)) { return; }

		// left
		if (col - 1 >= 0) {
			this.findMatches(row, col - 1, action);
		}
		
		// right
		if (col + 1 < this.grid[row].length) {
			this.findMatches(row, col + 1, action);
		}
		
		if (row - 1 >= 0) {
			if (row % 2 === 0) { //even
				// up-left
				if (col - 1 >= 0) { this.findMatches(row - 1, col - 1, action); }
				// up-right
				if (col < this.grid[row - 1].length) { this.findMatches(row - 1, col, action); }
			} else { //odd
				// up-left
				this.findMatches(row - 1, col, action);
				// up-right
				this.findMatches(row - 1, col + 1, action);
			}
		}
		
		if (row + 1 < this.grid.length) {
			if (row % 2 === 0) { //even
				// down-left
				if (col - 1 >= 0) { this.findMatches(row + 1, col - 1, action); }
				// down-right
				if (col < this.grid[row + 1].length) { this.findMatches(row + 1, col, action); }
			} else { //odd
				// down-left
				this.findMatches(row + 1, col, action);
				// down-right
				this.findMatches(row + 1, col + 1, action);
			}
		}
	};
	
	/*
	 * Find bubbles that need popping
	 */
	this.popBubbles = function() {
		if (!game_on || this._activeBubble !== null) { 
			//console.log("popBubbles: bubble was active");
			return; 
		}
		
		var that = this;
		var i, j, slotObj;
		var ex, ey, color;
		
		for (i = this.grid.length - 1; i >= 0; i--) {
			for (j = this.grid[i].length - 1; j >= 0; j--) {
				slotObj = this.grid[i][j];
				if (slotObj.pop) {
					slotObj.pop = false; // findMatches will re-mark it
					
					this.findMatches(i, j, function(sObj) {
						if (sObj.pop) { return false; }
						if (sObj.bubble === null) { return false; }
						if (sObj.bubble.color === slotObj.bubble.color) { sObj.pop = true; return true; } else { return false; }
					});
				}
			}
		}
		
		// count pops
		var pops = 0;
		for (i = this.grid.length - 1; i >= 0; i--) {
			for (j = this.grid[i].length - 1; j >= 0; j--) {
				slotObj = this.grid[i][j];
				if (slotObj.pop) {
					pops++;
				}
			}
		}
		
		// perform pops
		if (pops >= 3) {
			for (i = this.grid.length - 1; i >= 0; i--) {
				for (j = this.grid[i].length - 1; j >= 0; j--) {
					slotObj = this.grid[i][j];
					if (slotObj.pop) {
						
						ex = slotObj.bubble.view.style.x - util.scaleX(32);
						ey = slotObj.bubble.view.style.y - util.scaleY(32);
						color = slotObj.bubble.color;
						
						this.removeSubview(slotObj.bubble.view);
						slotObj.bubble = null;
						slotObj.pop = false;
						
						this.explodeBubble(ex, ey, color, 10);

					}
				}
			}
		}
		
		// find floaters
		for (j = 0; j < this.grid[0].length; j++) { // top row is attached
			this.findMatches(0, j, function(sObj) {
				if (sObj.attached) { return false; }
				if (sObj.bubble === null) { return false; }
				sObj.attached = true;
				return true;
			});
		}
		
		// drop and pop
		var points = 10;
		var dropDistance = 100; // pix
		var dropRate = 200; // pix/sec
		for (i = this.grid.length - 1; i >= 0; i--) {
			for (j = this.grid[i].length - 1; j >= 0; j--) {
				slotObj = this.grid[i][j];
				if (slotObj.bubble === null) { continue; }
				if (!slotObj.attached) {
					//slotObj.attached = true;
					points *= 2;
					var animTime = (dropDistance / dropRate) * 1000;
					if (__debug)
						console.log("animTime = " + animTime);
								
					var ty = slotObj.bubble.view.style.y + util.scaleY(dropDistance);
					if (__debug)
						console.log("ty = " + ty);
					
					color = slotObj.bubble.color;
					
					var bubble = new ui.SpriteView({
						superview: this,
						zIndex: 1,
						x: slotObj.bubble.view.style.x,
						y: slotObj.bubble.view.style.y,
						width: slotObj.bubble.view.style.width,
						height: slotObj.bubble.view.style.height,
						autoSize: false,
						sheetData: {
							url: 'resources/images/bubblesheet.png',
							sheetWidth: 6,
							sheetHeight: 1,
							width: 64,
							height: 64,
							anims: {
								still: [ [color, 0] ]
							}
						},
						defaultAnimation: 'still',
						autoStart: true
					});
					
					this.removeSubview(slotObj.bubble.view);
					slotObj.bubble = null;
					
					(function(parent, bubl, clr){
						animate(bubl).now({y: ty}, animTime, animate.easeIn).then(bind(parent, function() {
							
							ex = bubl.style.x - util.scaleX(32);
							ey = bubl.style.y - util.scaleY(32);
							
							parent.removeSubview(bubl);
							
							parent.explodeBubble(ex, ey, clr, points);
						}));
					}(that, bubble, color));
					
				}
			}
		}
		
		// clear pop & attached flags	
		for (i = this.grid.length - 1; i >= 0; i--) {
			for (j = this.grid[i].length - 1; j >= 0; j--) {
				slotObj = this.grid[i][j];
				slotObj.pop = false;
				slotObj.attached = false;
			}
		}
		
		this.checkWin();

	};
	
	/*
	 * Check for level win
	 */
	this.checkWin = function() {
		
		for (i = 0; i < this.grid.length; i++) {
			for (j = 0; j < this.grid[i].length; j++) {
				slotObj = this.grid[i][j];
				if (slotObj.bubble !== null) {
					return;
				}
			}
		}
		this.emit('next:level');		
	};
	
	/*
	 * Run the collision and pop checks periodically
	 */
	this.tick = function(dt) {
		this.pEngine.runTick(dt);
		//var t0 = performance.now();
		this.checkCollision();
		//var t1 = performance.now();
		//var t = t1 - t0;
		//console.log("collision detection: " + t + "ms");
		//t0 = performance.now();
		this.popBubbles();
		//t1 = performance.now();
		//t = t1 - t0;
		//console.log("pop bubbles: " + t + "ms");
	};
	 
	/*
	 * End the game
	 */
	this.gameOver = function() {
		game_on = false;
		clearInterval(clockTick);
		clearTimeout(gameLenTimer);
		clearTimeout(warningTimer);
		setTimeout(end_game_flow.bind(this), 100);
		this._countdown.setText(":00");
	};
});

/*
 * Go to next level
 */
function next_level() {
		
	game_on = false;
	
	clearInterval(clockTick);
	clearTimeout(gameLenTimer);
	clearTimeout(warningTimer);
	sound.stop(soundcontroller.getMusic(level));
	
	var mid = Math.floor(device.screen.width / 2);
	
	// add imageview
	this._levelclear = new ui.ImageScaleView({
		superview: this,
		zIndex: 100,
		image: 'resources/images/levelclear.png',
		x: mid,
		y: util.scaleY(484),
		width: util.scaleX(576),
		height: util.scaleY(56),
		scaleMethod: 'stretch',
		scale: 0
	});
	
	// animate scale
	var animator = animate(this._levelclear);
	animator.now({scale: 1, x: 0}, 1000).then(bind(this, function() {
		// shoot particles
		var numParts = 100;
		var pObjects = this.pEngine.obtainParticleArray(numParts);
		for (var i = 0; i < numParts; i++) {
			var pObj = pObjects[i];
			pObj.x = Math.random() * device.screen.width;
			pObj.y = Math.floor(device.screen.height / 2) - util.scaleY(28);
			pObj.dx = Math.random() * 100;
			pObj.dy = Math.random() * 100;
			pObj.width = 20;
			pObj.height = 20;
			pObj.image = 'resources/images/star.png';
		}
		this.pEngine.emitParticles(pObjects);
		
		// delay
		animator.wait(1000).then({scale: 0, x: mid}, 500).then(bind(this, function() {
			// remove it
			this.removeSubview(this._levelclear);
			delete this._levelclear;
			
			// go to next level
			level++;
			if (__debug)
				console.log("NEXT LEVEL: " + level);
			if (level > 20) {
				level = 20;
				game_won = true;
				this.gameOver();
				return;
			} 
			
			if (level === 6 || level === 11 || level === 16) {
				if (!demo_mode) { bubbleColors++; }
			}
			
			this._level.setText('Level:' + level);
			// re-fill bubble grid
			this.buildGrid();
			this.setBackground();
			this.emit('app:start');
		}));	
	}));
}

/* 
 * Manages the intro animation sequence before starting game.
 */
function start_game_flow() {
	if (__debug)
		console.log("START GAME FLOW");
	
	this.initBackgrounds();
	this.setBackground();
	
	countdown_secs = soundcontroller.getLevelTime(level);
	game_length = countdown_secs * 1000;
	
	var mid = Math.floor(device.screen.width / 2);
	
	// add 'ready', 'set', 'go' imageviews
	var views = [ 'ready', 'set', 'go' ];
	for (var i = 0; i < 3; i++) {
		this['_' + views[i]] = new ui.ImageScaleView({
			superview: this,
			zIndex: 100,
			image: 'resources/images/' + views[i] + '.png',
			x: mid,
			y: util.scaleY(484),
			width: util.scaleX(576),
			height: util.scaleY(56),
			scaleMethod: 'stretch',
			scale: 0
		});
	}
	
	var ra = animate(this._ready);
	var sa = animate(this._set);
	var ga = animate(this._go);
	
	ra.wait(500).then({scale: 1, x: 0}, 500).wait(500).then(bind(this, function() {
		this.removeSubview(this._ready);
		delete this._ready;
		sa.now({scale: 1, x: 0}, 500).wait(500).then(bind(this, function() {
			this.removeSubview(this._set);
			delete this._set;
			ga.now({scale: 1, x: 0}, 500).wait(500).then(bind(this, function() {
				this.removeSubview(this._go);
				delete this._go;
				game_on = true;
				play_game.call(this);
			}));
		}));
	}));
}

/* 
 * Setup countdown timer, game over handler, and low time handler
 */
function play_game() {
	
	var song = soundcontroller.getMusic(level);
	if (__debug)
		console.log("song = " + song);
	sound.play(song);
	
	clockTick = setInterval(update_countdown.bind(this), 1000);

	gameLenTimer = setTimeout(bind(this, function() {
		this.gameOver();
	}), game_length);

	// Make countdown timer visible, remove start message if still there.
	setTimeout(bind(this, function () {
		this._scoreboard.setText(score.toString());
		this._countdown.style.visible = true;
		this._level.setText('Level:' + level);
		this._level.style.visible = true;
	}), 1000);

	// Running out of time! Set countdown timer red.
	warningTimer = setTimeout(bind(this, function() {
		this._countdown.updateOpts({color: '#DF0000'});
	}), game_length * 0.97);
}

/*
 * Updates the countdown timer, pad out leading zeros.
 */
function update_countdown() {
	countdown_secs -= 1;
	var m = Math.floor(countdown_secs / 60);
	var s = countdown_secs % 60;
	this._countdown.setText(m + ":" + (("00" + s).slice(-2)));
}

/* 
 * Check for high-score and play the ending animation.
 * Add a click-handler to the screen to return to the title
 * screen so we may play again.
 */
function end_game_flow() {

	sound.stop(soundcontroller.getMusic(level));

	this._countdown.setText(''); //clear countdown text
	
	var gh = 90;
	var gsize = 72;
	var gy = Math.floor((this.style.height / 2) - (gsize / 2));
	var ph = Math.floor(gh / 2);
	var psize = Math.floor(gsize / 2);
	var py = gy + gh;
	
	this._gameOver = new ui.TextView({
		superview: this,
		zIndex: 19,
		x: 0,
		y: gy,
		width: this.style.width,
		height: gh,
		autoSize: false,
		size: gsize,
		layout: 'box',
		wrap: false,
		color: '#000000',
		fontFamily: 'PressStart2P'
	});
	this._playAgain = new ui.TextView({
		superview: this,
		zIndex: 19,
		x: 0,
		y: py,
		width: this.style.width,
		height: ph,
		autoSize: false,
		size: psize,
		layout: 'box',
		wrap: false,
		color: '#000000',
		fontFamily: 'PressStart2P'
	});
	this._tapCatcher = new ui.View({
		superview: this,
		zIndex: 20,
		x: 0,
		y: 0,
		width: device.screen.width,
		height: device.screen.height
	});

	if (game_won) {
		this._gameOver.setText(util.text.GAME_WON);
	} else {
		this._gameOver.setText(util.text.GAME_OVER);
	}
	this._playAgain.setText(util.text.PLAY_AGAIN);

	util.pulse.call(this._playAgain);
	
	//slight delay before allowing a tap reset
	setTimeout(emit_endgame_event.bind(this), 500);
}

/* 
 * Tell the main app to switch back to the title screen.
 */
function emit_endgame_event() {
	this._tapCatcher.once('InputSelect', bind(this, function() {
		this.emit('gamescreen:end');
		reset_game.call(this);
	}));
}

/* 
 * Reset game counters and assets.
 */
function reset_game () {
	this.removeSubview(this._tapCatcher);
	this.removeSubview(this._gameOver);
	this.removeSubview(this._playAgain);
	
	game_won = false;
	level = 1;
	score = 0;
	countdown_secs = game_length / 1000;
	this._scoreboard.setText('');
	
	for (var i = 0; i < this.grid.length; i++) {
		for (j = 0; j < this.grid[i].length; j++) {
			slotObj = this.grid[i][j];
			if (slotObj.bubble !== null) {
				this.removeSubview(slotObj.bubble.view);
			}
			slotObj.pop = false;
			slotObj.attached = false;
			slotObj.bubble = null;
		}
	}
	this.buildGrid();

	this._countdown.updateOpts({
		visible: false,
		color: '#000000'
	});
	this._level.updateOpts({
		visible: false
	});
}

