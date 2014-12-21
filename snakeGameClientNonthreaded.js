var socketAddr = location.host.split(':')[0] + ':3000';
var socketScript = document.createElement('script')
socketScript.setAttribute("type","text/javascript")
socketScript.setAttribute("src", '//'+socketAddr+'/socket.io/socket.io.js');
document.getElementsByTagName('head')[0].appendChild(socketScript);

function SnakeGameClient(uiElement){
	var self=this;
	this.socket = io(socketAddr+'/snake');
	this.toggleFlash = false;
	this.toggleTime = Date.now();
	this.started=false;
	this.id=null;


	this.lastStateTime = performance.now();
	this.stateInterval = 500;
	this.stateIsNew = false;

	this.socket.on('connect',function(){
		self.connected = true;
		if(self.started)
			self.socket.emit('join');
	});
	this.socket.on('disconnect',function(){
		self.connected = false;
	});
	this.socket.on('configure',function(info){
		console.log('Assgned id ',info.id);
		self.id = info.id;
	});
	this.socket.on('update',function(state){
		self.stateIsNew = true;
		self.lastStateTime = performance.now();
			
		self.state = state;
		console.log(state);
	});


	this.joystick = new VirtualJoystick({
		container: uiElement,
		limitStickTravel: true,
		dragBase: true,
		stickRadius: 50,
		mouseSupport:true
	});

	window.addEventListener('keydown',function(e){
		var event = window.event ? window.event : e;
		if(event.keyCode == 37){
			self.socket.emit('move','left');
		}else if(event.keyCode == 38){
			self.socket.emit('move','up');
		}else if(event.keyCode == 39){
			self.socket.emit('move','right');
		}else if(event.keyCode == 40){
			self.socket.emit('move','down');
		}else{
			return;
		}
		event.preventDefault();
		return;
	});
}
SnakeGameClient.prototype.start = function(){
	if(this.started) return;

	this.started=true;
	this.socket.emit('join');
}
SnakeGameClient.prototype.handleInput = function(){
	if(!this.started) return;

	var THRESH = 10;
	var dx = this.joystick.deltaX(),
		dy = this.joystick.deltaY(),
		mdx = Math.abs(dx),
		mdy = Math.abs(dy);
	if(mdx > mdy){
		if(mdx>THRESH){
			if(dx>0){
				if(this.lastDir!='right'){
					this.socket.emit('move','right');
					this.lastDir = 'right';
					console.log('INPUT: ',this.lastDir);
				}
			}else{
				if(this.lastDir!='left'){
					this.socket.emit('move','left');
					this.lastDir = 'left';
					console.log('INPUT: ',this.lastDir);
				}
			}
		}else{
			this.lastDir = null;
		}
	}else{
		if(mdy>THRESH){
			if(dy>0){
				if(this.lastDir!='down'){
					this.socket.emit('move','down');
					this.lastDir = 'down';
					console.log('INPUT: ',this.lastDir);
				}
			}else{
				if(this.lastDir!='up'){
					this.socket.emit('move','up');
					this.lastDir = 'up';
					console.log('INPUT: ',this.lastDir);
				}
			}
		}else{
			this.lastDir = null;
		}
	}
}
SnakeGameClient.prototype.drawInRenderer = function(renderer){
	renderer.removeBoxes();
	renderer.hideFood();
	renderer.hidePlayerMarker();
	if(!this.state || this.id === null) return;

	renderer.moveFood(this.state.food.x, this.state.food.y);
	for (var i = 0; i < this.state.snakes.length; i++) {
		var snake = this.state.snakes[i];
		var color = SnakeGameClient.hsv2rgb({hue:Math.floor(53.2957795130824*snake.id)%360,sat:1,val:1});
	

		if(snake.id == this.id && snake.parts.length==1){
			if(this.toggleTime+500 < Date.now()){
				this.toggleTime = Date.now();
				this.toggleFlash = !this.toggleFlash;
			}
			var part = snake.parts[0];
			if(this.toggleFlash)
				renderer.movePlayerMarker(part.x,part.y);
		}

		for (var j = 0; j < snake.parts.length; j++) {
			var part = snake.parts[j];
			renderer.addBox(part.x, part.y, color);
		};
	};

	var grayColor = '#777777';
	for (var i = 0; i < this.state.deadParts.length; i++) {
		var dp = this.state.deadParts[i];
		renderer.addBox(dp.x, dp.y, grayColor);
	};
}

SnakeGameClient.hsv2rgb = function(hsv) {
  var h = hsv.hue, s = hsv.sat, v = hsv.val;
  var rgb, i, data = [];
  if (s === 0) {
    rgb = [v,v,v];
  } else {
    h = h / 60;
    i = Math.floor(h);
    data = [v*(1-s), v*(1-s*(h-i)), v*(1-s*(1-(h-i)))];
    switch(i) {
      case 0:
        rgb = [v, data[2], data[0]];
        break;
      case 1:
        rgb = [data[1], v, data[0]];
        break;
      case 2:
        rgb = [data[0], v, data[2]];
        break;
      case 3:
        rgb = [data[0], data[1], v];
        break;
      case 4:
        rgb = [data[2], data[0], v];
        break;
      default:
        rgb = [v, data[0], data[1]];
        break;
    }
  }
  return '#' + rgb.map(function(x){ 
    return ("0" + Math.round(x*255).toString(16)).slice(-2);
  }).join('');
};