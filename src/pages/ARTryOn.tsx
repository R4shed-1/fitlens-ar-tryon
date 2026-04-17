import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Camera, Upload, Loader2, RefreshCw, AlertCircle, CheckCircle2, Eye, Grid3x3, Sparkles } from 'lucide-react';
import { products } from '@/lib/products';

interface GlassesModel {
  id: string;
  name: string;
  modelPath: string;
  preview: string;
}

const glassesOptions: GlassesModel[] = [
  { id: 'glasses-01', name: 'Mirage Sport', modelPath: '/models-3d-all/glasses-01/scene.gltf', preview: '/models-3d-all/glasses-01/glasses_01.png' },
  { id: 'glasses-02', name: 'Onyx Wayfarer', modelPath: '/models-3d-all/glasses-02/scene.gltf', preview: '/models-3d-all/glasses-02/glasses_02.png' },
  { id: 'glasses-03', name: 'Azure Horizon', modelPath: '/models-3d-all/glasses-03/scene.gltf', preview: '/models-3d-all/glasses-03/glasses_03.png' },
  { id: 'glasses-04', name: 'Crimson Heritage', modelPath: '/models-3d-all/glasses-04/scene.gltf', preview: '/models-3d-all/glasses-04/glasses_04.png' },
  { id: 'glasses-05', name: 'Sahara Aviator', modelPath: '/models-3d-all/glasses-05/scene.gltf', preview: '/models-3d-all/glasses-05/glasses_05.png' },
  { id: 'glasses-06', name: 'Violet Muse', modelPath: '/models-3d-all/glasses-06/scene.gltf', preview: '/models-3d-all/glasses-06/glasses_06.png' },
  { id: 'glasses-07', name: 'Atelier Wireframe', modelPath: '/models-3d-all/glasses-07/scene.gltf', preview: '/models-3d-all/glasses-07/glasses_07.png' },
];

