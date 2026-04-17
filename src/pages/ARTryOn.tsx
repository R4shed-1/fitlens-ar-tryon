import { useEffect, useRef, useState } from 'react';
import * as faceapi from 'face-api.js';
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

  useEffect(() => {
    const loadModels = async () => {
      try {
        const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model';
        await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
        await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
        setIsModelLoaded(true);
        console.log('✅ Face detection models loaded');
      } catch (err) {
        setError('Failed to load face detection models: ' + (err as Error).message);
        console.error('❌ Model loading error:', err);
      }
    };
    loadModels();
  }, []);

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
    } catch (err) {
      setError('Camera access denied. Please enable camera permissions.');
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
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    setDebug((p) => ({ ...p, faceDetected: false, landmarksFound: false, drawingActive: false }));
  };

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

  const detectFaceAndOverlay = async () => {
    if (!isDrawingRef.current) return;
    if (!videoRef.current || !canvasRef.current || !isModelLoaded) {
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

    // Use the DISPLAYED size of the video, not the raw stream resolution
    const displayWidth = video.clientWidth;
    const displayHeight = video.clientHeight;

    if (displayWidth === 0 || displayHeight === 0) {
      animationFrameRef.current = requestAnimationFrame(detectFaceAndOverlay);
      return;
    }

    if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
      canvas.width = displayWidth;
      canvas.height = displayHeight;
      faceapi.matchDimensions(canvas, { width: displayWidth, height: displayHeight });
    }

    // Clear the full canvas each frame
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // a) CANVAS OK marker
    ctx.fillStyle = 'red';
    ctx.fillRect(40, 40, 120, 60);
    ctx.fillStyle = 'white';
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('CANVAS OK', 50, 70);
    ctx.textBaseline = 'alphabetic';

    // b) Fixed cyan/pink test markers
    ctx.fillStyle = 'cyan';
    ctx.beginPath();
    ctx.arc(220, 220, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'magenta';
    ctx.fillRect(180, 260, 180, 60);

    try {
      const detection = await faceapi
        .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.3 }))
        .withFaceLandmarks();

      if (detection) {
        const resizedDetection = faceapi.resizeResults(detection, {
          width: displayWidth,
          height: displayHeight,
        });

        const landmarks = resizedDetection.landmarks;
        const leftEyePoints = landmarks.getLeftEye();
        const rightEyePoints = landmarks.getRightEye();

        if (leftEyePoints?.length && rightEyePoints?.length) {
          const leftEyeCenter = {
            x: leftEyePoints.reduce((s, p) => s + p.x, 0) / leftEyePoints.length,
            y: leftEyePoints.reduce((s, p) => s + p.y, 0) / leftEyePoints.length,
          };
          const rightEyeCenter = {
            x: rightEyePoints.reduce((s, p) => s + p.x, 0) / rightEyePoints.length,
            y: rightEyePoints.reduce((s, p) => s + p.y, 0) / rightEyePoints.length,
          };

          // Mirror X because video is CSS-mirrored via scaleX(-1)
          const leftEye = { x: displayWidth - leftEyeCenter.x, y: leftEyeCenter.y };
          const rightEye = { x: displayWidth - rightEyeCenter.x, y: rightEyeCenter.y };

          const centerPoint = {
            x: (leftEye.x + rightEye.x) / 2,
            y: (leftEye.y + rightEye.y) / 2,
          };

          const eyeDistance = Math.hypot(rightEye.x - leftEye.x, rightEye.y - leftEye.y);
          const angle = Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x);
          const glassesWidth = eyeDistance * selectedGlasses.scale;
          const glassesHeight = glassesWidth * 0.35;

          console.log('DRAW MARKERS NOW');
          console.log('leftEye', leftEye);
          console.log('rightEye', rightEye);
          console.log('centerPoint', centerPoint);
          console.log('glassesWidth', glassesWidth);
          console.log('glassesHeight', glassesHeight);

          // c) Debug text
          const lines = [
            `video.videoWidth/Height: ${video.videoWidth} / ${video.videoHeight}`,
            `video.clientWidth/Height: ${video.clientWidth} / ${video.clientHeight}`,
            `canvas.width/Height: ${canvas.width} / ${canvas.height}`,
            `leftEye: ${Math.round(leftEye.x)} / ${Math.round(leftEye.y)}`,
            `rightEye: ${Math.round(rightEye.x)} / ${Math.round(rightEye.y)}`,
            `centerPoint: ${Math.round(centerPoint.x)} / ${Math.round(centerPoint.y)}`,
          ];
          ctx.font = 'bold 12px monospace';
          ctx.textAlign = 'left';
          lines.forEach((line, i) => {
            const y = 120 + i * 16;
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 3;
            ctx.strokeText(line, 10, y);
            ctx.fillStyle = 'white';
            ctx.fillText(line, 10, y);
          });

          // d) Tracked eye dots
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';

          // Left eye — RED with "L"
          ctx.fillStyle = 'red';
          ctx.beginPath();
          ctx.arc(leftEye.x, leftEye.y, 24, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = 'white';
          ctx.font = 'bold 22px monospace';
          ctx.fillText('L', leftEye.x, leftEye.y);

          // Right eye — BLUE with "R"
          ctx.fillStyle = 'blue';
          ctx.beginPath();
          ctx.arc(rightEye.x, rightEye.y, 24, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = 'white';
          ctx.fillText('R', rightEye.x, rightEye.y);

          // e) Tracked center dot — LIME with "C"
          ctx.fillStyle = 'lime';
          ctx.beginPath();
          ctx.arc(centerPoint.x, centerPoint.y, 28, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = 'black';
          ctx.font = 'bold 24px monospace';
          ctx.fillText('C', centerPoint.x, centerPoint.y);

          // f) Tracked glasses box — filled yellow 55%, magenta border + cross + label
          ctx.save();
          ctx.translate(centerPoint.x, centerPoint.y);
          ctx.rotate(angle);

          ctx.fillStyle = 'rgba(255, 255, 0, 0.55)';
          ctx.fillRect(-glassesWidth / 2, -glassesHeight / 2, glassesWidth, glassesHeight);

          ctx.strokeStyle = 'magenta';
          ctx.lineWidth = 6;
          ctx.strokeRect(-glassesWidth / 2, -glassesHeight / 2, glassesWidth, glassesHeight);

          // Diagonal magenta cross
          ctx.beginPath();
          ctx.moveTo(-glassesWidth / 2, -glassesHeight / 2);
          ctx.lineTo(glassesWidth / 2, glassesHeight / 2);
          ctx.moveTo(glassesWidth / 2, -glassesHeight / 2);
          ctx.lineTo(-glassesWidth / 2, glassesHeight / 2);
          ctx.stroke();

          // Label
          ctx.fillStyle = 'black';
          ctx.font = 'bold 18px monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('GLASSES BOX', 0, 0);
          ctx.restore();

          // Reset baseline
          ctx.textBaseline = 'alphabetic';
          ctx.textAlign = 'left';

          // Glasses PNG drawing TEMPORARILY DISABLED for debugging

          setDebug((p) => ({ ...p, faceDetected: true, landmarksFound: true, drawingActive: true }));
        } else {
          setDebug((p) => ({ ...p, faceDetected: true, landmarksFound: false, drawingActive: false }));
        }
      } else {
        setDebug((p) => ({ ...p, faceDetected: false, landmarksFound: false, drawingActive: false }));
      }
    } catch (err) {
      console.error('❌ Detection error:', err);
    }

    animationFrameRef.current = requestAnimationFrame(detectFaceAndOverlay);
  };

  useEffect(() => {
    if (isStreaming && isModelLoaded) {
      isDrawingRef.current = true;
      detectFaceAndOverlay();
    }
    return () => {
      isDrawingRef.current = false;
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStreaming, isModelLoaded, selectedGlasses]);

  useEffect(() => () => stopWebcam(), []);

  const captureScreenshot = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const overlay = canvasRef.current;
    const out = document.createElement('canvas');
    out.width = video.clientWidth;
    out.height = video.clientHeight;
    const ctx = out.getContext('2d');
    if (!ctx) return;
    // Draw mirrored video
    ctx.save();
    ctx.scale(-1, 1);
    ctx.drawImage(video, -out.width, 0, out.width, out.height);
    ctx.restore();
    // Draw overlay on top
    ctx.drawImage(overlay, 0, 0, out.width, out.height);
    const link = document.createElement('a');
    link.download = `fitlens-tryon-${Date.now()}.png`;
    link.href = out.toDataURL('image/png');
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
                  className="absolute inset-0 w-full h-full"
                  style={{ transform: 'scaleX(-1)', zIndex: 1 }}
                  playsInline
                  muted
                />
                <canvas
                  ref={canvasRef}
                  className="absolute inset-0 w-full h-full"
                  style={{
                    display: isStreaming ? 'block' : 'none',
                    zIndex: 10,
                    pointerEvents: 'none',
                  }}
                />

                {!isStreaming && (
                  <div className="absolute inset-0 flex items-center justify-center" style={{ zIndex: 20 }}>
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
