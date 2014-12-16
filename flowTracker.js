function FlowTracker(width,height,ransacCalc){
	this.width = width;
	this.height = height;
	this.ransacCalc = ransacCalc;

	this.curr_img_pyr = new jsfeat.pyramid_t(3);
	this.prev_img_pyr = new jsfeat.pyramid_t(3);
	this.curr_img_pyr.allocate(width, height, jsfeat.U8_t|jsfeat.C1_t);
	this.prev_img_pyr.allocate(width, height, jsfeat.U8_t|jsfeat.C1_t);

	this.point_status = new Uint8Array(16);
	this.prev_xy = new Float32Array(16*2);
	this.curr_xy = new Float32Array(16*2);
}
FlowTracker.prototype.storeLastImage = function(imageData){
	jsfeat.imgproc.grayscale(imageData.data, this.width, this.height, this.prev_img_pyr.data[0]);
	this.prev_img_pyr.build(this.prev_img_pyr.data[0], true);
}
FlowTracker.prototype.updateTransformLK = function(imageData,transform,saveLastImage){
	var WIN_SIZE = 20,
		MAX_ITERS = 30,
		EPSILON = 0.01,
		MIN_EIGEN = 0.001;

	jsfeat.imgproc.grayscale(imageData.data, this.width, this.height, this.curr_img_pyr.data[0]);
	this.curr_img_pyr.build(this.curr_img_pyr.data[0], true);

	var cornerPositions = [
		{x:16,y:7},
		{x:26,y:7},
		{x:16,y:15},
		{x:26,y:15},

		{x:35,y:7},
		{x:45,y:7},
		{x:35,y:15},
		{x:45,y:15},

		{x:12,y:22},
		{x:22,y:22},
		{x:12,y:30},
		{x:22,y:30},

		{x:31,y:22},
		{x:41,y:22},
		{x:31,y:30},
		{x:41,y:30},
	];
	var oldFrom = [], oldTo = [];
	var ptCt = 0;
	for (var i = 0; i < cornerPositions.length; i++) {
		var transformedPt = SquareMatch.applyTransformation(transform,cornerPositions[i]);
		if(transformedPt.x<0 || transformedPt>=this.width || transformedPt.y<0 || transformedPt.y>=this.height){
			continue;
		}
		oldFrom.push(cornerPositions[i]);
		oldTo.push(transformedPt);
		this.prev_xy[2*ptCt] = transformedPt.x;
		this.prev_xy[2*ptCt+1] = transformedPt.y;
		ptCt++;
	};
	jsfeat.optical_flow_lk.track(this.prev_img_pyr, this.curr_img_pyr, this.prev_xy, this.curr_xy, ptCt, WIN_SIZE, MAX_ITERS, this.point_status, EPSILON, MIN_EIGEN);
	var from = [],
		to = [],
		lastTo = [];
	for (var i = 0; i < ptCt; i++) {
		if(this.point_status[i] == 1){
			to.push({
				x:this.curr_xy[i<<1],
				y:this.curr_xy[(i<<1)+1],
			});
			from.push(oldFrom[i]);
			lastTo.push(oldTo[i]);
		}
	};
	if(to.length<6) return {
		matrix:null,
		avgShiftDist:0,
		ptCt:0
	};

	if(saveLastImage){
		//Swap buffers
		var temp = this.prev_img_pyr;
		this.prev_img_pyr = this.curr_img_pyr;
		this.curr_img_pyr = temp;
	}
	var ransacResult = this.ransacCalc.doRansac(from,to,4);
	var avgShiftDist = 0;
	if(ransacResult.success){
		for (var i = 0; i < to.length; i++) {
			var a = lastTo[i];
			var b = to[i];
			var dx = a.x-b.x;
			var dy = a.y-b.y;
			avgShiftDist += Math.sqrt(dx*dx + dy*dy);
		};
		avgShiftDist /= to.length;
	}
	return {
		matrix:ransacResult.matrix,
		avgShiftDist:avgShiftDist,
		ptCt:to.length
	}
}