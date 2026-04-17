import { useEffect, useRef, useState } from 'react';
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Camera, Upload, Loader2, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';

/**
 * Per-model tuning derived from the reference Virtual-Glasses-Try-on project.
 * - upOffset: vertical pixel offset along the head's "up" axis (positive = lower on face)
 * - scaleFactor: multiplier applied to inter-eye pixel distance for sizing
 * - rotY: extra Y rotation needed because some GLTF models face different directions
 */
interface GlassesModel {
  id: string;
  name: string;
  modelPath: string;
  upOffset: number;
  scaleFactor: number;
  rotY: number;
}

const glassesOptions: GlassesModel[] = [
  // aviator ≈ glasses-01: scale 0.01, up 10
  { id: 'aviator', name: 'Aviator', modelPath: '/models-3d/aviator/scene.gltf', upOffset: 10, scaleFactor: 0.01, rotY: Math.PI },
  // wayfarer ≈ glasses-02: scale 0.4, up 0
  { id: 'wayfarer', name: 'Wayfarer', modelPath: '/models-3d/wayfarer/scene.gltf', upOffset: 0, scaleFactor: 0.4, rotY: Math.PI },
  // round ≈ glasses-03: scale 0.4, up -40
  { id: 'round', name: 'Round', modelPath: '/models-3d/round/scene.gltf', upOffset: -40, scaleFactor: 0.4, rotY: Math.PI },
  // cat-eye ≈ glasses-05: scale 0.11, up -80
  { id: 'cat-eye', name: 'Cat Eye', modelPath: '/models-3d/cat-eye/scene.gltf', upOffset: -80, scaleFactor: 0.11, rotY: Math.PI },
];

// MediaPipe FaceMesh landmark indices (same as the reference project)
const KP = { midEye: 168, leftEye: 143, rightEye: 372, noseBottom: 2 };

