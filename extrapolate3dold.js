Extrapolate3D = {};

// Uses the method described in 
// http://imaging.utk.edu/publications/papers/1995/abidi_pami95.pdf
// to get 3d points in camera from four 2d image points and corresponding object points.
// Depends on sylvester.js
Extrapolate3D.setupTarget = function(objectPts){
	var oPt1 = $V([objectPts[0].x,objectPts[0].y,0]),
		oPt2 = $V([objectPts[1].x,objectPts[1].y,0]),
		oPt3 = $V([objectPts[2].x,objectPts[2].y,0]),
		oPt4 = $V([objectPts[3].x,objectPts[3].y,0]);

	var P12 = oPt1.minus(oPt2),
		P13 = oPt1.minus(oPt3),
		P14 = oPt1.minus(oPt4),
		P23 = oPt2.minus(oPt3),
		P24 = oPt2.minus(oPt4);

	var s12sq = P12.dot(P12),
		s13sq = P13.dot(P13),
		s14sq = P14.dot(P14),
		s23sq = P23.dot(P23),
		s24sq = P24.dot(P24);

	var A1 = P12.cross(p13).norm()/2,
		A2 = P12.cross(p14).norm()/2,
		A3 = P13.cross(p14).norm()/2,
		A4 = P23.cross(p24).norm()/2;

	var A = [0,A1,A2,A3,A4];
	var P=[],s=[], ssq=[];
	for (var i = 0; i < 4; i++) {
		P[i] = [];
		s[i] = [];
		ssq[i] = [];
		for (var j = 0; j <= 4; j++) {
			P[i][j] = 
			ssq[]
		};
	};

	return [A1,A2,A3,A4,s12sq,s13sq,s14sq,s23sq,s24sq];
}
Extrapolate3D.getCameraOrientationBad = function(imagePts, target){
	var A1 = target[0],
		A2 = target[1],
		A3 = target[2],
		A4 = target[3],
		s12sq = target[4],
		s13sq = target[5],
		s14sq = target[6],
		s23sq = target[7],
		s24sq = target[8];

	var s12 = Math.sqrt(s12sq),
		s13 = Math.sqrt(s13sq),
		s14 = Math.sqrt(s14sq),
		s23 = Math.sqrt(s23sq),
		s24 = Math.sqrt(s24sq);

	var x1 = imagePts[0].x,
		y1 = imagePts[0].y,
		x2 = imagePts[1].x,
		y2 = imagePts[1].y,
		x3 = imagePts[2].x,
		y3 = imagePts[2].y,
		x4 = imagePts[3].x,
		y4 = imagePts[3].y;

	var B1 = x1*(y3-y2) + y1*(x2-x3) + y2*x3 - x2*y3,
		B2 = x1*(y4-y2) + y1*(x2-x4) + y2*x4 - x2*y4,
		B3 = x1*(y4-y3) + y1*(x3-x4) + y3*x4 - x3*y4,
		B4 = x2*(y4-y3) + y2*(x3-x4) + y3*x4 - x3*y4;

	var C12 = B3*A4/(A3*B4),
		C13 = B2*A4/(A2*B4),
		C14 = B1*A4/(A1*B4),

		C23 = C13/C12,
		C24 = C14/C12,

		C34 = C14/C13,
		C41 = 1/C14;

	var H12sq = Math.pow(x1 - C12*x2,2) + Math.pow(y1 - C12*y2,2),
		H13sq = Math.pow(x1 - C13*x3,2) + Math.pow(y1 - C13*y3,2),
		H14sq = Math.pow(x1 - C14*x4,2) + Math.pow(y1 - C14*y4,2),
		H23sq = Math.pow(x2 - C23*x3,2) + Math.pow(y2 - C23*y3,2),
		H24sq = Math.pow(x2 - C24*x4,2) + Math.pow(y2 - C24*y4,2);

	var f = Math.sqrt( (s13sq*H12sq - s12sq*H13sq)/(s12sq*Math.pow(1-C13,2) -  s13sq*Math.pow(1-C12,2)) );


	var x = [], y=[];
	for (var i = 1; i <= 4; i++) {
		x[i] = imagePts[i-1].x;
		y[i] = imagePts[i-1].y;
	};


/*
	var F1 = Math.sqrt(x1*x1 + y1*y1 + f*f);

	var d1 = Math.sqrt(s12sq)*F1*Math.sqrt(H12sq + Math.pow(f*(1-C12),2));
	*/
}
