function ExtrapolatedHomographyCamera(pixelwidth,pixelheight){
	THREE.Camera.call( this );
	this.orthographicProjection = new THREE.Matrix4();
	this.orthographicProjection.makeOrthographic(0,pixelwidth,0,pixelheight,5,-5);
	this.intrinsic = CameraMatrixUtil.getDefaultIntrinsic(pixelwidth,pixelheight);
}
ExtrapolatedHomographyCamera.prototype = Object.create(THREE.Camera.prototype);
ExtrapolatedHomographyCamera.prototype.fromHomography = function fromMatrix(homography){
	var t = CameraMatrixUtil.extrapolate3DMatrix(homography,this.intrinsic,true,true);
	
	this.projectionMatrix.set(t[0][0], t[0][1], t[0][2], t[0][3],
							  t[1][0], t[1][1], t[1][2], t[1][3],
							  0   , 0   , 1   , 0   ,
							  t[2][0], t[2][1], t[2][2], t[2][3]);
	this.projectionMatrix.multiplyMatrices(this.orthographicProjection,this.projectionMatrix);
}

var vertexShader = multiline(function(){/*
	varying vec2 vUv;
	varying vec2 screenpos;

	void main()
	{
		vUv = uv;
		vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
		gl_Position = projectionMatrix * mvPosition;

		vec3 ndc = gl_Position.xyz / gl_Position.w; //perspective divide/normalize
		vec2 viewportCoord = ndc.xy * 0.5 + 0.5; //ndc is -1 to 1 in GL. scale for 0 to 1

		screenpos = viewportCoord;
	}
*/});
var windowMaskShader = multiline(function(){/*
	uniform vec2 resolution;
	uniform sampler2D background;
	uniform float cutoff;

	varying vec2 vUv;
	varying vec2 screenpos;

	void main( void ) {
		vec2 position = vUv;
		vec3 backColor = texture2D( background, screenpos ).rgb;
		float intensity = backColor.r + backColor.g + backColor.b;
		if(intensity<cutoff){
			gl_FragColor = vec4(backColor,1.0);
		}else{
			gl_FragColor = vec4(0.0,0.0,0.0,0.0);
			//gl_FragColor = vec4(0.0,1.0,0.0,1.0);
		}
	}
*/});


