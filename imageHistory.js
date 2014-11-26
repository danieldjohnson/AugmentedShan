function ImageHistory(){
	this.remembered = [];
}
ImageHistory.prototype.store = function(img,time){
	this.remembered.push({
		img:img,
		time:time
	});
}
ImageHistory.prototype.peek = function(){
	return this.remembered[this.remembered.length-1];
}
ImageHistory.prototype.retrieve = function(time,clearOld){
	function findClosest(time,remembered){
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

	if(this.remembered.length == 0) return undefined;

	var bestIdx = findClosest(time,this.remembered);
	var best = this.remembered[bestIdx];
	if(clearOld){
		this.remembered.splice(0,bestIdx);
	}
	return best;
}