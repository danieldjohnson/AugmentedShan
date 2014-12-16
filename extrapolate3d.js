Extrapolate3D = {};

// Uses the method described in 
// http://imaging.utk.edu/publications/papers/1995/abidi_pami95.pdf
// to get 3d points in camera from four 2d image points and corresponding object points.
// Depends on sylvester.js
Extrapolate3D.setupTarget = function(objectPts){
	var oPt = [];
	for (var i = 1; i <= 4; i++) {
		oPt[i] = $V([objectPts[i-1].x,objectPts[i-1].y,0]);
	}
	var P=[],s=[], ssq=[];
	for (var i = 1; i <= 4; i++) {
		P[i] = [];
		s[i] = [];
		ssq[i] = [];
		for (var j = 1; j <= 4; j++) {
			P[i][j] = oPt[i].subtract(oPt[j]);
			ssq[i][j] = P[i][j].dot(P[i][j]);
			s[i][j] = Math.sqrt(ssq[i][j]);
		};
	};
	var A = [];
	A[1] = P[1][2].cross(P[1][3]).modulus()/2,
	A[2] = P[1][2].cross(P[1][4]).modulus()/2,
	A[3] = P[1][3].cross(P[1][4]).modulus()/2,
	A[4] = P[2][3].cross(P[2][4]).modulus()/2;

	return {
		A:A,
		s:s,
		ssq:ssq,
	}
}
Extrapolate3D.getCameraOrientation = function(imagePts, target){
	var A = target.A,
		s = target.s,
		ssq = target.ssq;

	var x = [], y=[];
	for (var i = 1; i <= 4; i++) {
		x[i] = imagePts[i-1].x;
		y[i] = imagePts[i-1].y;
	};

	var B = [];
	B[1] = Math.abs(x[1]*(y[3]-y[2]) + y[1]*(x[2]-x[3]) + y[2]*x[3] - x[2]*y[3]),
	B[2] = Math.abs(x[1]*(y[4]-y[2]) + y[1]*(x[2]-x[4]) + y[2]*x[4] - x[2]*y[4]),
	B[3] = Math.abs(x[1]*(y[4]-y[3]) + y[1]*(x[3]-x[4]) + y[3]*x[4] - x[3]*y[4]),
	B[4] = Math.abs(x[2]*(y[4]-y[3]) + y[2]*(x[3]-x[4]) + y[3]*x[4] - x[3]*y[4]);

	var C = [];
	C[1]=[];
	C[1][1] = 1;
	C[1][2] = B[3]*A[4]/(A[3]*B[4]),
	C[1][3] = B[2]*A[4]/(A[2]*B[4]),
	C[1][4] = B[1]*A[4]/(A[1]*B[4]);
	for (var i = 2; i <= 4; i++) {
		C[i] = [];
		for (var j = 1; j <= 4; j++) {
			C[i][j] = C[1][j]/C[1][i];
		};
	};

	var Hsq = [];
	for (var i = 1; i <= 4; i++) {
		Hsq[i] = [];
		for (var j = 1; j <= 4; j++) {
			Hsq[i][j] = Math.pow(x[i]-C[i][j]*x[j],2) + Math.pow(y[i]-C[i][j]*y[j],2);
		};
	};

	var valid3Sets = [[1,2,3],[1,2,4],[1,3,4],[2,1,3],[2,1,4],[2,3,4],[3,1,2],[3,1,4],[3,2,4],[4,1,2],[4,1,3],[4,2,3]];

	var fTot = 0;
	for (var setIdx = 0; setIdx < valid3Sets.length; setIdx++) {
		var set = valid3Sets[setIdx],
			i = set[0],
			j = set[1],
			k = set[2];
		fTot += Math.sqrt((ssq[i][k]*Hsq[i][j] - ssq[i][j]*Hsq[i][k])/(ssq[i][j]*Math.pow(1-C[i][k],2) - ssq[i][k]*Math.pow(1-C[i][j],2)) )
	};
	var f = fTot/valid3Sets.length;
	var fsq = f*f;

	var R = []; //
	for (var i = 1; i <= 4; i++) {
		var j = i%4 + 1;
		R[i] = Math.sqrt(Hsq[i][j] + fsq*Math.pow(C[i][j],2));
	};

	var valid2Sets = [[1,2],[1,3],[1,4],[2,3],[2,4],[3,4]];
	var d1overF1tot = 0;
	for (var setIdx = 0; setIdx < valid2Sets.length; setIdx++) {
		var set = valid2Sets[setIdx],
			a = set[0],
			b = set[1];
		d1overF1tot += s[a][b]/( Math.sqrt(Hsq[a][b] + fsq*Math.pow(1-C[a][b],2))*C[1][a] );
	};
	var d1overF1 = d1overF1tot/valid2Sets.length;

	var P = [];
	for (var i = 1; i <= 4; i++) {
		var factor = C[1][i]*d1overF1;
		P[i] = {
			x: -x[i]*factor,
			y: -y[i]*factor,
			z: f*(factor + 1)
		}
	};

	return {
		f:f,
		P:P.slice(1)
	};
}

Extrapolate3D.getCameraToImageTransform = function(f){
	return [[f,0,0,0],
			[0,f,0,0],
			[0,0,f,0],
			[0,0,-1,f]];
}

//Uses Horn's method to find the absolute orientation
Extrapolate3D.findAbsoluteOrientationMatrix = function(cameraPts,objectPts){
	// I think it maps A onto B
	A = [[],[],[]], B=[[],[],[]];
	for (var i = 0; i < cameraPts.length; i++) {
		var cameraPt = cameraPts[i];
		var objectPt = objectPts[i];
		A[0][i] = cameraPt.x;
		A[1][i] = cameraPt.y;
		A[2][i] = cameraPt.z;
		B[0][i] = objectPt.x;
		B[1][i] = objectPt.y;
		B[2][i] = objectPt.z || 0;
	};


}


// TODO
// - Port from sylvester to math.js
// - Make sure random added negative is reasonable (I'm not sure that actually makes sense)
//     May want to try making x and y negative, or centering around middle of image?
