var requestFullscreen = function (ele) {
    if (ele.requestFullscreen) {
        ele.requestFullscreen();
    } else if (ele.webkitRequestFullscreen) {
        ele.webkitRequestFullscreen();
    } else if (ele.mozRequestFullScreen) {
        ele.mozRequestFullScreen();
    } else if (ele.msRequestFullscreen) {
        ele.msRequestFullscreen();
    } else {
        // Fallback
        console.log('Fullscreen API is not supported.');
    }
};


var cam, squareMatcher, flowTracker,ransacCalc;
var delayCanvas;
var topHelp, bottomHelp;
var helpActive = true;
var fullscreenElement;
var renderer;
var sgClient;

var trainCanvas;

var transform = null;
var computingTransform = false;
var transformIsNew = false;

var width, height;
//var toggle=false;
function doAfterUIProcessing(fn){
	setZeroTimeout(function(){
		sgClient.handleInput();
		fn();
	});
}

function onFirstTap(fn){
	function doAction(){
		fn();
		document.body.removeEventListener('mousedown',doAction,false);
		document.body.removeEventListener('touchstart',doAction,false);
	}
	document.body.addEventListener('mousedown',doAction,false);
	document.body.addEventListener('touchstart',doAction,false);
}

var lastRedrawIntervals = [];
var avgRedrawInterval = 0;
function step(){
	if(!cam.isReady()){
		compatibility.requestAnimationFrame(step);
		return;
	}
	sgClient.handleInput();

	var timestamp = performance.now();
	var predictedRedrawTime = timestamp + avgRedrawInterval;
	var predictedUpdateTime = sgClient.lastStateTime + sgClient.stateInterval;
	if(!(sgClient.stateIsNew || predictedRedrawTime < predictedUpdateTime-50 || predictedRedrawTime > predictedUpdateTime+400)){
		// This is too close to the next update. Just wait for it.
		compatibility.requestAnimationFrame(step);
		return;
	}
	sgClient.stateIsNew=false;

	if(transform&&!transformIsNew){
		if(helpActive){
			helpActive=false;
			topHelp.innerHTML = 'Your snake is the blinking cube.<br>Collect the white dots to grow longer!';
			if('ontouchstart' in window){
				bottomHelp.innerHTML = 'Slide your finger on the screen to turn your snake!';
			}else{
				bottomHelp.innerHTML = 'Use arrow keys to turn your snake!';
			}
			onFirstTap(function(){
				setTimeout(function(){
					topHelp.innerHTML = '';
					bottomHelp.innerHTML = '';
				},5000);
			});
		}
		sgClient.drawInRenderer(renderer);
		renderer.draw(transform);
	}else{
		renderer.draw(null);
	}
	renderer.clearTransientSquares();

	var curdata;
	doAfterUIProcessing(partOne);
	function partOne(){
		curdata = cam.getImageData();
		if(curdata == null) {
			compatibility.requestAnimationFrame(step);
			return;
		}

		doAfterUIProcessing(partTwo);
	}
	function partTwo(){
		if(transform){
			//var flowTransform = flowTracker.updateTransformLK(curdata,transform,true);
			var ftinfo = flowTracker.updateTransformLK(curdata,transform,true);
			var flowTransform = ftinfo.matrix;
			var npts = ftinfo.ptCt;
			var avgDist = ftinfo.avgShiftDist;

			if(flowTransform){
				transform = flowTransform;
			}

			var newTransform = WindowFinder.updateTransformWithWindows(curdata,transform,ransacCalc);

			if(newTransform){
				if(flowTransform && avgDist<5 && !transformIsNew){
					//Small motion, don't change transform to reduce jitter
				}else{
					transform = newTransform;
				}
			}else{
				transform = null;
			}
			transformIsNew = false;

			doAfterUIProcessing(partThree);
		}else{
			partThree();
		}
	}
	function partThree(){ // When we have a transform
		renderer.loadBackgroundTexture();
		if(transform){
			renderer.updateWindowsillMasks(transform,curdata);

			// Update moving average of redraw interval
			var afterTime = performance.now();
			var redrawInterval = afterTime-timestamp;
			lastRedrawIntervals.push(redrawInterval);
			if(lastRedrawIntervals.length > 10)
				lastRedrawIntervals.shift();
			var totIntervals = 0;
			for (var i = 0; i < lastRedrawIntervals.length; i++) {
				totIntervals += lastRedrawIntervals[i];
			};
			avgRedrawInterval = totIntervals/lastRedrawIntervals.length; 
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
		} 
		compatibility.requestAnimationFrame(step);
	}
}

window.addEventListener('load',function(){
	fullscreenElement = document.getElementById('fullscreenContainer');
	topHelp = document.getElementById('topText');
	bottomHelp = document.getElementById('bottomText');

	onFirstTap(function(){
		requestFullscreen(fullscreenElement);
	});
	

	cam = new Webcam(640,480);
	width = cam.width;
	height = cam.height;
	ransacCalc = new RansacCalculator();
	flowTracker = new FlowTracker(width,height,ransacCalc);
	renderer = new GameRenderer();
	delayCanvas = document.getElementById('delayCanvas');
	try{
		sgClient = new SnakeGameClient(fullscreenElement);
	}catch(e){
		console.error(e);
		topHelp.innerHTML = 'Could not connect to server!';
		bottomHelp.innerHTML = '';
		return;
	}

	topHelp.innerHTML = 'To enable augmented reality, please allow camera access.';
	bottomHelp.innerHTML = 'To enable augmented reality, please allow camera access.';

	cam.start()
		.catch(function(){
			cam = new FakeWebcam(640,480);
			return cam.start();
		})
		.then(setupAfterCameraStart);

	function setupAfterCameraStart(){
		if(cam instanceof Webcam){
			topHelp.innerHTML = 'Please point the camera at the wall of the Shanahan building.';
			bottomHelp.innerHTML = 'Attempting to detect wall.';
		}else{
			topHelp.innerHTML = '';
			bottomHelp.innerHTML = '';
		}
		imgHistory = new ImageHistory();

		renderer.setup(cam.canvas, delayCanvas, width, height);

		squareMatcher = new Worker('squareMatchWorker.js');
		squareMatcher.addEventListener('message',function(e){
			var data = e.data;
			//console.log('Square matcher says: ',data);
			if(data.action == 'match'){
				computingTransform=false;
				transformIsNew=true;
				if(data.success){
					transform = data.matrix;
					if(!sgClient.started){
						sgClient.start();
						
					} 
					//console.log('Got matrix ',data.matrix);
				}else{
					//console.log('Could not find matrix!');
				}
			}
		});
		step();
	}
	//var gui = new dat.GUI();
	//gui.add(CameraMatrixUtil,'f').min(0).max(1000);
})


