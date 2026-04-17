import { useEffect, useRef, useState } from 'react';
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Camera, Upload, Loader2, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';

interface GlassesModel {
  id: string;
  name: string;
  modelPath: string;
}

const glassesOptions: GlassesModel[] = [
  { id: 'aviator', name: 'Aviator', modelPath: '/models-3d/aviator/scene.gltf' },
  { id: 'wayfarer', name: 'Wayfarer', modelPath: '/models-3d/wayfarer/scene.gltf' },
  { id: 'round', name: 'Round', modelPath: '/models-3d/round/scene.gltf' },
  { id: 'cat-eye', name: 'Cat Eye', modelPath: '/models-3d/cat-eye/scene.gltf' },
];

export default function ARTryOn3D() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const threeCanvasRef = useRef<HTMLCanvasElement>(null);
  
  const [faceLandmarker, setFaceLandmarker] = useState<FaceLandmarker | null>(null);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [selectedGlasses, setSelectedGlasses] = useState<GlassesModel>(glassesOptions[0]);
  const [error, setError] = useState<string | null>(null);
  const [debug, setDebug] = useState({
    faceDetected: false,
    landmarksFound: false,
    drawingActive: false,
  });
  
  const animationFrameRef = useRef<number>();
  const isDrawingRef = useRef(false);
  const lastVideoTimeRef = useRef(-1);
  const smoothedLeftRef = useRef({ x: 0, y: 0 });
  const smoothedRightRef = useRef({ x: 0, y: 0 });
  const smoothingFactor = 0.7;
  
  // Three.js references
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const glassesModelRef = useRef<THREE.Group | null>(null);
  const loaderRef = useRef<GLTFLoader>(new GLTFLoader());

  // Load MediaPipe Face Landmarker
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
          outputFaceBlendshapes: false,
          outputFacialTransformationMatrixes: false
        });

        setFaceLandmarker(landmarker);
        setIsModelLoaded(true);
        console.log('✅ MediaPipe loaded');
      } catch (err) {
        setError('Failed to load MediaPipe: ' + (err as Error).message);
        console.error('❌ Model error:', err);
      }
    };
    loadModel();
  }, []);

  // Initialize Three.js scene
  useEffect(() => {
    if (!threeCanvasRef.current) return;

    // Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Camera (field of view matches typical webcam)
    const camera = new THREE.PerspectiveCamera(
      45,
      threeCanvasRef.current.width / threeCanvasRef.current.height,
      0.1,
      1000
    );
    camera.position.z = 5;
    cameraRef.current = camera;

    // Renderer with transparency
    const renderer = new THREE.WebGLRenderer({
      canvas: threeCanvasRef.current,
      alpha: true,
      antialias: true,
    });
    renderer.setSize(threeCanvasRef.current.width, threeCanvasRef.current.height);
    renderer.setClearColor(0x000000, 0); // Transparent background
    rendererRef.current = renderer;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(0, 1, 1);
    scene.add(directionalLight);

    console.log('✅ Three.js initialized');

    return () => {
      renderer.dispose();
    };
  }, []);

  // Load 3D glasses model when selection changes
  useEffect(() => {
    if (!sceneRef.current) return;

    // Remove old model
    if (glassesModelRef.current) {
      sceneRef.current.remove(glassesModelRef.current);
      glassesModelRef.current = null;
    }

    // Load new model
    console.log('🔄 Loading 3D model:', selectedGlasses.modelPath);
    
    loaderRef.current.load(
      selectedGlasses.modelPath,
      (gltf) => {
        const model = gltf.scene;
        
        // Scale model appropriately
        model.scale.set(0.05, 0.05, 0.05);
        model.position.set(0, 0, 0);
        
        glassesModelRef.current = model;
        sceneRef.current?.add(model);
        
        console.log('✅ 3D model loaded');
      },
      undefined,
      (err) => {
        console.error('❌ Error loading 3D model:', err);
      }
    );
  }, [selectedGlasses]);

  // Start webcam
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

  // Stop webcam
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
    setDebug({ faceDetected: false, landmarksFound: false, drawingActive: false });
  };

  // Main detection and 3D rendering loop
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

    // Match canvas to video size
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

    // Draw mirrored video
    ctx.save();
    ctx.scale(-1, 1);
    ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
    ctx.restore();

    // Run face detection
    const videoTime = video.currentTime;
    if (videoTime !== lastVideoTimeRef.current) {
      lastVideoTimeRef.current = videoTime;

      try {
        const results = faceLandmarker.detectForVideo(video, performance.now());

        if (results && results.faceLandmarks && results.faceLandmarks.length > 0) {
          const landmarks = results.faceLandmarks[0];
          
          // Calculate eye centers
          const leftEyeIndices = [33, 133, 160, 159, 158, 157, 173, 246];
          const rightEyeIndices = [362, 263, 387, 386, 385, 384, 398, 466];
          
          let leftEyeX = 0, leftEyeY = 0;
          leftEyeIndices.forEach(idx => {
            leftEyeX += landmarks[idx].x;
            leftEyeY += landmarks[idx].y;
          });
          leftEyeX = (leftEyeX / leftEyeIndices.length) * canvas.width;
          leftEyeY = (leftEyeY / leftEyeIndices.length) * canvas.height;

          let rightEyeX = 0, rightEyeY = 0;
          rightEyeIndices.forEach(idx => {
            rightEyeX += landmarks[idx].x;
            rightEyeY += landmarks[idx].y;
          });
          rightEyeX = (rightEyeX / rightEyeIndices.length) * canvas.width;
          rightEyeY = (rightEyeY / rightEyeIndices.length) * canvas.height;

          // Mirror X coordinates
          const mirroredLeftX = canvas.width - leftEyeX;
          const mirroredRightX = canvas.width - rightEyeX;

          // Apply smoothing
          smoothedLeftRef.current.x = smoothedLeftRef.current.x * smoothingFactor + mirroredLeftX * (1 - smoothingFactor);
          smoothedLeftRef.current.y = smoothedLeftRef.current.y * smoothingFactor + leftEyeY * (1 - smoothingFactor);
          smoothedRightRef.current.x = smoothedRightRef.current.x * smoothingFactor + mirroredRightX * (1 - smoothingFactor);
          smoothedRightRef.current.y = smoothedRightRef.current.y * smoothingFactor + rightEyeY * (1 - smoothingFactor);

          const finalLeftX = smoothedLeftRef.current.x;
          const finalLeftY = smoothedLeftRef.current.y;
          const finalRightX = smoothedRightRef.current.x;
          const finalRightY = smoothedRightRef.current.y;

          // Calculate center and angle
          const centerX = (finalLeftX + finalRightX) / 2;
          const centerY = (finalLeftY + finalRightY) / 2;
          const dx = finalRightX - finalLeftX;
          const dy = finalRightY - finalLeftY;
          const angle = Math.atan2(dy, dx);
          const eyeDistance = Math.sqrt(dx * dx + dy * dy);

          // Position 3D glasses model
          if (glassesModelRef.current && cameraRef.current && rendererRef.current) {
            // Convert 2D screen position to 3D world position
            const normalizedX = (centerX / canvas.width) * 2 - 1;
            const normalizedY = -(centerY / canvas.height) * 2 + 1;
            
            glassesModelRef.current.position.x = normalizedX * 2;
            glassesModelRef.current.position.y = normalizedY * 2 + 0.3;
            glassesModelRef.current.position.z = 0;
            
            // Rotate glasses to match face angle
            glassesModelRef.current.rotation.z = -angle;
            glassesModelRef.current.rotation.y = Math.PI / 2;
            
            // Scale based on eye distance - MUCH SMALLER
            const scale = (eyeDistance / canvas.width) * 0.3;
            glassesModelRef.current.scale.set(scale, scale, scale);
            
            // Render 3D scene
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
        }
      } catch (err) {
        console.error('❌ Detection error:', err);
      }
    }

    animationFrameRef.current = requestAnimationFrame(detectFaceAndRender3D);
  };

  // Start loop when ready
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
  }, [isStreaming, isModelLoaded, faceLandmarker, selectedGlasses]);

  useEffect(() => () => stopWebcam(), []);

  // Capture screenshot
  const captureScreenshot = () => {
    if (canvasRef.current && threeCanvasRef.current) {
      // Combine video canvas and 3D canvas
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = canvasRef.current.width;
      tempCanvas.height = canvasRef.current.height;
      const tempCtx = tempCanvas.getContext('2d')!;
      
      tempCtx.drawImage(canvasRef.current, 0, 0);
      tempCtx.drawImage(threeCanvasRef.current, 0, 0);
      
      const link = document.createElement('a');
      link.download = `fitlens-3d-tryon-${Date.now()}.png`;
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
            <span className="gradient-text">FitLens</span> 3D AR Try-On
          </h1>
          <p className="text-muted-foreground">Try on 3D glasses models using your camera</p>
        </div>

        {error && (
          <Card className="p-4 mb-6 border-destructive/30 bg-destructive/5">
            <p className="text-destructive text-center text-sm">{error}</p>
          </Card>
        )}

        <Card className="p-4 mb-6 glass-card">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <StatusDot ok={isModelLoaded} label={`MediaPipe: ${isModelLoaded ? 'Loaded' : 'Loading...'}`} />
            <StatusDot ok={debug.faceDetected} label={`Face: ${debug.faceDetected ? 'Detected' : 'Searching...'}`} />
            <StatusDot ok={debug.drawingActive} label={`3D: ${debug.drawingActive ? 'Active' : 'Waiting...'}`} />
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
                  style={{
                    display: isStreaming ? 'block' : 'none',
                  }}
                />
                <canvas
                  ref={threeCanvasRef}
                  className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                  style={{
                    display: isStreaming ? 'block' : 'none',
                  }}
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
                  <Upload className="mr-2 h-4 w-4" /> Capture Photo
                </Button>
                <Button onClick={() => window.location.reload()} variant="outline" size="icon">
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          </div>

          <div className="lg:col-span-1">
            <Card className="p-6 glass-card">
              <h2 className="font-display text-xl font-semibold mb-4 text-foreground">Select 3D Glasses</h2>
              <div className="grid grid-cols-2 gap-3">
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
                    <div className="aspect-video bg-secondary/50 rounded mb-2 flex items-center justify-center">
                      <p className="text-2xl">👓</p>
                    </div>
                    <p className="text-sm font-medium text-center text-foreground">{glasses.name}</p>
                  </button>
                ))}
              </div>

              <div className="mt-6 p-4 bg-primary/5 border border-primary/15 rounded-xl">
                <h3 className="font-display font-semibold text-sm mb-2 text-foreground">3D AR Features</h3>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>✨ Realistic 3D glasses models</li>
                  <li>🔄 Rotates with your face</li>
                  <li>📏 Scales naturally</li>
                  <li>💡 Real-time lighting</li>
                  <li>📸 Capture photos!</li>
                </ul>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