function GameRenderer(){
	var backgroundSourceCanvas,
		backgroundScene,
		backgroundCamera,
		backgroundTexture,
		bg,
		objectScene,
		objectCamera,
		renderer,
		pixelwidth,
		pixelheight;

	var transients = [];
	var numTransients = 0;
	function putTransient(x,y){
		var tx = 2*x/pixelwidth -1;
		var ty = 2*y/pixelheight -1;

		if(numTransients >= transients.length){
			var t = new THREE.Mesh(
			  new THREE.PlaneBufferGeometry(0.005, 0.005, 0,0),
			  new THREE.MeshBasicMaterial({color:'#00FF00'})
			);
			transients[numTransients] = t;
		}
		transients[numTransients].position.set(-tx,-ty,0);
		backgroundScene.add(transients[numTransients]);
		numTransients++;
	}
	function clearTransients(){
		for (var i = 0; i < transients.length; i++) {
			backgroundScene.remove(transients[i]);
		};
		numTransients = 0;
	}

	var LEFT = -1, RIGHT = 1, FLOATING = 0;
	var windowblocks = [
		{  x:16, y:7, side:LEFT},
		{  x:21, y:7, side:RIGHT},		
		{  x:35, y:7, side:LEFT},
		{  x:40, y:7, side:RIGHT},		
		{  x:12, y:22, side:LEFT},
		{  x:17, y:22, side:RIGHT},		
		{  x:31, y:22, side:LEFT},
		{  x:36, y:22, side:RIGHT},
		{  x:48, y:7, z:-7, source:49, side:FLOATING}		
	];

	var boxes = [];
	var numBoxes = 0;
	function addBox(x,y,color){
		var mcolor=new THREE.Color(color);
		if(numBoxes < boxes.length){
			boxes[numBoxes].material.color=mcolor;
			boxes[numBoxes].material.ambient=mcolor;
			boxes[numBoxes].position.set(x+0.5, y+0.5, -0.5);
			objectScene.add(boxes[numBoxes]);
			numBoxes++;
		}else{
			var geometry = new THREE.BoxGeometry( 1, 1, 1 );
			var material = new THREE.MeshLambertMaterial( { color: mcolor, ambient:mcolor, shading: THREE.FlatShading,} );
			var cube = new THREE.Mesh( geometry, material );
			cube.position.set(x+0.5, y+0.5, -0.5);
			objectScene.add(cube);
			boxes[boxes.length]=cube;
			numBoxes++;
		}
		
	}
	function removeBoxes(){
		for (var i = 0; i < numBoxes; i++) {
			objectScene.remove(boxes[i]);
		};
		numBoxes=0
	}

	var food;
	function moveFood(x,y){
		food.position.set(x+0.5, y+0.5, -0.5);
		objectScene.add(food);
	}
	function hideFood(){
		objectScene.remove(food);
	}

	var playerMarker;
	function movePlayerMarker(x,y){
		playerMarker.position.set(x+0.5, y+0.5, -0.5);
		objectScene.add(playerMarker);
	}
	function hidePlayerMarker(){
		objectScene.remove(playerMarker);
	}

	gameRenderer = {
		setup: function setup(sourceCanvas,renderCanvas,pwidth,pheight){
			pixelwidth = pwidth;
			pixelheight = pheight;

			backgroundSourceCanvas = sourceCanvas;
			//Sets up the renderer
			backgroundScene = new THREE.Scene();
			backgroundCamera = new THREE.Camera();

			backgroundTexture = new THREE.Texture(sourceCanvas);
			backgroundTexture.needsUpdate = true;

			bg = new THREE.Mesh(
			  new THREE.PlaneBufferGeometry(2, 2, 0),
			  new THREE.MeshBasicMaterial({map: backgroundTexture})
			);
			// The bg plane shouldn't care about the z-buffer.
			bg.material.depthTest = false;
			bg.material.depthWrite = false;
			backgroundScene.add(backgroundCamera);
			backgroundScene.add(bg);



			objectScene = new THREE.Scene();
			objectCamera = new ExtrapolatedHomographyCamera(pixelwidth,pixelheight);
			objectScene.add(objectCamera);

			var geometry = new THREE.Geometry();
		    geometry.vertices.push(new THREE.Vector3(0, 0, 0));
		    geometry.vertices.push(new THREE.Vector3(52, 0, 0));
		    geometry.vertices.push(new THREE.Vector3(52, 34, 0));
		    geometry.vertices.push(new THREE.Vector3(0, 34, 0));
		    geometry.vertices.push(new THREE.Vector3(0, 0, 0));
			var gridObject = new THREE.Line(
				geometry,
				new THREE.LineBasicMaterial({color:'#00FFFF', linewidth:3})
			);
			//gridObject.position.set(26,17,-0.5);
			//gridObject.material.transparent = true;
			//gridObject.material.blending = THREE.MultiplyBlending;
			objectScene.add(gridObject);

			var windowsillMaterial = new THREE.ShaderMaterial( {
				uniforms: {},
				vertexShader:vertexShader,
				fragmentShader: windowMaskShader
			} );
			windowsillMaterial.transparent=true;
			for (var i = 0; i < windowblocks.length; i++) {
				w = windowblocks[i];
				w.uniforms = {
					cutoff:{type:'f', value:110/255},
					resolution:{type: "v2", value: new THREE.Vector2(pixelwidth,pixelheight)},
					background:{type: "t", value: backgroundTexture}
				};
				var material = windowsillMaterial.clone();
				material.uniforms = w.uniforms;
				var windowSillObject = new THREE.Mesh(
					new THREE.BoxGeometry(5,4,4),
					material
				);
				windowSillObject.position.set(w.x+2.5,w.y+2,(w.z||0)-2);
				//windowSillObject.material.transparent = true;
				//windowSillObject.material.blending = THREE.MultiplyBlending;
				objectScene.add(windowSillObject);
			};

			var geometry = new THREE.BoxGeometry( 0.5, 0.5, 0.5 );
			var material = new THREE.MeshLambertMaterial( { color: 'white', ambient:'white', emissive:'#555555', shading: THREE.FlatShading,} );
			food = new THREE.Mesh( geometry, material );
			
			var geometry = new THREE.BoxGeometry( 1.3, 1.3, 1.2 );
			var material = new THREE.MeshLambertMaterial( { color: 'white', ambient:'white', emissive:'#555555', shading: THREE.FlatShading,} );
			material.transparent = true;
			material.opacity=0.5;
			playerMarker = new THREE.Mesh( geometry, material );

			// add subtle blue ambient lighting
			var ambientLight = new THREE.AmbientLight(0x888888);
			objectScene.add(ambientLight);

			// directional lighting
			var directionalLight = new THREE.DirectionalLight(0xffffff);
			directionalLight.position.set(-0.7, -1.4, -1).normalize();
			objectScene.add(directionalLight);

			renderer = new THREE.WebGLRenderer({canvas:renderCanvas, antialias: true });
			renderer.setSize( window.innerWidth, window.innerHeight );

		},
		addTransientSquare: putTransient,
		clearTransientSquares: clearTransients,
		draw: function draw(matrix){
			backgroundTexture.needsUpdate = true;
			renderer.autoClear = false;
			renderer.clear();
			renderer.render(backgroundScene, backgroundCamera);
			if(matrix){
				objectCamera.fromHomography(matrix);
				renderer.render(objectScene, objectCamera);
			}
		},
		updateWindowsillMasks: function(matrix, imageData){
			//console.group('Updating windowsill cutoffs');
			for (var i = 0; i < windowblocks.length; i++) {
				var w = windowblocks[i];
				var intensities = [];
				var intensityTot = 0;
				var x = w.x;
				if(w.side == LEFT){
					x -= 4;
				}else if(w.side == RIGHT){
					x += 8;
				}else if(w.side == FLOATING){
					x = w.source;
				}
				var y = w.y;
				for (var j = 0; j < 8; j++) {
					var imageCoord = SquareMatch.applyTransformation(matrix,{x:x,y:y});
					imageCoord={
						x:Math.round(imageCoord.x),
						y:Math.round(imageCoord.y),
					}
					var intensity = SquareDetect.getMedianImagePixelIntensity(imageCoord.x, imageCoord.y, imageData);
					intensities.push(intensity);
					intensityTot+=intensity;
					y++;
				};
				var avgIntensity = intensityTot/8;
				intensities.sort( function(a,b) {return a - b;} );
				var cutoff = avgIntensity - 3*(avgIntensity - intensities[1])
				cutoff = intensities[0]*0.8;
				w.uniforms.cutoff.value = cutoff/255;
				//console.log(cutoff,w.uniforms.cutoff.value);
			};
			//console.groupEnd();
		},

		addBox:addBox,
		removeBoxes:removeBoxes,
		moveFood:moveFood,
		hideFood:hideFood,
		movePlayerMarker:movePlayerMarker,
		hidePlayerMarker:hidePlayerMarker,

	}
	return gameRenderer;
}