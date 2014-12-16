var CameraMatrixUtil = {};

CameraMatrixUtil.f = 400;


CameraMatrixUtil.getDefaultIntrinsic = function(width,height){
	return [[CameraMatrixUtil.f,	0,		width/2	],
			[0,		CameraMatrixUtil.f,	height/2],
			[0,		0,		1 		]];
}

CameraMatrixUtil.extrapolate3DMatrix = function(homography,intrinsic, enforceOrthogonal, preserveHomography){
	//console.log(homography);
	if(homography.length > 3){
		var h = homography;
		homography = [
			[h[0],h[1],h[2]],
			[h[3],h[4],h[5]],
			[h[6],h[7],h[8]],
		]
	}

	var Kprime = math.inv(intrinsic);
	var orientation2d = math.multiply(Kprime,homography);
	var components = math.transpose(orientation2d);
	var r1 = components[0];
	var r2 = components[1];
	var t = components[2];

	var normFactor = math.norm(r1);
	r1 = math.divide(r1,normFactor);
	r2 = math.divide(r2,normFactor);
	t = math.divide(t,normFactor);

	var r3 = math.cross(r1,r2);
	var rotMatrix = math.transpose([r1,r2,r3]);

	if(enforceOrthogonal){
		var svd = numeric.svd(rotMatrix);
		rotMatrix = math.multiply(svd.U, math.transpose(svd.V));
	}

	if(preserveHomography){
		var nrcomponents = math.transpose(rotMatrix);
		var r3 = nrcomponents[2];
		rotMatrix = math.transpose([r1,r2,r3]);
	}

	var finalOrientation = math.concat(rotMatrix,math.map(t,function(x){return [x]}));

	var finalTransform = math.multiply(intrinsic,finalOrientation);

	return finalTransform;
}
CameraMatrixUtil.apply3DTransform = function(transform,pt){
	var vec = math.multiply(transform,[[pt.x],[pt.y],[pt.z],[1]]);
	return {x:vec[0][0]/vec[2][0], y:vec[1][0]/vec[2][0]};
}