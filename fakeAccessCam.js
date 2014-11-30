function Webcam(width, height){
	if(this.stream) return new Promise(function(resolve){
		resolve();
	}); //already set up. resolve
	console.log(width,height);
	var a = width*height;
	var desiredA = 360*640;
	var factor = Math.sqrt(desiredA/a);
	width *= factor;
	height *= factor;
	width = Math.floor(width);
	height = Math.floor(height);
	console.log("Scaling", a, desiredA, factor, width, height);

	this.video = document.createElement('video'); //document.getElementById('streamVideo');
	this.video.autoplay = true;
	this.video.width = width;
	this.video.height = height;
	this.canvas = document.createElement('canvas'); //document.getElementById('processCanvas');
	this.canvas.width = width;
	this.canvas.height = height;
	this.ctx = this.canvas.getContext('2d');
}
Webcam.prototype.start = function(){
	var self=this;
	return new Promise(function(resolve, reject){
		self.video.src =  "test.mp4"
		self.video.loop = true;
		self.stream = true;
		self.video.addEventListener('loadeddata',function(){
			window.setTimeout(resolve,500);
		});
	});
}
Webcam.prototype.isReady = function(){
	return this.stream && this.video.readyState == this.video.HAVE_ENOUGH_DATA;
}
Webcam.prototype.getImageData = function(){
	if(this.stream){
		this.ctx.drawImage(this.video, 0, 0,this.canvas.width, this.canvas.height);
		return this.ctx.getImageData(0,0,this.canvas.width, this.canvas.height);
	}
}