export default function ARTryOn3D() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const threeCanvasRef = useRef<HTMLCanvasElement>(null);

  const [faceLandmarker, setFaceLandmarker] = useState<FaceLandmarker | null>(null);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [selectedGlasses, setSelectedGlasses] = useState<GlassesModel>(glassesOptions[0]);
  const [error, setError] = useState<string | null>(null);
  const [debug, setDebug] = useState({ faceDetected: false, drawingActive: false });

  const animationFrameRef = useRef<number>();
  const isDrawingRef = useRef(false);
  const lastVideoTimeRef = useRef(-1);

  // Three.js refs
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const glassesModelRef = useRef<THREE.Group | null>(null);
  const loaderRef = useRef<GLTFLoader>(new GLTFLoader());
  const selectedRef = useRef<GlassesModel>(selectedGlasses);

  useEffect(() => {
    selectedRef.current = selectedGlasses;
  }, [selectedGlasses]);

  // Load MediaPipe Face Landmarker
  useEffect(() => {
    (async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
        );
        const landmarker = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numFaces: 1,
        });
        setFaceLandmarker(landmarker);
        setIsModelLoaded(true);
      } catch (err) {
        setError('Failed to load MediaPipe: ' + (err as Error).message);
      }
    })();
  }, []);

  // Initialize Three.js scene with PIXEL-SPACE camera (matches reference approach)
  const initThreeForVideo = (videoWidth: number, videoHeight: number) => {
    if (!threeCanvasRef.current) return;

    if (!sceneRef.current) {
      const scene = new THREE.Scene();
      sceneRef.current = scene;

      // Lights — front + back spots like reference
      const front = new THREE.SpotLight(0xffffff, 1.2);
      front.position.set(10, 10, 10);
      scene.add(front);
      const back = new THREE.SpotLight(0xffffff, 0.8);
      back.position.set(10, 10, -10);
      scene.add(back);
      scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    }

    // Recreate camera in pixel-space so MediaPipe pixel landmarks map directly
    const camera = new THREE.PerspectiveCamera(45, videoWidth / videoHeight, 0.1, 2000);
    camera.position.x = videoWidth / 2;
    camera.position.y = -videoHeight / 2;
    camera.position.z = -(videoHeight / 2) / Math.tan(45 / 2);
    camera.lookAt(new THREE.Vector3(videoWidth / 2, -videoHeight / 2, 0));
    cameraRef.current = camera;

    if (!rendererRef.current) {
      const renderer = new THREE.WebGLRenderer({
        canvas: threeCanvasRef.current,
        alpha: true,
        antialias: true,
      });
      renderer.setClearColor(0x000000, 0);
      rendererRef.current = renderer;
    }
    rendererRef.current.setSize(videoWidth, videoHeight, false);
    threeCanvasRef.current.width = videoWidth;
    threeCanvasRef.current.height = videoHeight;
  };

  // Load 3D glasses model when selection changes
  useEffect(() => {
    if (!sceneRef.current) return;

    if (glassesModelRef.current) {
      sceneRef.current.remove(glassesModelRef.current);
      glassesModelRef.current = null;
    }

    loaderRef.current.load(
      selectedGlasses.modelPath,
      (gltf) => {
        const model = gltf.scene;
        // Initial scale = 1; per-frame we set absolute scale using eye distance
        model.scale.set(1, 1, 1);
        glassesModelRef.current = model;
        sceneRef.current?.add(model);
      },
      undefined,
      (err) => console.error('GLTF load error:', err)
    );
  }, [selectedGlasses]);

  const startWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
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
    } catch {
      setError('Camera access denied');
    }
  };

  const stopWebcam = () => {
    isDrawingRef.current = false;
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((t) => t.stop());
      videoRef.current.srcObject = null;
      setIsStreaming(false);
    }
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    lastVideoTimeRef.current = -1;
    setDebug({ faceDetected: false, drawingActive: false });
  };

  // Main detect + render loop
  const tick = () => {
    if (!isDrawingRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const threeCanvas = threeCanvasRef.current;
    if (!video || !canvas || !threeCanvas || !faceLandmarker) {
      animationFrameRef.current = requestAnimationFrame(tick);
      return;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx || video.readyState !== video.HAVE_ENOUGH_DATA) {
      animationFrameRef.current = requestAnimationFrame(tick);
      return;
    }

    // Match canvases to video size and (re)init pixel-space three camera
    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      initThreeForVideo(video.videoWidth, video.videoHeight);
    }

    // Mirrored video draw
    ctx.save();
    ctx.scale(-1, 1);
    ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
    ctx.restore();

    const t = video.currentTime;
    if (t === lastVideoTimeRef.current) {
      animationFrameRef.current = requestAnimationFrame(tick);
      return;
    }
    lastVideoTimeRef.current = t;

    try {
      const results = faceLandmarker.detectForVideo(video, performance.now());
      const faces = results?.faceLandmarks ?? [];
      const glasses = glassesModelRef.current;
      const camera = cameraRef.current;
      const renderer = rendererRef.current;
      const scene = sceneRef.current;

      if (faces.length > 0 && glasses && camera && renderer && scene) {
        const lm = faces[0];
        const w = canvas.width;
        const h = canvas.height;

        // To pixel coords. Mirror X to match the mirrored video draw above.
        const toPx = (i: number) => ({
          x: w - lm[i].x * w,
          y: lm[i].y * h,
          z: lm[i].z * w,
        });
        const midEye = toPx(KP.midEye);
        const leftEye = toPx(KP.leftEye);
        const rightEye = toPx(KP.rightEye);
        const noseBottom = toPx(KP.noseBottom);

        const cfg = selectedRef.current;

        // Position (pixel-space camera; flip Y for three.js orientation)
        glasses.position.x = midEye.x;
        glasses.position.y = -midEye.y + cfg.upOffset;
        glasses.position.z = -camera.position.z + midEye.z;

        // Up vector from nose-bottom -> mid-eye (gives real 3D head tilt)
        const upx = midEye.x - noseBottom.x;
        const upy = -(midEye.y - noseBottom.y);
        const upz = midEye.z - noseBottom.z;
        const len = Math.sqrt(upx * upx + upy * upy + upz * upz) || 1;
        glasses.up.set(upx / len, upy / len, upz / len);

        // Scale by eye distance × per-model factor
        const dx = leftEye.x - rightEye.x;
        const dy = leftEye.y - rightEye.y;
        const dz = leftEye.z - rightEye.z;
        const eyeDist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        const s = eyeDist * cfg.scaleFactor;
        glasses.scale.set(s, s, s);

        // Rotation: face the camera + match head tilt around Z
        glasses.rotation.y = cfg.rotY;
        glasses.rotation.z = Math.PI / 2 - Math.acos(Math.max(-1, Math.min(1, glasses.up.x)));

        renderer.render(scene, camera);
        setDebug({ faceDetected: true, drawingActive: true });
      } else {
        // Clear three canvas when no face
        if (renderer && scene && camera) renderer.render(scene, camera);
        setDebug({ faceDetected: false, drawingActive: false });
      }
    } catch (err) {
      console.error('Detection error:', err);
    }

    animationFrameRef.current = requestAnimationFrame(tick);
  };

  useEffect(() => {
    if (isStreaming && isModelLoaded && faceLandmarker) {
      isDrawingRef.current = true;
      tick();
    }
    return () => {
      isDrawingRef.current = false;
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStreaming, isModelLoaded, faceLandmarker]);

  useEffect(() => () => stopWebcam(), []);

  const captureScreenshot = () => {
    if (!canvasRef.current || !threeCanvasRef.current) return;
    const tmp = document.createElement('canvas');
    tmp.width = canvasRef.current.width;
    tmp.height = canvasRef.current.height;
    const c = tmp.getContext('2d')!;
    c.drawImage(canvasRef.current, 0, 0);
    c.drawImage(threeCanvasRef.current, 0, 0);
    const link = document.createElement('a');
    link.download = `fitlens-3d-tryon-${Date.now()}.png`;
    link.href = tmp.toDataURL('image/png');
    link.click();
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
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading...
                          </>
                        ) : (
                          <>
                            <Camera className="mr-2 h-4 w-4" /> Start Camera
                          </>
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
                {glassesOptions.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => setSelectedGlasses(g)}
                    className={`p-3 border-2 rounded-xl transition-all hover:scale-[1.02] ${
                      selectedGlasses.id === g.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/40'
                    }`}
                  >
                    <div className="aspect-video bg-secondary/50 rounded mb-2 flex items-center justify-center">
                      <p className="text-2xl">👓</p>
                    </div>
                    <p className="text-sm font-medium text-center text-foreground">{g.name}</p>
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
