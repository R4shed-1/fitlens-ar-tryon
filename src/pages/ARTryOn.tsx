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
  { id: 'glasses-01', name: 'Solene Sport',     modelPath: '/models-3d-all/glasses-01/scene.gltf', preview: '/models-3d-all/glasses-01/glasses_01.png', scaleFactor: 2.6, yOffset: -10, rotY: 0 },
  { id: 'glasses-02', name: 'Onyx Noir',        modelPath: '/models-3d-all/glasses-02/scene.gltf', preview: '/models-3d-all/glasses-02/glasses_02.png', scaleFactor: 2.6, yOffset: -20, rotY: Math.PI },
  { id: 'glasses-03', name: 'Azure Riviera',    modelPath: '/models-3d-all/glasses-03/scene.gltf', preview: '/models-3d-all/glasses-03/glasses_03.png', scaleFactor: 2.6, yOffset: -18, rotY: Math.PI },
  { id: 'glasses-04', name: 'Crimson Soirée',   modelPath: '/models-3d-all/glasses-04/scene.gltf', preview: '/models-3d-all/glasses-04/glasses_04.png', scaleFactor: 2.6, yOffset: -15, rotY: Math.PI },
  { id: 'glasses-05', name: 'Maison Gold',      modelPath: '/models-3d-all/glasses-05/scene.gltf', preview: '/models-3d-all/glasses-05/glasses_05.png', scaleFactor: 2.6, yOffset: -10, rotY: Math.PI },
  { id: 'glasses-06', name: 'Amethyst Nuit',    modelPath: '/models-3d-all/glasses-06/scene.gltf', preview: '/models-3d-all/glasses-06/glasses_06.png', scaleFactor: 2.4, yOffset: -15, rotY: Math.PI },
  { id: 'glasses-07', name: 'Wirecraft Round',  modelPath: '/models-3d-all/glasses-07/scene.gltf', preview: '/models-3d-all/glasses-07/glasses_07.png', scaleFactor: 2.7, yOffset: -25, rotY: Math.PI },
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

    scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    // Key light (warm, top-front)
    const key = new THREE.DirectionalLight(0xfff2dc, 1.4);
    key.position.set(0.5, -1, 1);
    scene.add(key);
    // Rim light (cool, behind/above) — adds the metallic highlight
    const rim = new THREE.DirectionalLight(0xbcd4ff, 1.0);
    rim.position.set(-1, -0.5, -0.8);
    scene.add(rim);
    // Fill (soft, opposite key)
    const fill = new THREE.DirectionalLight(0xffffff, 0.4);
    fill.position.set(-1, 0.5, 1);
    scene.add(fill);

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

          // Scale: model is normalized to width=1 → glasses width = eyeDist × factor
          const s = eyeDistance * cfg.scaleFactor;
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
    <div className="min-h-screen pt-20 pb-20 relative overflow-hidden">
      {/* Layered ambient background */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-background via-secondary/30 to-background" />
      <div className="absolute -z-10 top-32 -left-24 w-[28rem] h-[28rem] rounded-full bg-primary/8 blur-[140px]" />
      <div className="absolute -z-10 top-1/2 -right-24 w-[24rem] h-[24rem] rounded-full bg-accent/10 blur-[140px]" />

      <div className="container mx-auto px-4 max-w-7xl">
        {/* Editorial header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-3 mb-5">
            <span className="h-px w-12 bg-primary/40" />
            <span className="text-[11px] tracking-[0.4em] uppercase text-primary font-semibold">Virtual Atelier</span>
            <span className="h-px w-12 bg-primary/40" />
          </div>
          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground mb-4 leading-[1.1]">
            Step Into the <span className="gradient-text italic">Fitting Room</span>
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Choose a frame, allow your camera, and see luxury eyewear come to life on your face — rendered in real-time 3D.
          </p>
        </div>

        {error && (
          <Card className="p-4 mb-6 border-destructive/30 bg-destructive/5 rounded-2xl max-w-2xl mx-auto">
            <p className="text-destructive text-center text-sm">{error}</p>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
          {/* ─── Camera stage ─── */}
          <div className="lg:col-span-8 space-y-5">
            <Card className="overflow-hidden glass-card rounded-3xl border border-warm-border/60">
              {/* Stage header bar */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-warm-border/60 bg-gradient-to-r from-card to-secondary/40">
                <div className="flex items-center gap-3">
                  <span className="h-2.5 w-2.5 rounded-full bg-primary/60" />
                  <div>
                    <p className="text-[10px] tracking-[0.3em] uppercase text-primary/80">Now Fitting</p>
                    <h2 className="font-display text-base font-semibold text-foreground leading-tight">{selectedGlasses.name}</h2>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="hidden sm:flex items-center gap-3">
                    <StatusDot ok={isModelLoaded} label="Engine" />
                    <span className="h-3 w-px bg-border" />
                    <StatusDot ok={debug.faceDetected} label="Face" />
                    <span className="h-3 w-px bg-border" />
                    <StatusDot ok={debug.drawingActive} label="3D" />
                  </div>
                  {isStreaming && (
                    <span className="inline-flex items-center gap-1.5 text-[10px] tracking-wider uppercase text-accent font-semibold px-2.5 py-1 rounded-full bg-accent/10 border border-accent/30">
                      <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" /> Live
                    </span>
                  )}
                </div>
              </div>

              {/* Camera viewport */}
              <div className="relative aspect-video bg-gradient-to-br from-secondary via-muted to-secondary overflow-hidden">
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

                {/* Editorial corner brackets */}
                <div className="pointer-events-none absolute top-4 left-4 w-8 h-8 border-t border-l border-primary/60" />
                <div className="pointer-events-none absolute top-4 right-4 w-8 h-8 border-t border-r border-primary/60" />
                <div className="pointer-events-none absolute bottom-4 left-4 w-8 h-8 border-b border-l border-primary/60" />
                <div className="pointer-events-none absolute bottom-4 right-4 w-8 h-8 border-b border-r border-primary/60" />

                {/* Center crosshair when streaming */}
                {isStreaming && (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-30">
                    <div className="h-px w-16 bg-primary/50" />
                    <div className="absolute h-16 w-px bg-primary/50" />
                  </div>
                )}

                {!isStreaming && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center px-6 max-w-sm">
                      <div className="relative w-24 h-24 mx-auto mb-6">
                        <div className="absolute inset-0 rounded-full bg-primary/10 animate-ping" />
                        <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 to-accent/15 border border-primary/30 flex items-center justify-center">
                          <Camera className="w-10 h-10 text-primary" />
                        </div>
                      </div>
                      <p className="font-display text-xl text-foreground mb-2">Your fitting awaits</p>
                      <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                        Allow camera access and we'll place {selectedGlasses.name} on your face in real time.
                      </p>
                      <Button onClick={startWebcam} disabled={!isModelLoaded} size="lg" className="glow-warm rounded-xl">
                        {!isModelLoaded ? (
                          <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Preparing atelier…</>
                        ) : (
                          <><Camera className="mr-2 h-4 w-4" /> Begin Fitting</>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Action toolbar */}
              <div className="flex flex-wrap items-center gap-3 px-6 py-4 border-t border-warm-border/60 bg-gradient-to-r from-card to-secondary/30">
                <Button
                  onClick={isStreaming ? stopWebcam : startWebcam}
                  disabled={!isModelLoaded}
                  variant={isStreaming ? 'destructive' : 'default'}
                  className="rounded-xl flex-1 sm:flex-none sm:min-w-[160px]"
                >
                  {isStreaming ? 'Stop Camera' : 'Start Camera'}
                </Button>
                <Button onClick={captureScreenshot} disabled={!isStreaming} variant="outline" className="rounded-xl flex-1 sm:flex-none sm:min-w-[140px]">
                  <Upload className="mr-2 h-4 w-4" /> Capture
                </Button>
                <Button onClick={() => window.location.reload()} variant="ghost" size="icon" className="rounded-xl ml-auto">
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </Card>

            {/* Mobile status bar */}
            <Card className="sm:hidden p-4 glass-card rounded-2xl">
              <div className="grid grid-cols-3 gap-2">
                <StatusDot ok={isModelLoaded} label="Engine" />
                <StatusDot ok={debug.faceDetected} label="Face" />
                <StatusDot ok={debug.drawingActive} label="3D" />
              </div>
            </Card>
          </div>

          {/* ─── Frame selector ─── */}
          <div className="lg:col-span-4">
            <Card className="glass-card rounded-3xl border border-warm-border/60 overflow-hidden">
              <div className="px-5 py-4 border-b border-warm-border/60 bg-gradient-to-br from-primary/8 to-accent/5">
                <p className="text-[10px] tracking-[0.3em] uppercase text-primary/80 mb-1">The Atelier</p>
                <div className="flex items-end justify-between">
                  <h2 className="font-display text-xl font-semibold text-foreground">Choose Your Frame</h2>
                  <span className="text-[10px] tracking-widest uppercase text-muted-foreground">{glassesOptions.length} pieces</span>
                </div>
              </div>

              <div className="p-4 grid grid-cols-2 gap-3 max-h-[520px] overflow-y-auto">
                {glassesOptions.map((glasses) => {
                  const active = selectedGlasses.id === glasses.id;
                  return (
                    <button
                      key={glasses.id}
                      onClick={() => setSelectedGlasses(glasses)}
                      className={`group relative p-3 rounded-2xl text-left transition-all duration-300 ${
                        active
                          ? 'bg-gradient-to-br from-primary/12 to-accent/8 ring-2 ring-primary shadow-lg shadow-primary/10'
                          : 'bg-card ring-1 ring-warm-border/70 hover:ring-primary/40 hover:-translate-y-0.5 hover:shadow-md'
                      }`}
                    >
                      {active && (
                        <span className="absolute top-2 right-2 z-10 inline-flex items-center justify-center h-5 w-5 rounded-full bg-primary text-primary-foreground shadow">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        </span>
                      )}
                      <div className="aspect-square bg-gradient-to-br from-secondary via-muted/60 to-secondary rounded-xl mb-3 flex items-center justify-center overflow-hidden">
                        <img
                          src={glasses.preview}
                          alt={glasses.name}
                          className="max-w-[88%] max-h-[88%] object-contain transition-transform duration-500 group-hover:scale-110"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                      </div>
                      <p className="text-[9px] tracking-[0.25em] uppercase text-muted-foreground mb-0.5">Frame</p>
                      <p className="font-display text-sm font-semibold text-foreground leading-tight">{glasses.name}</p>
                    </button>
                  );
                })}
              </div>

              <div className="px-5 py-5 border-t border-warm-border/60 bg-gradient-to-br from-secondary/40 to-card">
                <p className="text-[10px] tracking-[0.3em] uppercase text-primary mb-3">Atelier Notes</p>
                <ul className="text-xs text-muted-foreground space-y-2 leading-relaxed">
                  <li className="flex gap-2"><span className="text-primary">—</span> Photorealistic 3D rendering</li>
                  <li className="flex gap-2"><span className="text-primary">—</span> Tracks head rotation naturally</li>
                  <li className="flex gap-2"><span className="text-primary">—</span> Auto-fits to your facial proportions</li>
                  <li className="flex gap-2"><span className="text-primary">—</span> Studio-grade lighting simulation</li>
                  <li className="flex gap-2"><span className="text-primary">—</span> Capture & save your fitting</li>
                </ul>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
