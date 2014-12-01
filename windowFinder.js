var homo_kernel = new jsfeat.motion_model.homography2d();
var homo_transform = new jsfeat.matrix_t(3, 3, jsfeat.F32_t | jsfeat.C1_t);
function updateTransform(imageData,lastTransform, ctx){
	var MIN_CORNERS_NEEDED = 8;

	var foundCorners = findCorners(imageData,lastTransform,ctx);
	if(foundCorners.length < MIN_CORNERS_NEEDED){
		return null;
	}else{
		homo_kernel.run(foundCorners.from, foundCorners.to, homo_transform, foundCorners.length);
		return homo_transform.buffer.f32;
	}
}

var cornerDirs = {
	LEFT:-1,
	RIGHT:1,
	UP:-1,
	DOWN:1
};
function findCorners(imageData,lastTransform,ctx){
	var LEFT = cornerDirs.LEFT,
		RIGHT = cornerDirs.RIGHT,
		UP = cornerDirs.UP,
		DOWN = cornerDirs.DOWN;
	var cornerPositions = [
		[{x:16,y:7},RIGHT,DOWN],
		[{x:26,y:7},LEFT,DOWN],
		[{x:16,y:15},RIGHT,UP],
		[{x:26,y:15},LEFT,UP],

		[{x:35,y:7},RIGHT,DOWN],
		[{x:45,y:7},LEFT,DOWN],
		[{x:35,y:15},RIGHT,UP],
		[{x:45,y:15},LEFT,UP],

		[{x:12,y:22},RIGHT,DOWN],
		[{x:22,y:22},LEFT,DOWN],
		[{x:12,y:30},RIGHT,UP],
		[{x:22,y:30},LEFT,UP],

		[{x:31,y:22},RIGHT,DOWN],
		[{x:41,y:22},LEFT,DOWN],
		[{x:31,y:30},RIGHT,UP],
		[{x:41,y:30},LEFT,UP],
	];

	var from = [],
		to = [];
	for (var i = 0; i < cornerPositions.length; i++) {
		var curPos = cornerPositions[i];
		var found = findWindowCorner(imageData,lastTransform,curPos[0],curPos[1],curPos[2],ctx);
		if(found){
			//Corners are slightly inside the desired location, so change from pts accordingly
			from.push({
				x:curPos[0].x + curPos[1]*0.1,
				y:curPos[0].y + curPos[2]*0.1,
			});
			to.push(found);

			ctx.fillStyle = 'green';
			ctx.fillRect(found.x-1,found.y-1,2,2);
		}
	};
	return {
		from:from,
		to:to,
		length:from.length
	};
}
function findWindowCorner(imageData, transform, pt, xDir, yDir, ctx){
	var MAX_SWEEP_DIST = 20;

	var testPt = applyTransformation(transform,{
		x: pt.x + 0.5*xDir,
		y: pt.y - 0.7*yDir
	});
	var xPt1 = sweepFindWindowEdge(imageData,testPt,0,yDir,MAX_SWEEP_DIST);
	ctx.fillStyle = 'red';
	ctx.fillRect(testPt.x-1,testPt.y,2,2);
	ctx.fillStyle = 'orange';
	if(xPt1) ctx.fillRect(xPt1.x-1,xPt1.y,2,2);


	testPt = applyTransformation(transform,{
		x: pt.x + 3.5*xDir,
		y: pt.y - 0.7*yDir
	});
	var xPt2 = sweepFindWindowEdge(imageData,testPt,0,yDir,MAX_SWEEP_DIST);
	ctx.fillStyle = 'red';
	ctx.fillRect(testPt.x-1,testPt.y,2,2);
	ctx.fillStyle = 'orange';
	if(xPt2) ctx.fillRect(xPt2.x-1,xPt2.y,2,2);


	testPt = applyTransformation(transform,{
		x: pt.x - 0.7*xDir,
		y: pt.y + 0.5*yDir
	});
	var yPt1 = sweepFindWindowEdge(imageData,testPt,xDir,0,MAX_SWEEP_DIST);
	ctx.fillStyle = 'red';
	ctx.fillRect(testPt.x-1,testPt.y,2,2);
	ctx.fillStyle = 'orange';
	if(yPt1) ctx.fillRect(yPt1.x-1,yPt1.y,2,2);


	testPt = applyTransformation(transform,{
		x: pt.x - 0.7*xDir,
		y: pt.y + 3.5*yDir
	});
	var yPt2 = sweepFindWindowEdge(imageData,testPt,xDir,0,MAX_SWEEP_DIST);
	ctx.fillStyle = 'red';
	ctx.fillRect(testPt.x-1,testPt.y,2,2);
	ctx.fillStyle = 'orange';
	if(yPt2) ctx.fillRect(yPt2.x-1,yPt2.y,2,2);


	if(xPt1==null || xPt2==null || yPt1==null || yPt2==null) return null;

	var intersect = lineLineIntersect(xPt1,xPt2,yPt1,yPt2);
	return intersect;
}
function sweepFindWindowEdge(imageData,pt,dx,dy,maxDist) {
	// Finds the window edge by sweeping through the imageData until it hits a pixel
	// of intensity 1/2 of the original
	var x = Math.round(pt.x);
	var y = Math.round(pt.y);

	if(x < 0 || x >= imageData.width || y < 0 || y >= imageData.height) return null;

	var startIntensity = getImagePixelIntensity(x,y,imageData);
	var dist = 0;
	while(true){
		x += dx;
		y += dy;
		dist++;
		if(x < 0 || x >= imageData.width || y < 0 || y >= imageData.height || dist>maxDist){
			return null;
		}else{
			var newIntensity = getImagePixelIntensity(x,y,imageData);
			if(newIntensity < startIntensity*.6){
				return {
					x:x,
					y:y
				};
			}
		}
	}
}

function lineLineIntersect(s1,e1,s2,e2){
    var A1 = e1.y-s1.y,
        B1 = s1.x-e1.x,
        C1 = A1*s1.x + B1*s1.y,

        A2 = e2.y-s2.y,
        B2 = s2.x-e2.x,
        C2 = A2*s2.x + B2*s2.y,

        det = A1*B2 - A2*B1;
    if(det==0) return null;
    var x = (B2*C1 - B1*C2)/det,
        y = (A1*C2 - A2*C1)/det;

    return {x:x,y:y};
}