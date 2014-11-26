var remembered = [];

self.addEventListener('message', function(e) {

	if(e.action == 'store'){
		// {action:'store', img:ImageData, time:Number}
		remembered.push({
			img:e.img,
			time:e.time,
		});
	}else if(e.action == 'peek'){
		// {action:'peek'}
		return remembered[remembered.length-1];
	}else if(e.action == 'retrieve'){
		// {action:'retrieve', time:Number, clearOld:true|false}
		if(remembered.length == 0) return undefined;
		var bestIdx = findClosest(e.time);
		var best = remembered[bestIdx];
		if(clearOld){
			remembered.splice(0,bestIdx);
		}
	}
}, false);

//Simply walks through the array. The desired element is likely near the beginning
function findClosest(time){
	var i=0;
	while(i<remembered.length && remembered[i].time < time){
		i++;
	}
	if(i == 0)
		return 0;

	if(i == remembered.length)
		return i-1;

	var before = remembered[i-1],
		after = remembered[i];

	if(Math.abs(before.time - time) < Math.abs(after.time - time)){
		return i-1;
	}else{
		return i;
	}
}