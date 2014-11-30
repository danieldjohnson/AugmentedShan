function getImageCoord(x,y,imageData){
	return (x*4 + y*imageData.width*4);
}
function getImagePixel(x,y,imageData){
	var coord = getImageCoord(x,y,imageData);
	return [imageData.data[coord], 
			imageData.data[coord+1], 
			imageData.data[coord+2], 
			imageData.data[coord+3]];
}
function getImagePixelIntensity(x,y,imageData){
	var coord = getImageCoord(x,y,imageData);
	return (0.0+imageData.data[coord]+ 
			imageData.data[coord+1]+ 
			imageData.data[coord+2]);
}
function getMedianImagePixelIntensity(x,y,imageData){
	var intensities = [];
	for (var i = 0; i < 3; i++) {
		for (var j = 0; j < 3; j++) {
			intensities[3*i + j] = getImagePixelIntensity(x+i-1, y+j-1, imageData);
		};
	};
	intensities.sort( function(a,b) {return a - b;} );
	return intensities[4];
}


var SPAN_LEFT = 0, SPAN_RIGHT = 1, SPAN_UP = 2, SPAN_DOWN=3;
function castTestPoints(point,imageData,thresh, maxLen){
	var px = point.x,
		py = point.y,
		pval = getImagePixelIntensity(px,py,imageData);
	var x,y,val;

	x=px-1; y=py; lastval=pval;
	var lspan = 0;
	while(x>=0){
		var nval = getImagePixelIntensity(x,y,imageData);
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
		var nval = getImagePixelIntensity(x,y,imageData);
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
		var nval = getImagePixelIntensity(x,y,imageData);
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
		var nval = getImagePixelIntensity(x,y,imageData);
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
function drawSpans(point,spans,drawCtx,color){
	drawCtx.strokeStyle = color;
	drawCtx.beginPath();
	drawCtx.moveTo(point.x - spans[SPAN_LEFT], point.y);
	drawCtx.lineTo(point.x + spans[SPAN_RIGHT], point.y);
	drawCtx.moveTo(point.x, point.y - spans[SPAN_UP]);
	drawCtx.lineTo(point.x, point.y + spans[SPAN_DOWN]);
	drawCtx.stroke();
}
function findSquare(point,imageData,thresh){
	var origSpans = castTestPoints(point,imageData,thresh,20);
	//drawSpans(point,origSpans,drawCtx,'blue');

	//Estimate actual center of square based on spans
	var newCenter = {
		x: Math.round(point.x + (origSpans[SPAN_RIGHT] - origSpans[SPAN_LEFT])/2),
		y: Math.round(point.y + (origSpans[SPAN_DOWN] - origSpans[SPAN_UP])/2),
	};
	var centerSpans = castTestPoints(newCenter,imageData,thresh,20);
	var avgSpan = (centerSpans[0] + centerSpans[1] + centerSpans[2] + centerSpans[3])/4;


	//Check if spans indicate this is in central 9th of square
	if(Math.abs(centerSpans[SPAN_LEFT] + centerSpans[SPAN_RIGHT] - centerSpans[SPAN_UP] - centerSpans[SPAN_DOWN]) > avgSpan){
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
