self.window = self;
importScripts('jsfeat/build/jsfeat.js'); 
importScripts('ransac.js'); 
importScripts('squareFeatures.js'); 
importScripts('squareDetect.js'); 
importScripts('squareMatch.js'); 

var ransacCalc = new RansacCalculator();

self.addEventListener('message', function(e) {
	var data = e.data;
	if(data.action == 'match'){
		var tfInfo = SquareMatch.getTransformation(data.img,ransacCalc);
		var tf = tfInfo[0];
		//self.setTimeout(function(){
			if(tf){
				self.postMessage({
					action:'match',
					success:true,
					time:data.time,
					matrix:tf
				});
			}else{
				self.postMessage({
					action:'match',
					success:false,
					time:data.time
				});
			}
	//	},10);
	}
}, false);