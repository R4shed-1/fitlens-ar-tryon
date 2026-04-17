import { useEffect, useRef, useState } from 'react';
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Camera, Upload, Loader2, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';

interface GlassesOverlay {
  id: string;
  name: string;
  image: string;
  offsetX: number;
  offsetY: number;
  scale: number;
}

const glassesOptions: GlassesOverlay[] = [
  { id: 'aviator', name: 'Aviator', image: '/glasses/aviator.png', offsetX: 0, offsetY: -15, scale: 1.9 },
  { id: 'wayfarer', name: 'Wayfarer', image: '/glasses/wayfarer.png', offsetX: 0, offsetY: -10, scale: 1.8 },
  { id: 'round', name: 'Round', image: '/glasses/round.png', offsetX: 0, offsetY: -12, scale: 1.7 },
  { id: 'cat-eye', name: 'Cat Eye', image: '/glasses/cat-eye.png', offsetX: 0, offsetY: -15, scale: 1.85 },
];

export default function ARTryOn() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [faceLandmarker, setFaceLandmarker] = useState<FaceLandmarker | null>(null);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [selectedGlasses, setSelectedGlasses] = useState<GlassesOverlay>(glassesOptions[0]);
  const [error, setError] = useState<string | null>(null);
  const [debug, setDebug] = useState({
    imageLoaded: false,
    faceDetected: false,
    landmarksFound: false,
    drawingActive: false,
  });
  const animationFrameRef = useRef<number>();
  const glassesImageRef = useRef<HTMLImageElement | null>(null);
  const isDrawingRef = useRef(false);
  const lastVideoTimeRef = useRef(-1);
  const smoothedLeftRef = useRef({ x: 0, y: 0 });
  const smoothedRightRef = useRef({ x: 0, y: 0 });
  const smoothingFactor = 0.7; // Higher = smoother but more lag, lower = more responsive but jittery

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
        console.log('✅ MediaPipe Face Landmarker loaded successfully');
      } catch (err) {
        const errorMsg = 'Failed to load MediaPipe model: ' + (err as Error).message;
        setError(errorMsg);
        console.error('❌ Model loading error:', err);
      }
    };
    loadModel();
  }, []);

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
      setError('Camera access denied. Please enable camera permissions.');
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
    setDebug({ imageLoaded: debug.imageLoaded, faceDetected: false, landmarksFound: false, drawingActive: false });
  };

  // Load glasses image
  useEffect(() => {
    setDebug((p) => ({ ...p, imageLoaded: false }));
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      glassesImageRef.current = img;
      setDebug((p) => ({ ...p, imageLoaded: true }));
    };
    img.onerror = () => {
      glassesImageRef.current = null;
      setDebug((p) => ({ ...p, imageLoaded: false }));
      console.error('Failed to load glasses image:', selectedGlasses.image);
    };
    img.src = selectedGlasses.image;
    return () => {
      glassesImageRef.current = null;
    };
  }, [selectedGlasses]);

  // Main detection and overlay loop
  const detectFaceAndOverlay = () => {
    if (!isDrawingRef.current) return;
    if (!videoRef.current || !canvasRef.current || !faceLandmarker) {
      animationFrameRef.current = requestAnimationFrame(detectFaceAndOverlay);
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx || video.readyState !== video.HAVE_ENOUGH_DATA) {
      animationFrameRef.current = requestAnimationFrame(detectFaceAndOverlay);
      return;
    }

    // Set canvas size to match video
    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }

    // Draw mirrored video
    ctx.save();
    ctx.scale(-1, 1);
    ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
    ctx.restore();

    // Only run detection if video time has changed (new frame)
    const videoTime = video.currentTime;
    if (videoTime !== lastVideoTimeRef.current) {
      lastVideoTimeRef.current = videoTime;

      try {
        // Detect face landmarks
        const results = faceLandmarker.detectForVideo(video, videoTime * 1000);

        if (results && results.faceLandmarks && results.faceLandmarks.length > 0) {
          const landmarks = results.faceLandmarks[0];
          
          // MediaPipe face mesh indices for eyes:
          // Left eye: indices 33, 133, 160, 159, 158, 157, 173, 246
          // Right eye: indices 362, 263, 387, 386, 385, 384, 398, 466
          
          // Left eye center (average of key points)
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

          // Mirror the X coordinates (video is mirrored)
          const mirroredLeftX = canvas.width - leftEyeX;
          const mirroredRightX = canvas.width - rightEyeX;

          // Calculate center point
          const centerX = (mirroredLeftX + mirroredRightX) / 2;
          const centerY = (leftEyeY + rightEyeY) / 2;

          // Calculate angle and distance
          const dx = mirroredRightX - mirroredLeftX;
          const dy = rightEyeY - leftEyeY;
          const angle = Math.atan2(dy, dx);
          const eyeDistance = Math.sqrt(dx * dx + dy * dy);

          // Calculate glasses dimensions
          const glassesWidth = eyeDistance * selectedGlasses.scale;
          const glassesHeight = glassesWidth * 0.35;

          // Draw debug markers
          // Left eye - RED
          ctx.fillStyle = 'red';
          ctx.beginPath();
          ctx.arc(mirroredLeftX, leftEyeY, 8, 0, Math.PI * 2);
          ctx.fill();

          // Right eye - RED
          ctx.fillStyle = 'red';
          ctx.beginPath();
          ctx.arc(mirroredRightX, rightEyeY, 8, 0, Math.PI * 2);
          ctx.fill();

          // Center point - GREEN
          ctx.fillStyle = 'lime';
          ctx.beginPath();
          ctx.arc(centerX, centerY, 10, 0, Math.PI * 2);
          ctx.fill();

          // Yellow glasses box outline
          ctx.save();
          ctx.translate(centerX, centerY + selectedGlasses.offsetY);
          ctx.rotate(angle);
          
          // Debug box
          ctx.strokeStyle = 'yellow';
          ctx.lineWidth = 2;
          ctx.strokeRect(
            -glassesWidth / 2 + selectedGlasses.offsetX,
            -glassesHeight / 2,
            glassesWidth,
            glassesHeight
          );

          // Draw actual glasses if loaded
          if (glassesImageRef.current && glassesImageRef.current.complete) {
            ctx.globalAlpha = 0.95;
            ctx.drawImage(
              glassesImageRef.current,
              -glassesWidth / 2 + selectedGlasses.offsetX,
              -glassesHeight / 2,
              glassesWidth,
              glassesHeight
            );
          }

          ctx.restore();

          setDebug((p) => ({ 
            ...p, 
            faceDetected: true, 
            landmarksFound: true, 
            drawingActive: true 
          }));
        } else {
          setDebug((p) => ({ 
            ...p, 
            faceDetected: false, 
            landmarksFound: false, 
            drawingActive: false 
          }));
        }
      } catch (err) {
        console.error('❌ Detection error:', err);
      }
    }

    animationFrameRef.current = requestAnimationFrame(detectFaceAndOverlay);
  };

  // Start detection loop when streaming
  useEffect(() => {
    if (isStreaming && isModelLoaded && faceLandmarker) {
      isDrawingRef.current = true;
      detectFaceAndOverlay();
    }
    return () => {
      isDrawingRef.current = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isStreaming, isModelLoaded, faceLandmarker, selectedGlasses]);

  // Cleanup on unmount
  useEffect(() => () => stopWebcam(), []);

  // Capture screenshot
  const captureScreenshot = () => {
    if (canvasRef.current) {
      const link = document.createElement('a');
      link.download = `fitlens-tryon-${Date.now()}.png`;
      link.href = canvasRef.current.toDataURL('image/png');
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
            <span className="gradient-text">FitLens</span> AR Try-On
          </h1>
          <p className="text-muted-foreground">Try on glasses virtually using your camera</p>
        </div>

        {error && (
          <Card className="p-4 mb-6 border-destructive/30 bg-destructive/5">
            <p className="text-destructive text-center text-sm">{error}</p>
          </Card>
        )}

        <Card className="p-4 mb-6 glass-card">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatusDot ok={isModelLoaded} label={`Models: ${isModelLoaded ? 'Loaded' : 'Loading...'}`} />
            <StatusDot ok={debug.imageLoaded} label={`Glasses PNG: ${debug.imageLoaded ? 'Loaded' : 'Loading...'}`} />
            <StatusDot ok={debug.faceDetected} label={`Face: ${debug.faceDetected ? 'Detected' : 'Searching...'}`} />
            <StatusDot ok={debug.drawingActive} label={`Drawing: ${debug.drawingActive ? 'Active' : 'Waiting...'}`} />
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

                {!isStreaming && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <Camera className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground mb-4">Camera not active</p>
                      <Button onClick={startWebcam} disabled={!isModelLoaded}>
                        {!isModelLoaded ? (
                          <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading Models...</>
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
              <h2 className="font-display text-xl font-semibold mb-4 text-foreground">Select Glasses</h2>
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
                      <img
                        src={glasses.image}
                        alt={glasses.name}
                        loading="lazy"
                        className="max-w-full max-h-full object-contain p-1"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    </div>
                    <p className="text-sm font-medium text-center text-foreground">{glasses.name}</p>
                  </button>
                ))}
              </div>

              <div className="mt-6 p-4 bg-primary/5 border border-primary/15 rounded-xl">
                <h3 className="font-display font-semibold text-sm mb-2 text-foreground">How to use</h3>
                <ol className="text-xs text-muted-foreground space-y-1">
                  <li>1. Click "Start Camera" to begin</li>
                  <li>2. Position your face in the frame</li>
                  <li>3. Watch the status indicators turn on</li>
                  <li>4. Select different glasses to try on</li>
                  <li>5. Capture photos you like!</li>
                </ol>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
