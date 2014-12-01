var cam, squareMatcher;
var delayCanvas, ctx;

var transform = null;
var computingTransform = false;

var width = 640, height=480;
//var toggle=false;
function step(){
	if(cam.isReady()){
		var timea = performance.now();
		var curdata = cam.getImageData();

		/*var trainCanvas = document.createElement('canvas');
		trainCanvas.width = width;
		trainCanvas.height = height;
		var trainCtx = delayCanvas.getContext('2d');
		var trainImg = document.getElementById('testImg');
		trainCtx.drawImage(trainImg,0,0,width,height);
		curdata = trainCtx.getImageData(0,0,width,height);*/

		var timeb = performance.now();
		console.log('Getting image took ',timeb-timea);

		var timestamp = performance.now();

		ctx.clearRect(0,0,delayCanvas.width,delayCanvas.height);
		ctx.putImageData(curdata,0,0);


		var timec = performance.now();
		console.log('Drawimg image took ',timec-timeb);
		if(transform){
			
			var newTransform = updateTransform(curdata,transform,ctx);

			if(newTransform){
				transform = newTransform;
				console.log('Got updated transform ',transform);
			}else{
				transform = null;
				console.log('Could not update transform!');
			}
		}

		var timed = performance.now();
		console.log('Updating transform took ',timed-timec);
		if(transform){
			function strokeRectPersp(x,y,w,h){
				var c1 = applyTransformation(transform,{x:x /*-.5*/,y:y /*-.5*/});
				var c2 = applyTransformation(transform,{x:x /*-.5*/,y:y+h /*-.5*/});
				var c3 = applyTransformation(transform,{x:x+w /*-.5*/,y:y+h /*-.5*/});
				var c4 = applyTransformation(transform,{x:x+w /*-.5*/,y:y /*-.5*/});
				ctx.beginPath();
				ctx.moveTo(c1.x,c1.y);
				ctx.lineTo(c2.x,c2.y);
				ctx.lineTo(c3.x,c3.y);
				ctx.lineTo(c4.x,c4.y);
				ctx.closePath();
				ctx.stroke();
			}
			ctx.strokeStyle = 'rgba(255,0,255,0.3)';
			ctx.lineWidth = 1;
			for (var x = 0; x < 52; x++) {
				for (var y = 0; y < 34; y++) {
					strokeRectPersp(x,y,1,1);
				};
			};
			ctx.strokeStyle = 'green';
			ctx.lineWidth = 2;
			strokeRectPersp(0,0,52,34);
			var timee = performance.now();
			console.log('Drawing took ',timee-timed);
		}else{
			if(!computingTransform){
				computingTransform = true;
				squareMatcher.postMessage({
					action:'match',
					img:curdata,
					time:timestamp
				});
			}
		} 
	}
	compatibility.requestAnimationFrame(step);
}
window.addEventListener('load',function(){
	cam = new Webcam(width,height);
	cam.start().then(function(){
		imgHistory = new ImageHistory();

		delayCanvas = document.getElementById('delayCanvas');
		delayCanvas.width = width;
		delayCanvas.height = height;
		ctx = delayCanvas.getContext('2d');

		squareMatcher = new Worker('squareMatchWorker.js');
		squareMatcher.addEventListener('message',function(e){
			var data = e.data;
			console.log('Square matcher says: ',data);
			if(data.action == 'match'){
				computingTransform=false;
				if(data.success){
					transform = data.matrix;
					console.log('Got matrix ',data.matrix);
				}else{
					console.log('Could not find matrix!');
				}
			}
		});
		step();
	});
})