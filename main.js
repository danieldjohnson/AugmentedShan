var cam, imgHistory, delayCanvas, ctx;
function step(){
	if(cam.isReady()){
		var curdata = cam.getImageData();
		var timestamp = performance.now();
		imgHistory.store(curdata,timestamp);

		var delayTime = timestamp - 500;
		var delayedImg = imgHistory.retrieve(delayTime,true);

		ctx.putImageData(delayedImg.img, 0,0);
	}
	compatibility.requestAnimationFrame(step);
}
window.addEventListener('load',function(){
	cam = new Webcam(640,360);
	cam.start().then(function(){
		imgHistory = new ImageHistory();
		delayCanvas = document.getElementById('delayCanvas');
		ctx = delayCanvas.getContext('2d');

		step();
	});
})