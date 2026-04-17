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
  preview: string;
  /** Multiplier on inter-eye pixel distance to set width */
  scaleFactor: number;
  /** Vertical pixel offset (positive = lower on face) */
  yOffset: number;
  /** Extra Y rotation (radians) needed to face the camera */
  rotY: number;
}

const glassesOptions: GlassesModel[] = [
  { id: 'glasses-01', name: 'Sport Orange',  modelPath: '/models-3d-all/glasses-01/scene.gltf', preview: '/models-3d-all/glasses-01/glasses_01.png', scaleFactor: 0.012, yOffset: 8,   rotY: Math.PI / 2 },
  { id: 'glasses-02', name: 'Classic Black', modelPath: '/models-3d-all/glasses-02/scene.gltf', preview: '/models-3d-all/glasses-02/glasses_02.png', scaleFactor: 0.45,  yOffset: 0,   rotY: Math.PI },
  { id: 'glasses-03', name: 'Modern Blue',   modelPath: '/models-3d-all/glasses-03/scene.gltf', preview: '/models-3d-all/glasses-03/glasses_03.png', scaleFactor: 0.45,  yOffset: -10, rotY: Math.PI },
  { id: 'glasses-04', name: 'Red Frame',     modelPath: '/models-3d-all/glasses-04/scene.gltf', preview: '/models-3d-all/glasses-04/glasses_04.png', scaleFactor: 0.13,  yOffset: -5,  rotY: Math.PI },
  { id: 'glasses-05', name: 'Gold Aviator',  modelPath: '/models-3d-all/glasses-05/scene.gltf', preview: '/models-3d-all/glasses-05/glasses_05.png', scaleFactor: 0.13,  yOffset: 0,   rotY: Math.PI },
  { id: 'glasses-06', name: 'Purple Style',  modelPath: '/models-3d-all/glasses-06/scene.gltf', preview: '/models-3d-all/glasses-06/glasses_06.png', scaleFactor: 0.45,  yOffset: 0,   rotY: Math.PI },
  { id: 'glasses-07', name: 'Round Wire',    modelPath: '/models-3d-all/glasses-07/scene.gltf', preview: '/models-3d-all/glasses-07/glasses_07.png', scaleFactor: 0.45,  yOffset: -5,  rotY: Math.PI },
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
  const smoothedLeftRef = useRef({ x: 0, y: 0, z: 0 });
  const smoothedRightRef = useRef({ x: 0, y: 0, z: 0 });
  const smoothingFactor = 0.7;
  
  // Three.js references
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.OrthographicCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const glassesModelRef = useRef<THREE.Group | null>(null);
  const loaderRef = useRef<GLTFLoader>(new GLTFLoader());
  const selectedRef = useRef<GlassesModel>(selectedGlasses);

  useEffect(() => { selectedRef.current = selectedGlasses; }, [selectedGlasses]);

  // Load MediaPipe
  useEffect(() => {
    const loadModel = async () => {
      try {
        console.log('🔄 Loading MediaPipe...');
        
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
        console.error('❌ Error:', err);
      }
    };
    loadModel();
  }, []);

  // Initialize Three.js with an OrthographicCamera in pixel space.
  // x grows right, y grows DOWN (matches canvas pixel coords) so we can
  // pass MediaPipe landmarks straight in.
  useEffect(() => {
    if (!threeCanvasRef.current) return;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const w = threeCanvasRef.current.width || 1280;
    const h = threeCanvasRef.current.height || 720;
    // left, right, top, bottom — top<bottom flips Y so y-down matches pixels
    const camera = new THREE.OrthographicCamera(0, w, 0, h, -1000, 1000);
    camera.position.z = 500;
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      canvas: threeCanvasRef.current,
      alpha: true,
      antialias: true,
    });
    renderer.setSize(w, h, false);
    renderer.setClearColor(0x000000, 0);
    rendererRef.current = renderer;

    scene.add(new THREE.AmbientLight(0xffffff, 1.0));
    const d1 = new THREE.DirectionalLight(0xffffff, 0.8);
    d1.position.set(1, -1, 1);
    scene.add(d1);
    const d2 = new THREE.DirectionalLight(0xffffff, 0.4);
    d2.position.set(-1, 0, 1);
    scene.add(d2);

    return () => {
      renderer.dispose();
    };
  }, []);

  // Load selected 3D model — auto-center geometry so the model's pivot is
  // at the bridge of the glasses, then normalize size to width=1 unit.
  useEffect(() => {
    if (!sceneRef.current) return;

    if (glassesModelRef.current) {
      sceneRef.current.remove(glassesModelRef.current);
      glassesModelRef.current = null;
    }

    loaderRef.current.load(
      selectedGlasses.modelPath,
      (gltf) => {
        const raw = gltf.scene;

        // Compute bounding box and recenter geometry into a wrapper group
        const box = new THREE.Box3().setFromObject(raw);
        const center = new THREE.Vector3();
        box.getCenter(center);
        const size = new THREE.Vector3();
        box.getSize(size);

        // Shift so origin = geometric center
        raw.position.sub(center);
        // Normalize so the widest axis = 1 unit; per-frame we multiply by
        // eye distance so it always matches face width.
        const maxDim = Math.max(size.x, size.y, size.z) || 1;
        const wrapper = new THREE.Group();
        const inner = new THREE.Group();
        inner.scale.setScalar(1 / maxDim);
        inner.add(raw);
        wrapper.add(inner);

        glassesModelRef.current = wrapper;
        sceneRef.current?.add(wrapper);
      },
      undefined,
      (err) => console.error('GLTF load error:', err)
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
    setDebug({ faceDetected: false, landmarksFound: false, drawingActive: false });
  };

  // Main detection and rendering
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
        rendererRef.current.setSize(canvas.width, canvas.height, false);
        const cam = cameraRef.current;
        cam.left = 0;
        cam.right = canvas.width;
        cam.top = 0;
        cam.bottom = canvas.height;
        cam.updateProjectionMatrix();
      }
    }

    // Draw video
    ctx.save();
    ctx.scale(-1, 1);
    ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
    ctx.restore();

    // Detect face - use performance.now() to fix timestamp error
    try {
      const results = faceLandmarker.detectForVideo(video, performance.now());

      if (results && results.faceLandmarks && results.faceLandmarks.length > 0) {
        const landmarks = results.faceLandmarks[0];
        
        // Eye landmarks
        const leftEyeIndices = [33, 133, 160, 159, 158, 157, 173, 246];
        const rightEyeIndices = [362, 263, 387, 386, 385, 384, 398, 466];
        
        // Calculate eye centers
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
        const finalRightX = smoothedRightRef.current.x;
        const finalRightY = smoothedRightRef.current.y;

        // Calculate center and metrics
        const centerX = (finalLeftX + finalRightX) / 2;
        const centerY = (finalLeftY + finalRightY) / 2;
        const dx = finalRightX - finalLeftX;
        const dy = finalRightY - finalLeftY;
        const angle = Math.atan2(dy, dx);
        const eyeDistance = Math.sqrt(dx * dx + dy * dy);

        // Position 3D glasses (pixel-space ortho camera → use raw px coords)
        if (glassesModelRef.current && cameraRef.current && rendererRef.current) {
          const cfg = selectedRef.current;
          const g = glassesModelRef.current;

          g.position.x = centerX;
          g.position.y = centerY + cfg.yOffset;
          g.position.z = 0;

          // Face camera + tilt with head
          g.rotation.x = 0;
          g.rotation.y = cfg.rotY;
          g.rotation.z = -angle;

          // Scale: model is normalized to 1 unit wide → multiply by eye-dist px
          const s = eyeDistance * cfg.scaleFactor * 8; // 8 ≈ face-width / eye-dist
          g.scale.set(s, s, s);

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
  }, [isStreaming, isModelLoaded, faceLandmarker, selectedGlasses]);

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
      link.download = `fitlens-3d-${Date.now()}.png`;
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
              <div className="grid grid-cols-2 gap-3 max-h-[500px] overflow-y-auto">
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
                <h3 className="font-display font-semibold text-sm mb-2 text-foreground">3D Features</h3>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>✨ 7 realistic 3D models</li>
                  <li>🔄 Rotates with face</li>
                  <li>📏 Auto-scaling</li>
                  <li>💡 Real lighting</li>
                  <li>📸 Capture photos</li>
                </ul>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
