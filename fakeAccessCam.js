function FakeWebcam(width, height){
	var self=this;
	console.log(width,height);
	var a = width*height;
	var desiredA = 360*640;
	var factor = Math.sqrt(desiredA/a);
	width *= factor;
	height *= factor;
	width = Math.floor(width);
	height = Math.floor(height);
	console.log("Scaling", a, desiredA, factor, width, height);

	this.width = width;
	this.height = height;

	//this.img = document.getElementById('testImg');
	this.img = new Image();//document.createElement('image');
	this.imgLoaded=false;
	this.img.addEventListener('load',function(){
		self.imgLoaded=true;
	});
	this.img.src = "shan.jpg";

			

	this.canvas = document.createElement('canvas'); //document.getElementById('processCanvas');
	this.canvas.width = width;
	this.canvas.height = height;
	this.ctx = this.canvas.getContext('2d');
}
FakeWebcam.prototype.start = function(){
	var self=this;
	return new Promise(function(resolve, reject){
		if(self.imgLoaded){
			window.setTimeout(resolve,500);
		}else{
			self.img.addEventListener('load',function(){
				window.setTimeout(resolve,500);
			});
		}
	});
}
FakeWebcam.prototype.isReady = function(){
	return this.imgLoaded;
}
FakeWebcam.prototype.getImageData = function(){
	if(this.imgLoaded){
		//trainCtx.drawImage(trainImg,0,0,width,trainImg.height/trainImg.width*width);

		this.ctx.drawImage(this.img, 0, 0,this.canvas.width, this.canvas.height);
		return this.ctx.getImageData(0,0,this.canvas.width, this.canvas.height);
	}else return null;
}

