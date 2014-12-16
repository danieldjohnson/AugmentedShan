function RansacCalculator(){
	this.ransac = jsfeat.motion_estimator.ransac;
	this.homo_kernel = new jsfeat.motion_model.homography2d();
	//this.h_transform = new jsfeat.matrix_t(3, 3, jsfeat.F32_t | jsfeat.C1_t);
}

RansacCalculator.prototype.doRansac = function(from,to, modelSize){

	var h_transform = new jsfeat.matrix_t(3, 3, jsfeat.F32_t | jsfeat.C1_t);
	var count = from.length;
	var mask = new jsfeat.matrix_t(count, 1, jsfeat.U8_t | jsfeat.C1_t);
	var model_size = modelSize || 3; // minimum points to estimate motion
	var thresh = 3; // max error to classify as inlier
	var eps = 0.5; // max outliers ratio
	var prob = 0.99; // probability of success
	var params = new jsfeat.ransac_params_t(model_size, thresh, eps, prob);
	var max_iters = 10000;
	var ok = this.ransac(params, this.homo_kernel, from, to, count, h_transform, mask, max_iters);
	
	// extract good matches and re-estimate
	var good_cnt = 0;
	var newfrom = [], newto = [];
	if(ok) {
	    for(var i=0; i < count; ++i) {
	        if(mask.data[i]) {
	        	newfrom[good_cnt] = from[i];
	        	newto[good_cnt] = to[i];
	            good_cnt++;
	        }
	    }
	    // run kernel directly with inliers only
	    this.homo_kernel.run(newfrom, newto, h_transform, good_cnt);
	} else {
	    return {
	    	success:false,
	    	matrix:null,
	    	mask:null
	    };
	}
	return {
		success:true,
		matrix:h_transform.data,
		mask:mask.data,
	};
}