SquareDetect = {};
SquareDetect.getImageCoord = function(x,y,imageData){
	return (x*4 + y*imageData.width*4);
}
SquareDetect.getImagePixel = function(x,y,imageData){
	var coord = SquareDetect.getImageCoord(x,y,imageData);
	return [imageData.data[coord], 
			imageData.data[coord+1], 
			imageData.data[coord+2], 
			imageData.data[coord+3]];
}
SquareDetect.getImagePixelIntensity = function(x,y,imageData){
	var coord = SquareDetect.getImageCoord(x,y,imageData);
	return (0.0+imageData.data[coord]+ 
			imageData.data[coord+1]+ 
			imageData.data[coord+2]);
}
SquareDetect.getMedianImagePixelIntensity = function(x,y,imageData){
	var intensities = [];
	for (var i = 0; i < 3; i++) {
		for (var j = 0; j < 3; j++) {
			intensities[3*i + j] = SquareDetect.getImagePixelIntensity(x+i-1, y+j-1, imageData);
		};
	};
	intensities.sort( function(a,b) {return a - b;} );
	return intensities[4];
}


SquareDetect.spanDirs = {
	LEFT: 0,
	RIGHT: 1,
	UP: 2,
	DOWN: 3
};
SquareDetect.castTestPoints = function(point,imageData,thresh, maxLen){
	var px = point.x,
		py = point.y,
		pval = SquareDetect.getImagePixelIntensity(px,py,imageData);
	var x,y,val;

	x=px-1; y=py; lastval=pval;
	var lspan = 0;
	while(x>=0){
		var nval = SquareDetect.getImagePixelIntensity(x,y,imageData);
		if(Math.abs(nval - pval) > thresh){
			break;
		}
		lastval = nval;
		lspan++;
		x--;
		if(lspan == maxLen){
			lspan = 0;
			break;
		}
	}

	x=px+1; y=py; lastval=pval;
	var rspan = 0;
	while(x<imageData.width){
		var nval = SquareDetect.getImagePixelIntensity(x,y,imageData);
		if(Math.abs(nval - pval) > thresh){
			break;
		}
		lastval = nval;
		rspan++;
		x++;
		if(rspan == maxLen){
			rspan = 0;
			break;
		}
	}

	x=px; y=py-1; lastval=pval;
	var uspan = 0;
	while(y>=0){
		var nval = SquareDetect.getImagePixelIntensity(x,y,imageData);
		if(Math.abs(nval - pval) > thresh){
			break;
		}
		lastval = nval;
		uspan++;
		y--;
		if(uspan == maxLen){
			uspan = 0;
			break;
		}
	}

	x=px; y=py+1; lastval=pval;
	var dspan = 0;
	while(y<imageData.height){
		var nval = SquareDetect.getImagePixelIntensity(x,y,imageData);
		if(Math.abs(nval - pval) > thresh){
			break;
		}
		lastval = nval;
		dspan++;
		y++;
		if(dspan == maxLen){
			dspan = 0;
			break;
		}
	}
	return [lspan,rspan,uspan,dspan];
}
SquareDetect.drawSpans = function(point,spans,drawCtx,color){
	drawCtx.strokeStyle = color;
	drawCtx.beginPath();
	drawCtx.moveTo(point.x - spans[spanDirs.LEFT], point.y);
	drawCtx.lineTo(point.x + spans[spanDirs.RIGHT], point.y);
	drawCtx.moveTo(point.x, point.y - spans[spanDirs.UP]);
	drawCtx.lineTo(point.x, point.y + spans[spanDirs.DOWN]);
	drawCtx.stroke();
}
SquareDetect.findSquare = function(point,imageData,thresh){
	var spanDirs = SquareDetect.spanDirs;
	var origSpans = SquareDetect.castTestPoints(point,imageData,thresh,20);
	//drawSpans(point,origSpans,drawCtx,'blue');

	//Estimate actual center of square based on spans
	var newCenter = {
		x: Math.round(point.x + (origSpans[spanDirs.RIGHT] - origSpans[spanDirs.LEFT])/2),
		y: Math.round(point.y + (origSpans[spanDirs.DOWN] - origSpans[spanDirs.UP])/2),
	};
	var centerSpans = SquareDetect.castTestPoints(newCenter,imageData,thresh,20);
	var avgSpan = (centerSpans[0] + centerSpans[1] + centerSpans[2] + centerSpans[3])/4;


	//Check if spans indicate this is in central 9th of square
	if(Math.abs(centerSpans[spanDirs.LEFT] + centerSpans[spanDirs.RIGHT] - centerSpans[spanDirs.UP] - centerSpans[spanDirs.DOWN]) > avgSpan){
		//drawSpans(newCenter,centerSpans,drawCtx,'red');
		return null;
	}
	for (var i = 0; i < centerSpans.length; i++) {
		if(centerSpans[i]<2 || Math.abs(avgSpan - centerSpans[i]) > avgSpan/3){
			//Reject this square
			//drawSpans(newCenter,centerSpans,drawCtx,'red');
			return null;
		}
	};

	//We have a good square!
	//drawSpans(newCenter,centerSpans,drawCtx,'green');
	return {
		center:newCenter,
		size:Math.round(avgSpan*2)
	}
}
