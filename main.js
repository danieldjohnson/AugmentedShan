var cam, squareMatcher, flowTracker,ransacCalc;
var delayCanvas;
var renderer;

var trainCanvas;

var transform = null;
var computingTransform = false;
var transformIsNew = false;

var width, height;
//var toggle=false;
function step(){
	if(cam.isReady()){
		var timea = performance.now();
		var curdata = cam.getImageData();
		if(curdata != null) {

			if(!('ontouchstart' in window)){
				trainCanvas.width = width;
				trainCanvas.height = height;
				var trainCtx = trainCanvas.getContext('2d');
				var trainImg = document.getElementById('testImg');
				var randPos = {
					x:Math.random()*20-10,
					y:Math.random()*20-10
				};
				trainCtx.drawImage(trainImg,0,0,width,trainImg.height/trainImg.width*width);
				//trainCtx.drawImage(trainImg,randPos.x,randPos.y,width,trainImg.height/trainImg.width*width);
				curdata = trainCtx.getImageData(0,0,width,height);
			}
			

			var timeb = performance.now();
			////console.log('Getting image took ',timeb-timea);

			var timestamp = performance.now();

			var timec = performance.now();
			////console.log('Drawimg image took ',timec-timeb);
			if(transform){
				//var flowTransform = flowTracker.updateTransformLK(curdata,transform,true);
				var ftinfo = flowTracker.updateTransformLK(curdata,transform,true);
				var flowTransform = ftinfo.matrix;
				var npts = ftinfo.ptCt;
				var avgDist = ftinfo.avgShiftDist;
				//console.log(ftinfo);
				/*ctx.strokeStyle = "blue";
				ctx.lineWidth = 1;
				for (var i = 0; i < npts; i++) {
					ctx.beginPath();
					ctx.moveTo(flowTracker.prev_xy[i*2],flowTracker.prev_xy[i*2+1]);
					ctx.lineTo(flowTracker.curr_xy[i*2],flowTracker.curr_xy[i*2+1]);
					ctx.stroke();
				};*/
				if(flowTransform){
					transform = flowTransform;
					//console.log('Got transform',flowTransform,'from LK tracker. Avg motion:',avgDist,'with',npts,'points matched.');
				}

				var newTransform = WindowFinder.updateTransformWithWindows(curdata,transform,ransacCalc);

				if(newTransform){
					if(flowTransform && avgDist<5 && !transformIsNew){
						//Small motion, don't change transform to reduce jitter
						//console.log('Got transform ',transform,' from window finder, but ignoring it because of small motion.');
					}else{
						//console.log('Got updated transform ',transform, ' from window finder.');
						transform = newTransform;
					}
				}else{
					transform = null;
					//console.log('Could not update transform!');
				}
				transformIsNew = false;
			}

			var timed = performance.now();
			////console.log('Updating transform took ',timed-timec);
			if(transform){
				/*function strokeRectPersp(x,y,w,h){
					var c1 = SquareMatch.applyTransformation(transform,{x:x ,y:y });
					var c2 = SquareMatch.applyTransformation(transform,{x:x ,y:y+h });
					var c3 = SquareMatch.applyTransformation(transform,{x:x+w ,y:y+h });
					var c4 = SquareMatch.applyTransformation(transform,{x:x+w ,y:y });
					ctx.beginPath();
					ctx.moveTo(c1.x,c1.y);
					ctx.lineTo(c2.x,c2.y);
					ctx.lineTo(c3.x,c3.y);
					ctx.lineTo(c4.x,c4.y);
					ctx.closePath();
					ctx.stroke();
				}
				ctx.strokeStyle = 'rgba(0,155,155,1)';
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

				var intrinsic = CameraMatrixUtil.getDefaultIntrinsic(width,height);
				var threetransform = CameraMatrixUtil.extrapolate3DMatrix(transform,intrinsic,true,true);
				function draw3dline(x,y){
					var c1 = CameraMatrixUtil.apply3DTransform(threetransform, {x:x,y:y,z:0});
					var c2 = CameraMatrixUtil.apply3DTransform(threetransform, {x:x,y:y,z:-3});
					ctx.beginPath();
					ctx.moveTo(c1.x,c1.y);
					ctx.lineTo(c2.x,c2.y);
					ctx.stroke();
				}

				ctx.strokeStyle = "red";
				for (var x = 0; x <= 52; x+=2) {
					for (var y = 0; y <= 34; y+=2) {
						draw3dline(x,y);
					};
				};*/
				renderer.updateWindowsillMasks(transform,curdata);
				renderer.draw(transform);
			}else{
				if(computingTransform){
					var found = 0, attempts = 0;
					while(found<30 && attempts<80){
						var testPt = {
							x:Math.floor(Math.random()*width),
							y:Math.floor(Math.random()*height),
						};
						var foundSquare = SquareDetect.findSquare(testPt,curdata,15);
						if(foundSquare){
							/*ctx.fillStyle='rgba(100,255,100,1)';
							ctx.fillRect(foundSquare.center.x - foundSquare.size -2, foundSquare.center.y - foundSquare.size -2, 4, 4);
							*/
							renderer.addTransientSquare(foundSquare.center.x - foundSquare.size, foundSquare.center.y - foundSquare.size);
							found++;
						}
						attempts++;
					}
				}else{
					computingTransform = true;
					squareMatcher.postMessage({
						action:'match',
						img:curdata,
						time:timestamp
					});
					flowTracker.storeLastImage(curdata);
				}
				renderer.draw(null);
			} 
			renderer.clearTransientSquares();
		}
	}
	compatibility.requestAnimationFrame(step);
}
window.addEventListener('load',function(){
	cam = new Webcam(640,480);
	width = cam.width;
	height = cam.height;
	ransacCalc = new RansacCalculator();
	flowTracker = new FlowTracker(width,height,ransacCalc);
	renderer = new GameRenderer();
	cam.start().then(function(){
		imgHistory = new ImageHistory();


		delayCanvas = document.getElementById('delayCanvas');
		if(!('ontouchstart' in window)){
			trainCanvas = document.createElement('canvas');
			renderer.setup(trainCanvas, delayCanvas, width, height);
		}else{
			renderer.setup(cam.canvas, delayCanvas, width, height);
		}
		
		//delayCanvas.width = width;
		//delayCanvas.height = height;
		//ctx = delayCanvas.getContext('2d');

		squareMatcher = new Worker('squareMatchWorker.js');
		squareMatcher.addEventListener('message',function(e){
			var data = e.data;
			//console.log('Square matcher says: ',data);
			if(data.action == 'match'){
				computingTransform=false;
				transformIsNew=true;
				if(data.success){
					transform = data.matrix;
					//console.log('Got matrix ',data.matrix);
				}else{
					//console.log('Could not find matrix!');
				}
			}
		});
		step();
	});
	//var gui = new dat.GUI();
	//gui.add(CameraMatrixUtil,'f').min(0).max(1000);
})


