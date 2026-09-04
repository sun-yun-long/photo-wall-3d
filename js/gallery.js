/**
 * 3D Grand Gallery - Dark Luxury Exhibition Engine
 * Upgraded to match high-fidelity Preview aesthetic
 * Powered by Three.js (WebGL)
 */

(function () {
	'use strict';

	// Configuration & Proportions matching intimate museum corridor
	const CONFIG = {
		galleryLength: 175,
		galleryWidth: 9.8,     // Intimate luxury corridor width (walls at ±4.9)
		galleryHeight: 6.8,    // High ceiling with recessed cove
		artSpacing: 7.6,       // Distance between painting pairs along corridor
		artHeight: 3.0,        // Eye-level hanging height
		artDistance: 3.6,      // Ideal inspection viewing distance
		artworksCount: 40,
		cruiseSpeed: 2.8,
		autoCruise: true,
		enableDust: true,
		floorReflectivity: 0.75,
		lightColorTemp: 'warm', // 'warm', 'neutral', 'cool'
	};

	// Color palettes for color temperatures
	const COLOR_TEMPS = {
		warm: { light: 0xffeed4, ambient: 0x4a4238, cove: 0xffbe55, glow: 0xffbb55 },
		neutral: { light: 0xffffff, ambient: 0x404048, cove: 0xffffff, glow: 0xffffff },
		cool: { light: 0xd8eeff, ambient: 0x364052, cove: 0x88ccff, glow: 0x88ccff },
	};

	// Image list (matching 40 files in images/ directory)
	const IMAGE_FILES = [
		'1.jpg', '2.jpg', '3.jpg', '4.jpg', '5.jpg', '6.jpg', '7.jpg', '8.jpg', '9.jpg', '10.jpg',
		'11.jpg', '12.jpg', '13.jpg', '14.jpg', '15.jpg', '16.jpg', '17.jpg', '18.jpg', '19.jpg', '20.jpg',
		'21.jpg', '22.jpg', '23.jpg', '24.jpg', '25.jpg', '26.jpg', '27.jpg', '28.jpg', '29.jpg', '30.jpg',
		'31.jpg', '32.jpg', '33.jpg', '34.jpg', '35.jpg', '36.jpg', '37.jpg', '38.jpg', '50.jpg', '51.jpg'
	];

	// Runtime variables
	let scene, camera, renderer, clock;
	let artworks = [];
	let interactiveMeshes = [];
	let floorReflector, dustParticles;
	let ambientLight, focusedSpotLight, coveLightMaterials = [];
	let raycaster, mouse;
	
	// Camera navigation state
	let isFocused = false;
	let focusedIndex = -1;
	let targetCamPos = new THREE.Vector3(0, 2.7, 10);
	let targetLookAt = new THREE.Vector3(0, 2.7, 24);
	let currentLookAt = new THREE.Vector3(0, 2.7, 24);
	
	// Cruise & animation variables
	let cruiseZ = 10;
	let cruiseDirection = 1; // 1 = forward (+Z), -1 = backward (-Z)
	let lastUserActionTime = performance.now();
	let isDragging = false;
	let previousPointerPos = { x: 0, y: 0 };
	let manualRotY = 0;
	let manualRotX = 0;
	let parallax = { x: 0, y: 0 };

	// Texture loader
	const textureLoader = new THREE.TextureLoader();

	/**
	 * High-Fidelity Procedural Textures
	 */
	function createLuxuryMarbleTexture() {
		const canvas = document.createElement('canvas');
		canvas.width = 1024;
		canvas.height = 1024;
		const ctx = canvas.getContext('2d');

		// Deep dark marble base
		ctx.fillStyle = '#0f1013';
		ctx.fillRect(0, 0, 1024, 1024);

		// Subtle tile slab grid (large slabs 512x512)
		ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
		ctx.lineWidth = 3;
		ctx.strokeRect(4, 4, 508, 508);
		ctx.strokeRect(516, 4, 504, 508);
		ctx.strokeRect(4, 516, 508, 504);
		ctx.strokeRect(516, 516, 504, 504);

		// Fine organic white & golden marble veins
		function drawVein(color, width, count) {
			ctx.strokeStyle = color;
			ctx.lineWidth = width;
			for (let i = 0; i < count; i++) {
				ctx.beginPath();
				let x = Math.random() * 1024;
				let y = Math.random() * 1024;
				ctx.moveTo(x, y);
				for (let j = 0; j < 6; j++) {
					x += (Math.random() - 0.45) * 180;
					y += (Math.random() - 0.45) * 180;
					ctx.lineTo(x, y);
				}
				ctx.stroke();
			}
		}

		drawVein('rgba(255, 240, 210, 0.07)', 2.5, 25);
		drawVein('rgba(255, 255, 255, 0.04)', 1.2, 45);
		drawVein('rgba(200, 180, 140, 0.05)', 4.0, 15);

		const texture = new THREE.CanvasTexture(canvas);
		texture.wrapS = THREE.RepeatWrapping;
		texture.wrapT = THREE.RepeatWrapping;
		texture.repeat.set(2, 30);
		return texture;
	}

	function createSpotlightWallDecal() {
		const canvas = document.createElement('canvas');
		canvas.width = 512;
		canvas.height = 512;
		const ctx = canvas.getContext('2d');

		// Warm conical / radial spotlight beam on wall
		const gradient = ctx.createRadialGradient(256, 120, 10, 256, 260, 250);
		gradient.addColorStop(0, 'rgba(255, 235, 190, 0.75)');
		gradient.addColorStop(0.25, 'rgba(255, 215, 150, 0.38)');
		gradient.addColorStop(0.6, 'rgba(230, 180, 110, 0.12)');
		gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

		ctx.fillStyle = gradient;
		ctx.fillRect(0, 0, 512, 512);

		const texture = new THREE.CanvasTexture(canvas);
		return texture;
	}

	function createSpotlightFloorDecal() {
		const canvas = document.createElement('canvas');
		canvas.width = 256;
		canvas.height = 256;
		const ctx = canvas.getContext('2d');

		// Warm pool of light on the floor
		const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
		gradient.addColorStop(0, 'rgba(255, 225, 160, 0.6)');
		gradient.addColorStop(0.35, 'rgba(255, 200, 120, 0.22)');
		gradient.addColorStop(0.7, 'rgba(255, 180, 90, 0.05)');
		gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

		ctx.fillStyle = gradient;
		ctx.fillRect(0, 0, 256, 256);

		const texture = new THREE.CanvasTexture(canvas);
		return texture;
	}

	function createLuxuryPlaqueTexture(numberText) {
		const canvas = document.createElement('canvas');
		canvas.width = 512;
		canvas.height = 130;
		const ctx = canvas.getContext('2d');

		// Brushed gold brass background
		const bg = ctx.createLinearGradient(0, 0, 512, 130);
		bg.addColorStop(0, '#c79c4a');
		bg.addColorStop(0.3, '#f2d586');
		bg.addColorStop(0.7, '#d6ab53');
		bg.addColorStop(1, '#a67b32');
		ctx.fillStyle = bg;
		ctx.fillRect(0, 0, 512, 130);

		// Inset double border
		ctx.strokeStyle = '#5a3f12';
		ctx.lineWidth = 5;
		ctx.strokeRect(5, 5, 502, 120);

		ctx.strokeStyle = '#fff2b8';
		ctx.lineWidth = 2;
		ctx.strokeRect(10, 10, 492, 110);

		// Engraved text
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		ctx.font = 'bold 36px "Cinzel", "Georgia", "Times New Roman", serif';
		ctx.fillStyle = '#1c1305';
		ctx.fillText(numberText, 256, 48);

		ctx.font = '600 20px "Cinzel", "Arial", sans-serif';
		ctx.fillStyle = '#3a270d';
		ctx.fillText('GRAND GALLERY COLLECTION', 256, 92);

		const texture = new THREE.CanvasTexture(canvas);
		return texture;
	}

	/**
	 * Initialize Three.js Scene
	 */
	function init() {
		clock = new THREE.Clock();
		raycaster = new THREE.Raycaster();
		mouse = new THREE.Vector2();

		// Scene & Deep Atmospheric Fog
		scene = new THREE.Scene();
		scene.background = new THREE.Color(0x0e0e12);
		scene.fog = new THREE.FogExp2(0x0e0e12, 0.012);

		// Camera - Eye level at Y = 2.7
		camera = new THREE.PerspectiveCamera(54, window.innerWidth / window.innerHeight, 0.1, 500);
		camera.position.set(0, 2.7, 10);
		currentLookAt.set(0, 2.7, 24);
		camera.lookAt(currentLookAt);

		// Renderer with filmic tone mapping
		renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
		renderer.setSize(window.innerWidth, window.innerHeight);
		renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
		renderer.toneMapping = THREE.ACESFilmicToneMapping;
		renderer.toneMappingExposure = 1.15;
		renderer.outputEncoding = THREE.sRGBEncoding;
		document.getElementById('canvas-container').appendChild(renderer.domElement);

		// Lighting
		setupLighting();

		// Architecture (Intimate corridor with recessed ceiling cove)
		buildGalleryHall();

		// Artworks with Ornate Gold Moulding
		buildArtworks();

		// Atmospheric Floating Dust Particles
		createDustParticles();

		// Event Listeners
		setupEvents();

		// Wallpaper Engine Setup
		setupWallpaperEngine();

		// Animation Loop
		animate();
	}

	/**
	 * Setup Scene Lighting
	 */
	function setupLighting() {
		const tempColors = COLOR_TEMPS[CONFIG.lightColorTemp] || COLOR_TEMPS.warm;

		// Ambient Light (Rich warm tone)
		ambientLight = new THREE.AmbientLight(tempColors.ambient, 2.0);
		scene.add(ambientLight);

		// Hemisphere Light for soft ceiling and floor fill
		const hemiLight = new THREE.HemisphereLight(0xfff3e0, 0x141418, 0.9);
		scene.add(hemiLight);

		// Dynamic Focused Artwork SpotLight
		focusedSpotLight = new THREE.SpotLight(tempColors.light, 3.8, 16, Math.PI / 4, 0.4, 1.2);
		focusedSpotLight.position.set(0, CONFIG.galleryHeight - 0.5, 10);
		focusedSpotLight.target.position.set(0, CONFIG.artHeight, 10);
		scene.add(focusedSpotLight);
		scene.add(focusedSpotLight.target);
	}

	/**
	 * Build Grand Gallery Architecture
	 */
	function buildGalleryHall() {
		const len = CONFIG.galleryLength;
		const width = CONFIG.galleryWidth;
		const height = CONFIG.galleryHeight;
		const halfW = width / 2; // 4.9

		// Wall Material (Warm Dark Charcoal Paint)
		const wallMaterial = new THREE.MeshStandardMaterial({
			color: 0x151619,
			roughness: 0.88,
			metalness: 0.1
		});

		// Baseboard & Crown Molding Material (Dark Polished Wood/Ebony)
		const trimMaterial = new THREE.MeshStandardMaterial({
			color: 0x0c0c0e,
			roughness: 0.35,
			metalness: 0.4
		});

		// Gold Accent Moulding
		const goldTrimMat = new THREE.MeshStandardMaterial({
			color: 0xd4af37,
			roughness: 0.25,
			metalness: 0.85
		});

		// 1. Left Wall (X = -halfW)
		const leftWallGeo = new THREE.PlaneGeometry(len, height);
		const leftWall = new THREE.Mesh(leftWallGeo, wallMaterial);
		leftWall.position.set(-halfW, height / 2, len / 2);
		leftWall.rotation.y = Math.PI / 2;
		scene.add(leftWall);

		// 2. Right Wall (X = halfW)
		const rightWallGeo = new THREE.PlaneGeometry(len, height);
		const rightWall = new THREE.Mesh(rightWallGeo, wallMaterial);
		rightWall.position.set(halfW, height / 2, len / 2);
		rightWall.rotation.y = -Math.PI / 2;
		scene.add(rightWall);

		// 3. Entrance Wall (Z = 0)
		const entranceWallGeo = new THREE.PlaneGeometry(width, height);
		const entranceWall = new THREE.Mesh(entranceWallGeo, wallMaterial);
		entranceWall.position.set(0, height / 2, 0);
		scene.add(entranceWall);

		// 4. Far End Wall (Z = len)
		const endWallGeo = new THREE.PlaneGeometry(width, height);
		const endWall = new THREE.Mesh(endWallGeo, wallMaterial);
		endWall.position.set(0, height / 2, len);
		endWall.rotation.y = Math.PI;
		scene.add(endWall);

		// 5. Baseboard Moldings (Left & Right)
		const baseboardGeo = new THREE.BoxGeometry(0.18, 0.38, len);
		const leftBaseboard = new THREE.Mesh(baseboardGeo, trimMaterial);
		leftBaseboard.position.set(-halfW + 0.09, 0.19, len / 2);
		scene.add(leftBaseboard);

		const rightBaseboard = new THREE.Mesh(baseboardGeo, trimMaterial);
		rightBaseboard.position.set(halfW - 0.09, 0.19, len / 2);
		scene.add(rightBaseboard);

		// 6. Crown Molding at Wall-Ceiling Junction
		const crownGeo = new THREE.BoxGeometry(0.22, 0.22, len);
		const leftCrown = new THREE.Mesh(crownGeo, trimMaterial);
		leftCrown.position.set(-halfW + 0.11, height - 0.11, len / 2);
		scene.add(leftCrown);

		const rightCrown = new THREE.Mesh(crownGeo, trimMaterial);
		rightCrown.position.set(halfW - 0.11, height - 0.11, len / 2);
		scene.add(rightCrown);

		// 7. Architectural Pilasters / Columns (Every 15.2 units)
		const pilasterInterval = CONFIG.artSpacing * 2;
		const pilasterCount = Math.floor(len / pilasterInterval);
		const pilasterGeo = new THREE.BoxGeometry(0.4, height, 0.4);

		for (let i = 0; i <= pilasterCount; i++) {
			const z = i * pilasterInterval + 7.6;
			if (z < len) {
				// Left Pilaster
				const pLeft = new THREE.Mesh(pilasterGeo, trimMaterial);
				pLeft.position.set(-halfW + 0.2, height / 2, z);
				scene.add(pLeft);

				// Right Pilaster
				const pRight = new THREE.Mesh(pilasterGeo, trimMaterial);
				pRight.position.set(halfW - 0.2, height / 2, z);
				scene.add(pRight);
			}
		}

		// 8. Luxury Recessed Tray Ceiling with Concealed Warm Cove Lighting (As in preview.jpg)
		const coveW = 4.2; // Central recessed width
		const sideW = (width - coveW) / 2; // 2.8 each side
		const recessDepth = 0.55;

		// Outer lower ceiling (Left & Right strips)
		const sideCeilingMat = new THREE.MeshStandardMaterial({ color: 0x111215, roughness: 0.9 });
		const sideCeilGeo = new THREE.PlaneGeometry(sideW, len);

		const leftCeil = new THREE.Mesh(sideCeilGeo, sideCeilingMat);
		leftCeil.position.set(-halfW + sideW / 2, height, len / 2);
		leftCeil.rotation.x = Math.PI / 2;
		scene.add(leftCeil);

		const rightCeil = new THREE.Mesh(sideCeilGeo, sideCeilingMat);
		rightCeil.position.set(halfW - sideW / 2, height, len / 2);
		rightCeil.rotation.x = Math.PI / 2;
		scene.add(rightCeil);

		// Center upper recessed ceiling
		const centerCeilGeo = new THREE.PlaneGeometry(coveW, len);
		const centerCeilingMat = new THREE.MeshStandardMaterial({ color: 0x16171c, roughness: 0.95 });
		const centerCeil = new THREE.Mesh(centerCeilGeo, centerCeilingMat);
		centerCeil.position.set(0, height + recessDepth, len / 2);
		centerCeil.rotation.x = Math.PI / 2;
		scene.add(centerCeil);

		// Warm Concealed LED Cove Strips (Glowing golden edges along the ceiling recess)
		const coveGlowMat = new THREE.MeshBasicMaterial({
			color: COLOR_TEMPS[CONFIG.lightColorTemp].cove,
		});
		coveLightMaterials.push(coveGlowMat);

		const coveStripGeo = new THREE.BoxGeometry(0.08, 0.08, len);
		const leftCove = new THREE.Mesh(coveStripGeo, coveGlowMat);
		leftCove.position.set(-coveW / 2, height + 0.04, len / 2);
		scene.add(leftCove);

		const rightCove = new THREE.Mesh(coveStripGeo, coveGlowMat);
		rightCove.position.set(coveW / 2, height + 0.04, len / 2);
		scene.add(rightCove);

		// 9. Ceiling Spotlight Track Rails & Suspended Fixtures
		const trackGeo = new THREE.BoxGeometry(0.12, 0.12, len);
		const leftTrack = new THREE.Mesh(trackGeo, trimMaterial);
		leftTrack.position.set(-halfW + 1.8, height - 0.3, len / 2);
		scene.add(leftTrack);

		const rightTrack = new THREE.Mesh(trackGeo, trimMaterial);
		rightTrack.position.set(halfW - 1.8, height - 0.3, len / 2);
		scene.add(rightTrack);

		// 10. Polished Black Marble Floor with High-Gloss Reflections
		const marbleTexture = createLuxuryMarbleTexture();

		if (typeof THREE.Reflector !== 'undefined') {
			const reflectorGeo = new THREE.PlaneGeometry(width, len);
			const refColor = new THREE.Color(0x353540).multiplyScalar(CONFIG.floorReflectivity);
			floorReflector = new THREE.Reflector(reflectorGeo, {
				clipBias: 0.003,
				textureWidth: 1024,
				textureHeight: 1024,
				color: refColor.getHex()
			});
			floorReflector.position.set(0, 0, len / 2);
			floorReflector.rotation.x = -Math.PI / 2;
			scene.add(floorReflector);

			// Semi-transparent overlay with stone marble veining & slab seams
			const floorOverlayMat = new THREE.MeshStandardMaterial({
				map: marbleTexture,
				transparent: true,
				opacity: 0.52,
				roughness: 0.18,
				metalness: 0.4
			});
			const floorOverlay = new THREE.Mesh(reflectorGeo, floorOverlayMat);
			floorOverlay.position.set(0, 0.008, len / 2);
			floorOverlay.rotation.x = -Math.PI / 2;
			scene.add(floorOverlay);
		} else {
			const floorGeo = new THREE.PlaneGeometry(width, len);
			const floorMat = new THREE.MeshStandardMaterial({
				map: marbleTexture,
				roughness: 0.12,
				metalness: 0.6,
				color: 0x1a1a20
			});
			const floor = new THREE.Mesh(floorGeo, floorMat);
			floor.position.set(0, 0, len / 2);
			floor.rotation.x = -Math.PI / 2;
			scene.add(floor);
		}
	}

	/**
	 * Build 40 Artworks with Ornate Gold-Trimmed Frames & Spotlight Pools
	 */
	function buildArtworks() {
		const count = CONFIG.artworksCount;
		const halfW = CONFIG.galleryWidth / 2;
		const wallDecalTex = createSpotlightWallDecal();
		const floorDecalTex = createSpotlightFloorDecal();

		// Shared frame materials
		const outerFrameMat = new THREE.MeshStandardMaterial({
			color: 0x121215,
			roughness: 0.35,
			metalness: 0.4
		});
		const richGoldMat = new THREE.MeshStandardMaterial({
			color: 0xd4af37,
			roughness: 0.22,
			metalness: 0.88
		});
		const passePartoutMat = new THREE.MeshStandardMaterial({
			color: 0xf2eee6,
			roughness: 0.95
		});
		const fixtureMat = new THREE.MeshStandardMaterial({
			color: 0xc89e48,
			roughness: 0.3,
			metalness: 0.85
		});
		const lensGlowMat = new THREE.MeshBasicMaterial({
			color: 0xfff0cc
		});

		// Spotlight wall wash decal
		const wallDecalGeo = new THREE.PlaneGeometry(4.8, 4.8);
		const wallDecalMat = new THREE.MeshBasicMaterial({
			map: wallDecalTex,
			transparent: true,
			opacity: 0.82,
			blending: THREE.AdditiveBlending,
			depthWrite: false
		});

		// Spotlight floor pool decal
		const floorDecalGeo = new THREE.PlaneGeometry(4.0, 4.0);
		const floorDecalMat = new THREE.MeshBasicMaterial({
			map: floorDecalTex,
			transparent: true,
			opacity: 0.7,
			blending: THREE.AdditiveBlending,
			depthWrite: false
		});

		for (let i = 0; i < count; i++) {
			const isLeft = (i % 2 === 0);
			const pairIndex = Math.floor(i / 2);
			const z = 10 + pairIndex * CONFIG.artSpacing;
			const x = isLeft ? (-halfW + 0.1) : (halfW - 0.1);
			const rotY = isLeft ? (Math.PI / 2) : (-Math.PI / 2);

			const artGroup = new THREE.Group();
			artGroup.position.set(x, CONFIG.artHeight, z);
			artGroup.rotation.y = rotY;

			// Frame Dimensions (Substantial Museum Proportions)
			const frameW = 4.2;
			const frameH = 3.2;

			// 1. Outer Dark Moulding
			const outerGeo = new THREE.BoxGeometry(frameW, frameH, 0.14);
			const outerMesh = new THREE.Mesh(outerGeo, outerFrameMat);
			outerMesh.position.z = -0.07;
			artGroup.add(outerMesh);

			// 2. Rich Stepped Gold Leaf Bevel (Outer Gold Rim)
			const goldOuterGeo = new THREE.BoxGeometry(frameW - 0.16, frameH - 0.16, 0.18);
			const goldOuterMesh = new THREE.Mesh(goldOuterGeo, richGoldMat);
			goldOuterMesh.position.z = -0.05;
			artGroup.add(goldOuterMesh);

			// 3. Inner Gold Fillet Bevel
			const goldInnerGeo = new THREE.BoxGeometry(frameW - 0.42, frameH - 0.42, 0.22);
			const goldInnerMesh = new THREE.Mesh(goldInnerGeo, richGoldMat);
			goldInnerMesh.position.z = -0.03;
			artGroup.add(goldInnerMesh);

			// 4. White Textured Mat Board (Passe-Partout)
			const matGeo = new THREE.BoxGeometry(frameW - 0.65, frameH - 0.65, 0.24);
			const matMesh = new THREE.Mesh(matGeo, passePartoutMat);
			matMesh.position.z = -0.02;
			artGroup.add(matMesh);

			// 5. Canvas Artwork (Inner Image)
			const canvasW = frameW - 1.1;
			const canvasH = frameH - 1.1;
			const canvasGeo = new THREE.PlaneGeometry(canvasW, canvasH);

			// Load texture
			const imgFile = IMAGE_FILES[i % IMAGE_FILES.length];
			const artTexture = textureLoader.load(
				'images/' + imgFile,
				undefined,
				undefined,
				function () {
					if (!corsNoticeShown && window.location.protocol === 'file:') {
						corsNoticeShown = true;
						showCorsNotice();
					}
				}
			);
			artTexture.encoding = THREE.sRGBEncoding;
			artTexture.generateMipmaps = true;
			artTexture.minFilter = THREE.LinearMipmapLinearFilter;

			// Canvas Material with self-illumination for crisp, vivid presentation
			const canvasMat = new THREE.MeshStandardMaterial({
				map: artTexture,
				emissive: 0xffffff,
				emissiveMap: artTexture,
				emissiveIntensity: 0.94,
				roughness: 0.25,
				metalness: 0.05
			});
			const canvasMesh = new THREE.Mesh(canvasGeo, canvasMat);
			canvasMesh.position.z = 0.11;
			artGroup.add(canvasMesh);

			// User data for interactive focus
			const itemData = {
				artworkIndex: i,
				imgFile: imgFile,
				title: 'Exhibition Masterpiece #' + (i + 1),
				worldPos: new THREE.Vector3(x, CONFIG.artHeight, z),
				viewPos: new THREE.Vector3(
					isLeft ? (x + CONFIG.artDistance) : (x - CONFIG.artDistance),
					CONFIG.artHeight,
					z
				),
				lookAtPos: new THREE.Vector3(x, CONFIG.artHeight, z)
			};
			canvasMesh.userData = itemData;
			outerMesh.userData = itemData;
			goldOuterMesh.userData = itemData;
			goldInnerMesh.userData = itemData;
			matMesh.userData = itemData;

			// 6. Brass Exhibition Nameplate below painting
			const plateGeo = new THREE.PlaneGeometry(1.3, 0.32);
			const plateTexture = createLuxuryPlaqueTexture(`NO. ${String(i + 1).padStart(2, '0')}`);
			const plateMat = new THREE.MeshStandardMaterial({
				map: plateTexture,
				metalness: 0.88,
				roughness: 0.25
			});
			const plateMesh = new THREE.Mesh(plateGeo, plateMat);
			plateMesh.position.set(0, -frameH / 2 - 0.34, 0.06);
			plateMesh.userData = itemData;
			artGroup.add(plateMesh);

			interactiveMeshes.push(canvasMesh, outerMesh, goldOuterMesh, goldInnerMesh, matMesh, plateMesh);

			// 7. Ceiling Spotlight Fixture (Brass & dark metal cylinder pointing down at painting)
			const trackX = isLeft ? (-halfW + 1.8) : (halfW - 1.8);
			const fixtureGroup = new THREE.Group();
			fixtureGroup.position.set(trackX, CONFIG.galleryHeight - 0.45, z);
			fixtureGroup.lookAt(x, CONFIG.artHeight + 0.3, z);

			const cylinderGeo = new THREE.CylinderGeometry(0.09, 0.13, 0.32, 12);
			cylinderGeo.rotateX(Math.PI / 2);
			const fixtureBody = new THREE.Mesh(cylinderGeo, fixtureMat);
			fixtureGroup.add(fixtureBody);

			const lensGeo = new THREE.CircleGeometry(0.12, 12);
			const lensMesh = new THREE.Mesh(lensGeo, lensGlowMat);
			lensMesh.position.z = 0.17;
			fixtureGroup.add(lensMesh);
			scene.add(fixtureGroup);

			// 8. Soft Warm Wall Wash Glow around the painting
			const wallGlow = new THREE.Mesh(wallDecalGeo, wallDecalMat);
			wallGlow.position.set(x + (isLeft ? 0.02 : -0.02), CONFIG.artHeight + 0.3, z);
			wallGlow.rotation.y = rotY;
			scene.add(wallGlow);

			// 9. Soft Warm Light Pool on the floor beneath painting
			const floorSpot = new THREE.Mesh(floorDecalGeo, floorDecalMat);
			floorSpot.position.set(isLeft ? (-halfW + 1.6) : (halfW - 1.6), 0.015, z);
			floorSpot.rotation.x = -Math.PI / 2;
			scene.add(floorSpot);

			scene.add(artGroup);

			artworks.push({
				index: i,
				group: artGroup,
				canvasMesh: canvasMesh,
				data: itemData
			});
		}
	}

	/**
	 * Floating Tyndall Atmospheric Dust Particles
	 */
	function createDustParticles() {
		const particleCount = 450;
		const geometry = new THREE.BufferGeometry();
		const positions = new Float32Array(particleCount * 3);
		const speeds = new Float32Array(particleCount * 3);

		for (let i = 0; i < particleCount; i++) {
			positions[i * 3] = (Math.random() - 0.5) * (CONFIG.galleryWidth - 1.5);
			positions[i * 3 + 1] = Math.random() * (CONFIG.galleryHeight - 1.2) + 0.5;
			positions[i * 3 + 2] = Math.random() * CONFIG.galleryLength;

			speeds[i * 3] = (Math.random() - 0.5) * 0.003;
			speeds[i * 3 + 1] = Math.random() * 0.006 + 0.002;
			speeds[i * 3 + 2] = (Math.random() - 0.5) * 0.003;
		}

		geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
		geometry.userData.speeds = speeds;

		// Circular soft glowing particle canvas texture
		const canvas = document.createElement('canvas');
		canvas.width = 32;
		canvas.height = 32;
		const ctx = canvas.getContext('2d');
		const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
		grad.addColorStop(0, 'rgba(255, 235, 190, 0.95)');
		grad.addColorStop(0.35, 'rgba(255, 210, 150, 0.4)');
		grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
		ctx.fillStyle = grad;
		ctx.fillRect(0, 0, 32, 32);

		const particleTexture = new THREE.CanvasTexture(canvas);

		const material = new THREE.PointsMaterial({
			size: 0.28,
			map: particleTexture,
			transparent: true,
			opacity: 0.65,
			blending: THREE.AdditiveBlending,
			depthWrite: false
		});

		dustParticles = new THREE.Points(geometry, material);
		dustParticles.visible = CONFIG.enableDust;
		scene.add(dustParticles);
	}

	function updateDustParticles() {
		if (!dustParticles || !dustParticles.visible) return;

		const positions = dustParticles.geometry.attributes.position.array;
		const speeds = dustParticles.geometry.userData.speeds;
		const count = positions.length / 3;

		for (let i = 0; i < count; i++) {
			positions[i * 3 + 1] += speeds[i * 3 + 1];
			positions[i * 3] += speeds[i * 3] + Math.sin(positions[i * 3 + 1] * 2) * 0.0015;

			if (positions[i * 3 + 1] > CONFIG.galleryHeight - 0.8) {
				positions[i * 3 + 1] = 0.4;
				positions[i * 3] = (Math.random() - 0.5) * (CONFIG.galleryWidth - 1.5);
			}
		}
		dustParticles.geometry.attributes.position.needsUpdate = true;
	}

	/**
	 * Focus Artwork & Camera Navigation
	 */
	function focusArtwork(index) {
		if (index < 0 || index >= artworks.length) return;

		isFocused = true;
		focusedIndex = index;
		const art = artworks[index];
		const data = art.data;

		targetCamPos.copy(data.viewPos);
		targetLookAt.copy(data.lookAtPos);

		// Move dynamic spotlight directly onto focused artwork
		focusedSpotLight.position.set(
			data.worldPos.x > 0 ? (data.worldPos.x - 2.5) : (data.worldPos.x + 2.5),
			CONFIG.galleryHeight - 0.6,
			data.worldPos.z
		);
		focusedSpotLight.target.position.copy(data.worldPos);
		focusedSpotLight.intensity = 4.2;

		// UI update
		updateInfoCard(index);
		lastUserActionTime = performance.now();
	}

	function exitFocus() {
		isFocused = false;
		focusedIndex = -1;

		// Return to corridor center aisle at eye level
		cruiseZ = Math.max(10, Math.min(CONFIG.galleryLength - 10, camera.position.z));
		targetCamPos.set(0, 2.7, cruiseZ);
		targetLookAt.set(0, 2.7, cruiseZ + (cruiseDirection * 14));

		focusedSpotLight.intensity = 1.0;
		hideInfoCard();
		lastUserActionTime = performance.now();
	}

	function nextArtwork() {
		if (!isFocused) {
			focusArtwork(0);
		} else {
			const nextIdx = (focusedIndex + 1) % artworks.length;
			focusArtwork(nextIdx);
		}
	}

	function prevArtwork() {
		if (!isFocused) {
			focusArtwork(artworks.length - 1);
		} else {
			const prevIdx = (focusedIndex - 1 + artworks.length) % artworks.length;
			focusArtwork(prevIdx);
		}
	}

	/**
	 * UI Updates
	 */
	function updateInfoCard(index) {
		const card = document.getElementById('info-card');
		const badge = document.getElementById('info-badge');
		const title = document.getElementById('info-title');

		if (card && badge && title) {
			badge.innerText = `EXHIBITION NO. ${String(index + 1).padStart(2, '0')} / ${artworks.length}`;
			title.innerText = `Gallery Piece #${index + 1}`;
			card.classList.add('visible');
		}
	}

	function hideInfoCard() {
		const card = document.getElementById('info-card');
		if (card) {
			card.classList.remove('visible');
		}
	}

	let corsNoticeShown = false;
	function showCorsNotice() {
		let banner = document.getElementById('cors-notice');
		if (!banner) {
			banner = document.createElement('div');
			banner.id = 'cors-notice';
			banner.style.cssText = 'position:fixed;top:24px;left:50%;transform:translateX(-50%);z-index:9999;background:rgba(28,28,34,0.94);border:1px solid rgba(212,175,55,0.6);color:#f5f5f5;padding:14px 28px;border-radius:12px;font-size:13px;backdrop-filter:blur(16px);box-shadow:0 12px 40px rgba(0,0,0,0.7);text-align:center;pointer-events:auto;line-height:1.7;max-width:90%;';
			banner.innerHTML = '<span style="color:#d4af37;font-weight:700;font-size:14px;">⚠️ 浏览器本地跨域安全提示</span><br>当前以 <code>file://</code> 协议直接打开，现代浏览器限制了本地图片加载为 WebGL 纹理。<br>👉 <strong>解决方案</strong>：双击运行根目录的 <code>start_server.bat</code> 启动本地服务，或在 Wallpaper Engine 中直接加载使用！<br><button onclick="this.parentElement.remove()" style="margin-top:8px;background:rgba(255,255,255,0.15);border:none;color:#fff;padding:4px 16px;border-radius:14px;cursor:pointer;font-size:12px;">我知道了</button>';
			document.body.appendChild(banner);
		}
	}

	/**
	 * Event Handlers
	 */
	function setupEvents() {
		window.addEventListener('resize', onWindowResize, false);

		// Mouse & Touch movement
		window.addEventListener('mousemove', onMouseMove, false);
		window.addEventListener('mousedown', onMouseDown, false);
		window.addEventListener('mouseup', onMouseUp, false);

		// Touch events
		window.addEventListener('touchstart', onTouchStart, { passive: false });
		window.addEventListener('touchmove', onTouchMove, { passive: false });
		window.addEventListener('touchend', onTouchEnd, false);

		// Keyboard Navigation
		window.addEventListener('keydown', onKeyDown, false);

		// UI Buttons
		const btnPrev = document.getElementById('btn-prev');
		const btnNext = document.getElementById('btn-next');
		const btnCruise = document.getElementById('btn-cruise');
		const btnOverview = document.getElementById('btn-overview');
		const btnCloseCard = document.getElementById('btn-close-card');

		if (btnPrev) btnPrev.addEventListener('click', (e) => { e.stopPropagation(); prevArtwork(); });
		if (btnNext) btnNext.addEventListener('click', (e) => { e.stopPropagation(); nextArtwork(); });
		if (btnCruise) {
			btnCruise.addEventListener('click', (e) => {
				e.stopPropagation();
				CONFIG.autoCruise = !CONFIG.autoCruise;
				btnCruise.innerHTML = CONFIG.autoCruise ? '❚❚ 暂停巡游' : '▶ 自动漫游';
				if (isFocused) exitFocus();
			});
		}
		if (btnOverview) {
			btnOverview.addEventListener('click', (e) => {
				e.stopPropagation();
				exitFocus();
			});
		}
		if (btnCloseCard) {
			btnCloseCard.addEventListener('click', (e) => {
				e.stopPropagation();
				exitFocus();
			});
		}
	}

	function onWindowResize() {
		camera.aspect = window.innerWidth / window.innerHeight;
		camera.updateProjectionMatrix();
		renderer.setSize(window.innerWidth, window.innerHeight);
	}

	function onMouseMove(event) {
		parallax.x = (event.clientX / window.innerWidth) * 2 - 1;
		parallax.y = -(event.clientY / window.innerHeight) * 2 + 1;

		mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
		mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

		if (isDragging) {
			const deltaX = event.clientX - previousPointerPos.x;
			const deltaY = event.clientY - previousPointerPos.y;
			manualRotY -= deltaX * 0.003;
			manualRotX -= deltaY * 0.003;
			manualRotX = Math.max(-0.5, Math.min(0.5, manualRotX));
			previousPointerPos = { x: event.clientX, y: event.clientY };
			lastUserActionTime = performance.now();
		} else {
			raycaster.setFromCamera(mouse, camera);
			const intersects = raycaster.intersectObjects(interactiveMeshes);
			if (intersects.length > 0) {
				document.body.style.cursor = 'pointer';
			} else {
				document.body.style.cursor = isDragging ? 'grabbing' : 'default';
			}
		}
	}

	function onMouseDown(event) {
		if (event.target.closest('#ui-container') || event.target.closest('#info-card')) return;

		isDragging = true;
		previousPointerPos = { x: event.clientX, y: event.clientY };
		lastUserActionTime = performance.now();
	}

	function onMouseUp(event) {
		if (event.target.closest('#ui-container') || event.target.closest('#info-card')) return;

		const dragDist = Math.hypot(event.clientX - previousPointerPos.x, event.clientY - previousPointerPos.y);
		isDragging = false;
		document.body.style.cursor = 'default';

		if (dragDist < 5) {
			mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
			mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
			raycaster.setFromCamera(mouse, camera);
			const intersects = raycaster.intersectObjects(interactiveMeshes);

			if (intersects.length > 0) {
				const hitArtwork = intersects[0].object;
				focusArtwork(hitArtwork.userData.artworkIndex);
			} else {
				if (isFocused) {
					exitFocus();
				}
			}
		}
	}

	function onTouchStart(event) {
		if (event.touches.length === 1) {
			previousPointerPos = { x: event.touches[0].clientX, y: event.touches[0].clientY };
			isDragging = true;
			lastUserActionTime = performance.now();
		}
	}

	function onTouchMove(event) {
		if (isDragging && event.touches.length === 1) {
			const deltaX = event.touches[0].clientX - previousPointerPos.x;
			const deltaY = event.touches[0].clientY - previousPointerPos.y;
			manualRotY -= deltaX * 0.004;
			manualRotX -= deltaY * 0.004;
			manualRotX = Math.max(-0.5, Math.min(0.5, manualRotX));
			previousPointerPos = { x: event.touches[0].clientX, y: event.touches[0].clientY };
			lastUserActionTime = performance.now();
		}
	}

	function onTouchEnd() {
		isDragging = false;
	}

	function onKeyDown(event) {
		lastUserActionTime = performance.now();
		if (event.key === 'ArrowRight' || event.key === 'd' || event.key === 'D') {
			nextArtwork();
		} else if (event.key === 'ArrowLeft' || event.key === 'a' || event.key === 'A') {
			prevArtwork();
		} else if (event.key === 'Escape' || event.key === ' ') {
			if (isFocused) exitFocus();
		}
	}

	/**
	 * Main Animation Loop
	 */
	function animate() {
		requestAnimationFrame(animate);

		const delta = Math.min(clock.getDelta(), 0.1);
		const now = performance.now();
		const idleTime = (now - lastUserActionTime) / 1000;

		if (!isDragging) {
			manualRotX *= 0.95;
			manualRotY *= 0.95;
		}

		// Auto-Cruise Mode
		if (CONFIG.autoCruise && !isFocused && idleTime > 2.5) {
			cruiseZ += cruiseDirection * CONFIG.cruiseSpeed * delta;

			if (cruiseZ > CONFIG.galleryLength - 14) {
				cruiseZ = CONFIG.galleryLength - 14;
				cruiseDirection = -1;
			} else if (cruiseZ < 10) {
				cruiseZ = 10;
				cruiseDirection = 1;
			}

			// Gentle cinematic eye-level sway
			const swayX = Math.sin(now * 0.0007) * 0.6;
			const swayY = 2.7 + Math.cos(now * 0.0005) * 0.1;
			targetCamPos.set(swayX, swayY, cruiseZ);

			// Soft glancing at passing paintings
			const glanceAngle = Math.sin(now * 0.0008) * 1.8;
			targetLookAt.set(
				glanceAngle,
				2.7 + Math.sin(now * 0.0006) * 0.1,
				cruiseZ + (cruiseDirection * 15)
			);
		}

		// Smooth Camera Interpolation (Cubic Lerp)
		const posLerpFactor = isFocused ? 0.06 : 0.04;
		const rotLerpFactor = isFocused ? 0.08 : 0.05;

		camera.position.lerp(targetCamPos, posLerpFactor);
		currentLookAt.lerp(targetLookAt, rotLerpFactor);

		// Apply manual look & subtle mouse parallax
		const effectiveLookAt = currentLookAt.clone();
		if (!isFocused) {
			effectiveLookAt.x += parallax.x * 0.9 + manualRotY * 12;
			effectiveLookAt.y += parallax.y * 0.6 + manualRotX * 8;
		} else {
			effectiveLookAt.x += parallax.x * 0.25;
			effectiveLookAt.y += parallax.y * 0.18;
		}

		camera.lookAt(effectiveLookAt);

		// Update floating dust motes
		updateDustParticles();

		// Render Frame
		renderer.render(scene, camera);
	}

	/**
	 * Wallpaper Engine Integration
	 */
	function setupWallpaperEngine() {
		window.wallpaperPropertyListener = {
			applyUserProperties: function (properties) {
				if (properties.cruiseSpeed) {
					CONFIG.cruiseSpeed = parseFloat(properties.cruiseSpeed.value);
				}

				if (properties.autoCruise) {
					CONFIG.autoCruise = properties.autoCruise.value;
					const btnCruise = document.getElementById('btn-cruise');
					if (btnCruise) {
						btnCruise.innerHTML = CONFIG.autoCruise ? '❚❚ 暂停巡游' : '▶ 自动漫游';
					}
				}

				if (properties.floorReflectivity && floorReflector) {
					CONFIG.floorReflectivity = parseFloat(properties.floorReflectivity.value) / 100;
					const refColor = new THREE.Color(0x353540).multiplyScalar(CONFIG.floorReflectivity);
					floorReflector.material.uniforms['color'].value = refColor;
				}

				if (properties.lightColorTemp) {
					CONFIG.lightColorTemp = properties.lightColorTemp.value;
					const temp = COLOR_TEMPS[CONFIG.lightColorTemp] || COLOR_TEMPS.warm;
					if (ambientLight) ambientLight.color.setHex(temp.ambient);
					if (focusedSpotLight) focusedSpotLight.color.setHex(temp.light);
					coveLightMaterials.forEach(mat => mat.color.setHex(temp.cove));
				}

				if (properties.enableDust && dustParticles) {
					CONFIG.enableDust = properties.enableDust.value;
					dustParticles.visible = CONFIG.enableDust;
				}
			}
		};
	}

	// Start engine when DOM is ready
	if (document.readyState === 'loading') {
		window.addEventListener('DOMContentLoaded', init);
	} else {
		init();
	}

})();
