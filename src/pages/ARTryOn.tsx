import { useEffect, useRef, useState } from 'react';
import * as faceapi from 'face-api.js';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Camera, Upload, Loader2, RefreshCw } from 'lucide-react';

interface GlassesOverlay {
  id: string;
  name: string;
  image: string;
  offsetX: number;
  offsetY: number;
  scale: number;
}

const glassesOptions: GlassesOverlay[] = [
  { id: 'aviator', name: 'Aviator', image: '/glasses/aviator.svg', offsetX: 0, offsetY: -15, scale: 1.9 },
  { id: 'wayfarer', name: 'Wayfarer', image: '/glasses/wayfarer.svg', offsetX: 0, offsetY: -10, scale: 1.8 },
  { id: 'round', name: 'Round', image: '/glasses/round.svg', offsetX: 0, offsetY: -12, scale: 1.7 },
  { id: 'cat-eye', name: 'Cat Eye', image: '/glasses/cat-eye.svg', offsetX: 0, offsetY: -15, scale: 1.85 },
];

export default function ARTryOn() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [selectedGlasses, setSelectedGlasses] = useState<GlassesOverlay>(glassesOptions[0]);
  const [error, setError] = useState<string | null>(null);
  const animationFrameRef = useRef<number>();
  const glassesImageRef = useRef<HTMLImageElement>();

  useEffect(() => {
    const loadModels = async () => {
      try {
        const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model';
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        ]);
        setIsModelLoaded(true);
      } catch (err) {
        setError('Failed to load face detection models');
        console.error('Model loading error:', err);
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
        await videoRef.current.play();
        setIsStreaming(true);
        setError(null);
      }
    } catch (err) {
      setError('Camera access denied. Please enable camera permissions.');
      console.error('Webcam error:', err);
    }
  };

  const stopWebcam = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
      setIsStreaming(false);
    }
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
  };

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = selectedGlasses.image;
    img.onload = () => { glassesImageRef.current = img; };
    img.onerror = () => console.error('Failed to load glasses image');
  }, [selectedGlasses]);

  const detectFaceAndOverlay = async () => {
    if (!videoRef.current || !canvasRef.current || !isModelLoaded) {
      animationFrameRef.current = requestAnimationFrame(detectFaceAndOverlay);
      return;
    }
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx || video.videoWidth === 0) {
      animationFrameRef.current = requestAnimationFrame(detectFaceAndOverlay);
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Mirror the video horizontally for natural selfie view
    ctx.save();
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    ctx.restore();

    try {
      const detections = await faceapi
        .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks();

      if (detections && glassesImageRef.current) {
        const landmarks = detections.landmarks;
        const leftEye = landmarks.getLeftEye();
        const rightEye = landmarks.getRightEye();

        const avg = (pts: { x: number; y: number }[]) => ({
          x: pts.reduce((a, p) => a + p.x, 0) / pts.length,
          y: pts.reduce((a, p) => a + p.y, 0) / pts.length,
        });
        const l = avg(leftEye);
        const r = avg(rightEye);

        const eyeDistance = Math.hypot(r.x - l.x, r.y - l.y);
        const angle = Math.atan2(r.y - l.y, r.x - l.x);

        const glassesWidth = eyeDistance * selectedGlasses.scale;
        const glassesHeight = (glassesImageRef.current.height / glassesImageRef.current.width) * glassesWidth;
        const centerX = (l.x + r.x) / 2;
        const centerY = (l.y + r.y) / 2;

        // Mirror coordinates because canvas is mirrored
        const mirroredX = canvas.width - centerX;

        ctx.save();
        ctx.translate(mirroredX, centerY + selectedGlasses.offsetY);
        ctx.rotate(-angle);
        ctx.drawImage(
          glassesImageRef.current,
          -glassesWidth / 2 + selectedGlasses.offsetX,
          -glassesHeight / 2,
          glassesWidth,
          glassesHeight,
        );
        ctx.restore();
      }
    } catch (err) {
      console.error('Detection error:', err);
    }

    animationFrameRef.current = requestAnimationFrame(detectFaceAndOverlay);
  };

  useEffect(() => {
    if (isStreaming && isModelLoaded) detectFaceAndOverlay();
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStreaming, isModelLoaded, selectedGlasses]);

  useEffect(() => () => stopWebcam(), []);

  const captureScreenshot = () => {
    if (canvasRef.current) {
      const link = document.createElement('a');
      link.download = `fitlens-tryon-${Date.now()}.png`;
      link.href = canvasRef.current.toDataURL('image/png');
      link.click();
    }
  };

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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card className="p-6 glass-card">
              <div className="relative aspect-video bg-secondary rounded-xl overflow-hidden">
                <video
                  ref={videoRef}
                  className="absolute inset-0 w-full h-full object-cover opacity-0 pointer-events-none"
                  playsInline
                  muted
                />
                <canvas
                  ref={canvasRef}
                  className="absolute inset-0 w-full h-full object-cover"
                  style={{ display: isStreaming ? 'block' : 'none' }}
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
                  <li>3. Select different glasses to try on</li>
                  <li>4. Capture photos you like!</li>
                </ol>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