export default function ARTryOn3DUltimate() {
  const [searchParams] = useSearchParams();
  const productId = searchParams.get('product');
  const initialGlasses = (() => {
    if (!productId) return glassesOptions[0];
    const product = products.find((p) => p.id === productId);
    const match = product?.arModelId && glassesOptions.find((g) => g.id === product.arModelId);
    return match ?? glassesOptions[0];
  })();

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const threeCanvasRef = useRef<HTMLCanvasElement>(null);
  
  const [faceLandmarker, setFaceLandmarker] = useState<FaceLandmarker | null>(null);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [selectedGlasses, setSelectedGlasses] = useState<GlassesModel>(initialGlasses);
  const [error, setError] = useState<string | null>(null);
  const [showMesh, setShowMesh] = useState(false);
  const [showDepth, setShowDepth] = useState(true);
  const [debug, setDebug] = useState({
    faceDetected: false,
    landmarksFound: false,
    drawingActive: false,
  });
  
  const animationFrameRef = useRef<number>();
  const isDrawingRef = useRef(false);
  const lastVideoTimeRef = useRef(-1);
  const smoothedLeftRef = useRef({ x: 0, y: 0, z: 0 });
  const smoothedRightRef = useRef({ x: 0, y: 0, z: 0 });
  const smoothedPoseRef = useRef({ pitch: 0, yaw: 0, roll: 0 });
  const smoothingFactor = 0.7;
  
  // Three.js references
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const glassesModelRef = useRef<THREE.Group | null>(null);
  const faceMeshRef = useRef<THREE.Points | null>(null);
  const shadowPlaneRef = useRef<THREE.Mesh | null>(null);
  const loaderRef = useRef<GLTFLoader>(new GLTFLoader());

  // Load MediaPipe
  useEffect(() => {
    const loadModel = async () => {
      try {
        console.log('🔄 Loading MediaPipe Face Landmarker...');
        
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
        );
        
        const landmarker = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
            delegate: 'GPU'
          },
          runningMode: 'VIDEO',
          numFaces: 1,
          minFaceDetectionConfidence: 0.5,
          minFacePresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
          outputFaceBlendshapes: true,
          outputFacialTransformationMatrixes: true
        });

        setFaceLandmarker(landmarker);
        setIsModelLoaded(true);
        console.log('✅ MediaPipe loaded with advanced features');
      } catch (err) {
        setError('Failed to load MediaPipe: ' + (err as Error).message);
        console.error('❌ Error:', err);
      }
    };
    loadModel();
  }, []);

  // Initialize Three.js with advanced features
  useEffect(() => {
    if (!threeCanvasRef.current) return;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      45,
      threeCanvasRef.current.width / threeCanvasRef.current.height,
      0.1,
      1000
    );
    camera.position.z = 5;
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      canvas: threeCanvasRef.current,
      alpha: true,
      antialias: true,
    });
    renderer.setSize(threeCanvasRef.current.width, threeCanvasRef.current.height);
    renderer.setClearColor(0x000000, 0);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    // Advanced lighting with shadows
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 0.8);
    keyLight.position.set(2, 2, 3);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 50;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
    fillLight.position.set(-2, 0, 2);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xffffff, 0.2);
    rimLight.position.set(0, -2, -2);
    scene.add(rimLight);

    // Shadow receiving plane (invisible but catches shadows)
    const shadowGeometry = new THREE.PlaneGeometry(10, 10);
    const shadowMaterial = new THREE.ShadowMaterial({ opacity: 0.3 });
    const shadowPlane = new THREE.Mesh(shadowGeometry, shadowMaterial);
    shadowPlane.receiveShadow = true;
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = -0.5;
    shadowPlane.visible = false;
    scene.add(shadowPlane);
    shadowPlaneRef.current = shadowPlane;

    // Create 3D face mesh wireframe
    const faceMeshGeometry = new THREE.BufferGeometry();
    const faceMeshMaterial = new THREE.PointsMaterial({
      color: 0x00ff00,
      size: 0.02,
      transparent: true,
      opacity: 0.6,
    });
    const faceMesh = new THREE.Points(faceMeshGeometry, faceMeshMaterial);
    faceMesh.visible = false;
    scene.add(faceMesh);
    faceMeshRef.current = faceMesh;

    console.log('✅ Three.js initialized with advanced features');

    return () => {
      renderer.dispose();
    };
  }, []);

  // Load selected 3D model
  useEffect(() => {
    if (!sceneRef.current) return;

    if (glassesModelRef.current) {
      sceneRef.current.remove(glassesModelRef.current);
      glassesModelRef.current = null;
    }

    console.log('🔄 Loading 3D model:', selectedGlasses.name);
    
    loaderRef.current.load(
      selectedGlasses.modelPath,
      (gltf) => {
        const model = gltf.scene;
        
        model.scale.set(0.01, 0.01, 0.01);
        model.position.set(0, 0, 0);
        model.rotation.y = 0;
        
        // Enable shadows
        model.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });
        
        glassesModelRef.current = model;
        sceneRef.current?.add(model);
        
        console.log('✅ 3D model loaded with shadows');
      },
      undefined,
      (err) => {
        console.error('❌ Model error:', err);
      }
    );
  }, [selectedGlasses]);

  const startWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 1280 }, 
          height: { ideal: 720 }, 
          facingMode: 'user' 
        },
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().then(() => {
            setIsStreaming(true);
            setError(null);
          });
        };
      }
    } catch (err) {
      setError('Camera access denied');
      console.error('Webcam error:', err);
    }
  };

  const stopWebcam = () => {
    isDrawingRef.current = false;
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
      setIsStreaming(false);
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    lastVideoTimeRef.current = -1;
    smoothedLeftRef.current = { x: 0, y: 0, z: 0 };
    smoothedRightRef.current = { x: 0, y: 0, z: 0 };
    smoothedPoseRef.current = { pitch: 0, yaw: 0, roll: 0 };
    setDebug({ faceDetected: false, landmarksFound: false, drawingActive: false });
  };

  // Calculate head pose (pitch, yaw, roll) from landmarks
  const calculateHeadPose = (landmarks: any[], canvas: HTMLCanvasElement) => {
    // Key points for head pose estimation
    const noseTip = landmarks[1]; // Nose tip
    const chinBottom = landmarks[152]; // Chin
    const leftEye = landmarks[33]; // Left eye outer corner
    const rightEye = landmarks[263]; // Right eye outer corner
    const leftMouth = landmarks[61]; // Left mouth corner
    const rightMouth = landmarks[291]; // Right mouth corner

    // Convert to canvas coordinates
    const noseX = noseTip.x * canvas.width;
    const noseY = noseTip.y * canvas.height;
    const noseZ = noseTip.z || 0;
    
    const chinX = chinBottom.x * canvas.width;
    const chinY = chinBottom.y * canvas.height;
    
    const leftEyeX = leftEye.x * canvas.width;
    const rightEyeX = rightEye.x * canvas.width;
    const leftEyeY = leftEye.y * canvas.height;
    const rightEyeY = rightEye.y * canvas.height;
    
    // Calculate roll (head tilt left/right)
    const eyeDx = rightEyeX - leftEyeX;
    const eyeDy = rightEyeY - leftEyeY;
    const roll = Math.atan2(eyeDy, eyeDx);
    
    // Calculate pitch (head tilt up/down)
    const noseChinDy = chinY - noseY;
    const pitch = Math.atan2(noseChinDy, canvas.height * 0.3) - Math.PI / 2;
    
    // Calculate yaw (head turn left/right)
    const faceCenter = (leftEyeX + rightEyeX) / 2;
    const faceCenterNormalized = (faceCenter / canvas.width) - 0.5;
    const yaw = faceCenterNormalized * Math.PI * 0.5;
    
    return { pitch, yaw, roll };
  };

  // Main detection and rendering with ALL advanced features
  const detectFaceAndRender3D = () => {
    if (!isDrawingRef.current) return;
    if (!videoRef.current || !canvasRef.current || !threeCanvasRef.current || !faceLandmarker) {
      animationFrameRef.current = requestAnimationFrame(detectFaceAndRender3D);
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx || video.readyState !== video.HAVE_ENOUGH_DATA) {
      animationFrameRef.current = requestAnimationFrame(detectFaceAndRender3D);
      return;
    }

    // Resize canvases
    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      threeCanvasRef.current.width = video.videoWidth;
      threeCanvasRef.current.height = video.videoHeight;
      
      if (rendererRef.current && cameraRef.current) {
        rendererRef.current.setSize(canvas.width, canvas.height);
        cameraRef.current.aspect = canvas.width / canvas.height;
        cameraRef.current.updateProjectionMatrix();
      }
    }

    // Draw video
    ctx.save();
    ctx.scale(-1, 1);
    ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
    ctx.restore();

    // Detect face with advanced features
    try {
      const results = faceLandmarker.detectForVideo(video, performance.now());

      if (results && results.faceLandmarks && results.faceLandmarks.length > 0) {
        const landmarks = results.faceLandmarks[0];
        
        // Update 3D face mesh visualization
        if (faceMeshRef.current && showMesh) {
          const positions: number[] = [];
          landmarks.forEach((landmark: any) => {
            const x = ((landmark.x * canvas.width / canvas.width) * 2 - 1) * 3;
            const y = -((landmark.y * canvas.height / canvas.height) * 2 - 1) * 3;
            const z = (landmark.z || 0) * 3;
            positions.push(x, y, z);
          });
          
          faceMeshRef.current.geometry.setAttribute(
            'position',
            new THREE.Float32BufferAttribute(positions, 3)
          );
          faceMeshRef.current.visible = true;
        } else if (faceMeshRef.current) {
          faceMeshRef.current.visible = false;
        }
        
        // Eye landmarks
        const leftEyeIndices = [33, 133, 160, 159, 158, 157, 173, 246];
        const rightEyeIndices = [362, 263, 387, 386, 385, 384, 398, 466];
        
        // Calculate eye centers with Z depth
        let leftEyeX = 0, leftEyeY = 0, leftEyeZ = 0;
        leftEyeIndices.forEach(idx => {
          leftEyeX += landmarks[idx].x;
          leftEyeY += landmarks[idx].y;
          leftEyeZ += landmarks[idx].z || 0;
        });
        leftEyeX = (leftEyeX / leftEyeIndices.length) * canvas.width;
        leftEyeY = (leftEyeY / leftEyeIndices.length) * canvas.height;
        leftEyeZ = leftEyeZ / leftEyeIndices.length;

        let rightEyeX = 0, rightEyeY = 0, rightEyeZ = 0;
        rightEyeIndices.forEach(idx => {
          rightEyeX += landmarks[idx].x;
          rightEyeY += landmarks[idx].y;
          rightEyeZ += landmarks[idx].z || 0;
        });
        rightEyeX = (rightEyeX / rightEyeIndices.length) * canvas.width;
        rightEyeY = (rightEyeY / rightEyeIndices.length) * canvas.height;
        rightEyeZ = rightEyeZ / rightEyeIndices.length;

        // Mirror X
        const mirroredLeftX = canvas.width - leftEyeX;
        const mirroredRightX = canvas.width - rightEyeX;

        // Smooth coordinates
        smoothedLeftRef.current.x = smoothedLeftRef.current.x * smoothingFactor + mirroredLeftX * (1 - smoothingFactor);
        smoothedLeftRef.current.y = smoothedLeftRef.current.y * smoothingFactor + leftEyeY * (1 - smoothingFactor);
        smoothedLeftRef.current.z = smoothedLeftRef.current.z * smoothingFactor + leftEyeZ * (1 - smoothingFactor);
        
        smoothedRightRef.current.x = smoothedRightRef.current.x * smoothingFactor + mirroredRightX * (1 - smoothingFactor);
        smoothedRightRef.current.y = smoothedRightRef.current.y * smoothingFactor + rightEyeY * (1 - smoothingFactor);
        smoothedRightRef.current.z = smoothedRightRef.current.z * smoothingFactor + rightEyeZ * (1 - smoothingFactor);

        const finalLeftX = smoothedLeftRef.current.x;
        const finalLeftY = smoothedLeftRef.current.y;
        const finalLeftZ = smoothedLeftRef.current.z;
        const finalRightX = smoothedRightRef.current.x;
        const finalRightY = smoothedRightRef.current.y;
        const finalRightZ = smoothedRightRef.current.z;

        // Calculate metrics
        const centerX = (finalLeftX + finalRightX) / 2;
        const centerY = (finalLeftY + finalRightY) / 2;
        const centerZ = (finalLeftZ + finalRightZ) / 2;
        const dx = finalRightX - finalLeftX;
        const dy = finalRightY - finalLeftY;
        const angle = Math.atan2(dy, dx);
        const eyeDistance = Math.sqrt(dx * dx + dy * dy);

        // Calculate head pose for 3D rotation
        const pose = calculateHeadPose(landmarks, canvas);
        
        // Smooth head pose
        smoothedPoseRef.current.pitch = smoothedPoseRef.current.pitch * smoothingFactor + pose.pitch * (1 - smoothingFactor);
        smoothedPoseRef.current.yaw = smoothedPoseRef.current.yaw * smoothingFactor + pose.yaw * (1 - smoothingFactor);
        smoothedPoseRef.current.roll = smoothedPoseRef.current.roll * smoothingFactor + pose.roll * (1 - smoothingFactor);

        // Position 3D glasses with FULL 3D features
        if (glassesModelRef.current && cameraRef.current && rendererRef.current) {
          // Normalize to 3D space
          const normalizedX = (centerX / canvas.width) * 2 - 1;
          const normalizedY = -(centerY / canvas.height) * 2 + 1;
          
          glassesModelRef.current.position.x = normalizedX * 1.2;
          glassesModelRef.current.position.y = normalizedY * 1.2;
          
          // DEPTH PERCEPTION - use Z coordinate
          if (showDepth) {
            glassesModelRef.current.position.z = centerZ * 20; // Scale Z for visible effect
          } else {
            glassesModelRef.current.position.z = 0;
          }
          
          // FULL 3D HEAD ROTATION
          glassesModelRef.current.rotation.x = smoothedPoseRef.current.pitch;
          glassesModelRef.current.rotation.y = smoothedPoseRef.current.yaw;
          glassesModelRef.current.rotation.z = -angle;
          
          // Scale based on eye distance (size perception)
          const scale = (eyeDistance / canvas.width) * 2.5;
          glassesModelRef.current.scale.set(scale, scale, scale);
          
          // Shadow plane follows face
          if (shadowPlaneRef.current) {
            shadowPlaneRef.current.position.y = normalizedY * 1.2 - 0.3;
            shadowPlaneRef.current.visible = true;
          }
          
          // Render
          rendererRef.current.render(sceneRef.current!, cameraRef.current);
        }

        setDebug({ 
          faceDetected: true, 
          landmarksFound: true, 
          drawingActive: true 
        });
      } else {
        setDebug({ 
          faceDetected: false, 
          landmarksFound: false, 
          drawingActive: false 
        });
        
        if (faceMeshRef.current) faceMeshRef.current.visible = false;
        if (shadowPlaneRef.current) shadowPlaneRef.current.visible = false;
      }
    } catch (err) {
      console.error('❌ Detection error:', err);
    }

    animationFrameRef.current = requestAnimationFrame(detectFaceAndRender3D);
  };

  useEffect(() => {
    if (isStreaming && isModelLoaded && faceLandmarker) {
      isDrawingRef.current = true;
      detectFaceAndRender3D();
    }
    return () => {
      isDrawingRef.current = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isStreaming, isModelLoaded, faceLandmarker, selectedGlasses, showMesh, showDepth]);

  useEffect(() => () => stopWebcam(), []);

  const captureScreenshot = () => {
    if (canvasRef.current && threeCanvasRef.current) {
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = canvasRef.current.width;
      tempCanvas.height = canvasRef.current.height;
      const tempCtx = tempCanvas.getContext('2d')!;
      
      tempCtx.drawImage(canvasRef.current, 0, 0);
      tempCtx.drawImage(threeCanvasRef.current, 0, 0);
      
      const link = document.createElement('a');
      link.download = `fitlens-3d-ultimate-${Date.now()}.png`;
      link.href = tempCanvas.toDataURL('image/png');
      link.click();
    }
  };

  const StatusDot = ({ ok, label }: { ok: boolean; label: string }) => (
    <div className="flex items-center gap-2 text-xs">
      {ok ? (
        <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
      ) : (
        <AlertCircle className="h-3.5 w-3.5 text-muted-foreground" />
      )}
      <span className={ok ? 'text-foreground' : 'text-muted-foreground'}>{label}</span>
    </div>
  );

  return (
    <div className="min-h-screen pt-24 pb-16 bg-background">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="text-center mb-10">
          <h1 className="font-display text-4xl sm:text-5xl font-bold text-foreground mb-3">
            <span className="gradient-text">FitLens</span> Ultimate 3D AR
          </h1>
          <p className="text-muted-foreground">Advanced 3D face tracking with head pose estimation</p>
        </div>

        {error && (
          <Card className="p-4 mb-6 border-destructive/30 bg-destructive/5">
            <p className="text-destructive text-center text-sm">{error}</p>
          </Card>
        )}

        <Card className="p-4 mb-6 glass-card">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <StatusDot ok={isModelLoaded} label="MediaPipe: Loaded" />
            <StatusDot ok={debug.faceDetected} label="Face: Detected" />
            <StatusDot ok={debug.drawingActive} label="3D: Active" />
          </div>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card className="p-6 glass-card">
              <div className="relative aspect-video bg-secondary rounded-xl overflow-hidden">
                <video
                  ref={videoRef}
                  className="absolute inset-0 w-full h-full object-cover"
                  style={{ display: 'none' }}
                  playsInline
                  muted
                />
                <canvas
                  ref={canvasRef}
                  className="absolute inset-0 w-full h-full object-cover"
                  style={{ display: isStreaming ? 'block' : 'none' }}
                />
                <canvas
                  ref={threeCanvasRef}
                  className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                  style={{ display: isStreaming ? 'block' : 'none' }}
                />

                {!isStreaming && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <Camera className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground mb-4">Camera not active</p>
                      <Button onClick={startWebcam} disabled={!isModelLoaded}>
                        {!isModelLoaded ? (
                          <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading...</>
                        ) : (
                          <><Camera className="mr-2 h-4 w-4" /> Start Camera</>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-3 mt-4">
                <Button
                  onClick={isStreaming ? stopWebcam : startWebcam}
                  disabled={!isModelLoaded}
                  variant={isStreaming ? 'destructive' : 'default'}
                  className="flex-1 min-w-[140px]"
                >
                  {isStreaming ? 'Stop Camera' : 'Start Camera'}
                </Button>
                <Button onClick={captureScreenshot} disabled={!isStreaming} variant="outline" className="flex-1 min-w-[140px]">
                  <Upload className="mr-2 h-4 w-4" /> Capture
                </Button>
                <Button 
                  onClick={() => setShowMesh(!showMesh)} 
                  disabled={!isStreaming}
                  variant="outline"
                  size="icon"
                  className={showMesh ? 'bg-primary/10' : ''}
                >
                  <Grid3x3 className="h-4 w-4" />
                </Button>
                <Button 
                  onClick={() => setShowDepth(!showDepth)} 
                  disabled={!isStreaming}
                  variant="outline"
                  size="icon"
                  className={showDepth ? 'bg-primary/10' : ''}
                >
                  <Eye className="h-4 w-4" />
                </Button>
                <Button onClick={() => window.location.reload()} variant="outline" size="icon">
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          </div>

          <div className="lg:col-span-1">
            <Card className="p-6 glass-card">
              <h2 className="font-display text-xl font-semibold mb-4 text-foreground">Select Glasses</h2>
              <div className="grid grid-cols-2 gap-3 max-h-[400px] overflow-y-auto">
                {glassesOptions.map((glasses) => (
                  <button
                    key={glasses.id}
                    onClick={() => setSelectedGlasses(glasses)}
                    className={`p-3 border-2 rounded-xl transition-all hover:scale-[1.02] ${
                      selectedGlasses.id === glasses.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/40'
                    }`}
                  >
                    <div className="aspect-video bg-secondary/50 rounded mb-2 flex items-center justify-center overflow-hidden">
                      <img
                        src={glasses.preview}
                        alt={glasses.name}
                        className="max-w-full max-h-full object-contain"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    </div>
                    <p className="text-xs font-medium text-center text-foreground">{glasses.name}</p>
                  </button>
                ))}
              </div>

              <div className="mt-6 p-4 bg-primary/5 border border-primary/15 rounded-xl">
                <h3 className="font-display font-semibold text-sm mb-2 text-foreground">🚀 Ultimate Features</h3>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>✨ 7 realistic 3D models</li>
                  <li>🔄 Full head pose tracking</li>
                  <li>📏 Depth perception (Z-axis)</li>
                  <li>🌐 468-point face mesh</li>
                  <li>💡 Realistic shadows</li>
                  <li>🎯 Pitch/Yaw/Roll rotation</li>
                  <li>📸 HD screenshots</li>
                </ul>
                <div className="mt-3 pt-3 border-t border-border/50">
                  <p className="text-xs text-muted-foreground flex items-center gap-2">
                    <Grid3x3 className="h-3 w-3" /> Face mesh overlay
                  </p>
                  <p className="text-xs text-muted-foreground flex items-center gap-2 mt-1">
                    <Eye className="h-3 w-3" /> Depth tracking
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
