function scoreSquare(square,imageData,thresh,simple){
	fn = simple? getImagePixelIntensity : getMedianImagePixelIntensity;
	values = [];
	var squareSize = Math.round(square.size);
	for (var i = 0; i < 3; i++) {
		for (var j = 0; j < 3; j++) {
			values[3*i + j] = fn(square.center.x + (i-1)*squareSize, square.center.y + (j-1)*squareSize, imageData);
		};
	};
	//console.log(values);
	var score = 0;
	var scores = [];
	var bit = 0;
	for (var i = 0; i < 9; i++) {
		for (var j = i+1; j < 9; j++) {
			score |= (values[j]>values[i]+thresh) << bit;
			bit++;
			score |= (values[j]<values[i]-thresh) << bit;
			bit++;
			if(bit>=30){
				bit=0;
				scores[scores.length] = score;
				score = 0;
			}
		};
	};
	scores[scores.length] = score;
	return scores;
}

// Counts the 1 bits in a number
function popcnt32(n) {
    n -= ((n >> 1) & 0x55555555);
    n = (n & 0x33333333) + ((n >> 2) & 0x33333333);
    return (((n + (n >> 4))& 0xF0F0F0F)* 0x1010101) >> 24;
}

// Returns the hamming distance between two feature vectors.
function hammingDist(a1,a2){
	var dist = 0;
	for (var i = 0; i < a1.length; i++) {
		dist+=popcnt32(a1[i]^a2[i]);
	};
	return dist;
}

// Matches a target vector against the database.
// Returns [[x,y,matchedVector],distance]
function bestMatch(target){
	var curBest = null;
	var curBestScore = 32*3;
	for (var i = 0; i < squareFeaturesDb.length; i++) {
		var dbpoint = squareFeaturesDb[i];
		var nscore = hammingDist(target,dbpoint[2]);
		if(nscore<curBestScore){
			curBest=dbpoint;
			curBestScore=nscore;
		}
	};
	return [curBest,curBestScore];
}

function matchLists(squares,imageData,scoreDiffThresh,maxGoodDist){
	var from = [], to = [];
	for (var i = 0; i < squares.length; i++) {
		var square = squares[i];
		var features = scoreSquare(square,imageData,thresh,false);
		var match = bestMatch(features);
		if(match[2]<=maxGoodDist){
			from[from.length] = {
				x: match[0][0],
				y: match[0][1]
			};
			to[to.length] = square.center;
		}
	};
	return {
		from:from,
		to:to
	}
}

var ransac = jsfeat.motion_estimator.ransac;
var homo_kernel = new jsfeat.motion_model.homography2d();
var transform = new jsfeat.matrix_t(3, 3, jsfeat.F32_t | jsfeat.C1_t);
function doRansac(from,to){

	var count = from.length;
	var mask = new jsfeat.matrix_t(count, 1, jsfeat.U8_t | jsfeat.C1_t);
	var model_size = 10; // minimum points to estimate motion
	var thresh = 3; // max error to classify as inlier
	var eps = 0.5; // max outliers ratio
	var prob = 0.99; // probability of success
	var params = new jsfeat.ransac_params_t(model_size, thresh, eps, prob);
	var max_iters = 10000;
	var ok = ransac(params, homo_kernel, from, to, count, transform, mask, max_iters);
	
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
	    homo_kernel.run(newfrom, newto, transform, good_cnt);
	} else {
	    return false;
	}
	return transform.data;
}

function getTransformation(imageData){
	var SAMPLE_PTS_CT = 100,
		MAX_ATTEMPTS = 500,
		SQUARE_FIND_THRESH = 15,
		SQUARE_COMPARE_THRESH = 10,
		MAX_GOOD_MATCH_DIST = 4;

	var squares = [],
		from = [],
		to = [];
	var attempts = 0;
	while(squares.length < SAMPLE_PTS_CT && attempts < MAX_ATTEMPTS){
		var samplePt = {
			x:Math.floor(Math.random()*imageData.width),
			y:Math.floor(Math.random()*imageData.height)
		};
		var foundSquare = findSquare(samplePt,imageData,SQUARE_FIND_THRESH);
		if(foundSquare && 
		  !( foundSquare.center.x - foundSquare.size < 1
		  || foundSquare.center.y - foundSquare.size < 1
		  || foundSquare.center.x + foundSquare.size > imageData.width-2
		  || foundSquare.center.y + foundSquare.size > imageData.height-2)
		){
			var features = scoreSquare(foundSquare,imageData,SQUARE_COMPARE_THRESH,false);
			var match = bestMatch(features);
			if(match[1]<=MAX_GOOD_MATCH_DIST){
				var idx = squares.length;
				squares[idx] = foundSquare;
				from[idx] = {
					x: match[0][0],
					y: match[0][1]
				};
				to[idx] = foundSquare.center;
			}
		}
		attempts++;
	}
	console.log(squares, from, to);
	var tf = doRansac(from,to);
	return [tf,squares,from,to];
}
function applyTransformation(M,pt){
	var px = M[0]*pt.x + M[1]*pt.y + M[2];
	var py = M[3]*pt.x + M[4]*pt.y + M[5];
	var z = M[6]*pt.x + M[7]*pt.y + M[8];
	return {x:px/z,y:py/z};
}
function applyInterpolatedTransformation(M1,T1, M2, T2,pt,time){
	var interp = (time-T1)/(T2-T1);
	var p1 = applyTransformation(M1,pt);
	var p2 = applyTransformation(M2,pt);
	return {
		x: p1.x*(1-interp) + p2.x*interp,
		y: p1.y*(1-interp) + p2.y*interp
	};
}