var cam, imgHistory, squareMatcher;
var delayCanvas, ctx;
var keypoints = [];

var width = 640, height=480;
var kickoffMatching = false;
var delay = 0;
var curKeypointIdx=1;
//var toggle=false;
function step(){
	if(cam.isReady()){
		var curdata = cam.getImageData();
		var timestamp = performance.now();
		imgHistory.store(curdata,timestamp);

		ctx.clearRect(0,0,delayCanvas.width,delayCanvas.height);

		/*if(toggle)
			ctx.fillStyle = 'blue';
		else
			ctx.fillStyle = 'red';
		toggle = !toggle;*/

		ctx.fillRect(0,0,delayCanvas.width,delayCanvas.height);

		if(kickoffMatching){
			kickoffMatching = false;
			startMatchLast();
		}
		if(keypoints.length >= 2){
			var lastKeypoint = keypoints[curKeypointIdx-1];
			var curKeypoint = keypoints[curKeypointIdx];

			
			if(curKeypoint.time < timestamp-delay){
				if(keypoints.length > curKeypointIdx+1){
					// If we have more keypoints, advance
					curKeypointIdx++;
					//keypoints.shift();
					lastKeypoint = curKeypoint;
					curKeypoint = keypoints[curKeypointIdx];
				}else{
					delay = timestamp - curKeypoint.time;
				}
			}
			var delayTime = timestamp-delay;

			var delayedImg = imgHistory.retrieve(delayTime,true);
			ctx.putImageData(delayedImg.img, 0,0);
			
			var lastMatrix = lastKeypoint.matrix,
				lastTime = lastKeypoint.time,
				curMatrix = curKeypoint.matrix,
				curTime = curKeypoint.time;

			function strokeRectPersp(x,y,w,h){
				var c1 = applyInterpolatedTransformation(lastMatrix,lastTime,curMatrix,curTime,{x:x-.5,y:y-.5},delayTime);
				var c2 = applyInterpolatedTransformation(lastMatrix,lastTime,curMatrix,curTime,{x:x-.5,y:y+h-.5},delayTime);
				var c3 = applyInterpolatedTransformation(lastMatrix,lastTime,curMatrix,curTime,{x:x+w-.5,y:y+h-.5},delayTime);
				var c4 = applyInterpolatedTransformation(lastMatrix,lastTime,curMatrix,curTime,{x:x+w-.5,y:y-.5},delayTime);
				ctx.beginPath();
				ctx.moveTo(c1.x,c1.y);
				ctx.lineTo(c2.x,c2.y);
				ctx.lineTo(c3.x,c3.y);
				ctx.lineTo(c4.x,c4.y);
				ctx.closePath();
				ctx.stroke();
			}
			ctx.strokeStyle = 'purple';
			ctx.lineWidth = 1;
			for (var x = 0; x < 52; x++) {
				for (var y = 0; y < 34; y++) {
					strokeRectPersp(x,y,1,1);
				};
			};
			ctx.strokeStyle = 'green';
			ctx.lineWidth = 2;
			strokeRectPersp(0,0,52,34);
		
			
		}

	}
	compatibility.requestAnimationFrame(step);
}
function startMatchLast(){
	var lastSnapshot = imgHistory.peek();

	
	var trainCanvas = document.createElement('canvas');
	trainCanvas.width = width;
	trainCanvas.height = height;
	var trainCtx = delayCanvas.getContext('2d');
	var trainImg = document.getElementById('testImg');
	trainCtx.drawImage(trainImg,0,0,width,height);
	var trainImgData = trainCtx.getImageData(0,0,width,height);
	

	squareMatcher.postMessage({
		action:'match',
		img:trainImgData,//lastSnapshot.img,
		time:lastSnapshot.time
	});
}
window.addEventListener('load',function(){
	cam = new Webcam(width,height);
	cam.start().then(function(){
		imgHistory = new ImageHistory();

		delayCanvas = document.getElementById('delayCanvas');
		delayCanvas.width = width;
		delayCanvas.height = height;
		ctx = delayCanvas.getContext('2d');

		var lastMatrix = [0,0,0,0,0,0,0,0,0];
		squareMatcher = new Worker('squareMatchWorker.js');
		squareMatcher.addEventListener('message',function(e){
			var data = e.data;
			console.log('Square matcher says: ',data);
			if(data.action == 'match'){
				if(data.success){
					keypoints.push({
						time:data.time,
						hasMatrix:true,
						matrix:data.matrix,
					});
					lastMatrix = data.matrix;
					console.log('Pushed matrix ',data.matrix);
				}else{
					keypoints.push({
						time:data.time,
						hasMatrix:false,
						matrix:lastMatrix
					});
				}
				startMatchLast();
			}
		});
		kickoffMatching=true;
		step();
	});
})