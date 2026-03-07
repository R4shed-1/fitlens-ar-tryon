import { useState } from "react";
import { motion } from "framer-motion";
import { Camera, RotateCcw, Share2, ShoppingCart, ChevronLeft, ChevronRight, Download } from "lucide-react";
import { products } from "@/lib/products";

const ARTryOn = () => {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [cameraActive, setCameraActive] = useState(false);
  const selected = products[selectedIdx];

  return (
    <div className="min-h-screen pt-20 pb-16">
      <div className="container mx-auto px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-foreground mb-2">
            <span className="gradient-text">AR</span> Virtual Try-On
          </h1>
          <p className="text-muted-foreground">Select a product and see how it looks on you in real time.</p>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Camera view */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative aspect-[4/3] rounded-2xl overflow-hidden glass-card"
            >
              {cameraActive ? (
                <div className="absolute inset-0 bg-gradient-to-b from-secondary/50 to-card flex items-center justify-center">
                  {/* Simulated camera feed */}
                  <div className="relative w-full h-full">
                    {/* Face outline simulation */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-48 h-64 rounded-[50%] border-2 border-primary/40 border-dashed" />
                    </div>
                    {/* Overlay glasses */}
                    <div className="absolute inset-0 flex items-center justify-center" style={{ paddingBottom: "15%" }}>
                      <img
                        src={selected.image}
                        alt={selected.name}
                        className="w-40 h-auto object-contain opacity-80 drop-shadow-lg"
                      />
                    </div>
                    {/* Scan line */}
                    <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent animate-scan-line" />
                    {/* Corner markers */}
                    {["top-4 left-4", "top-4 right-4", "bottom-4 left-4", "bottom-4 right-4"].map((pos) => (
                      <div key={pos} className={`absolute ${pos} w-6 h-6 border-primary/60 ${
                        pos.includes("top") ? "border-t-2" : "border-b-2"
                      } ${pos.includes("left") ? "border-l-2" : "border-r-2"}`} />
                    ))}
                    {/* Status */}
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-primary/20 text-primary text-xs font-medium flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                      AR Active — {selected.name}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                  <div className="h-20 w-20 rounded-full gradient-bg flex items-center justify-center animate-pulse-glow">
                    <Camera className="h-10 w-10 text-primary" />
                  </div>
                  <p className="text-muted-foreground text-sm">Enable camera to start AR try-on</p>
                  <button
                    onClick={() => setCameraActive(true)}
                    className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-display font-semibold hover:bg-primary/90 transition-colors glow-cyan"
                  >
                    Start Camera
                  </button>
                </div>
              )}
            </motion.div>

            {/* Controls */}
            {cameraActive && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-center gap-4 mt-4"
              >
                <button
                  onClick={() => setCameraActive(false)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary text-secondary-foreground text-sm hover:bg-secondary/80 transition-colors"
                >
                  <RotateCcw className="h-4 w-4" /> Reset
                </button>
                <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary text-secondary-foreground text-sm hover:bg-secondary/80 transition-colors">
                  <Download className="h-4 w-4" /> Save Photo
                </button>
                <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition-colors">
                  <Share2 className="h-4 w-4" /> Share
                </button>
              </motion.div>
            )}
          </div>

          {/* Product selector */}
          <div className="space-y-4">
            <h3 className="font-display font-semibold text-foreground">Select Eyewear</h3>
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
              {products.map((p, i) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedIdx(i)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
                    i === selectedIdx
                      ? "glass-card border-primary/40 glow-cyan"
                      : "glass-card hover:border-primary/20"
                  }`}
                >
                  <div className="h-14 w-14 rounded-lg bg-secondary/50 flex items-center justify-center flex-shrink-0">
                    <img src={p.image} alt={p.name} className="h-10 w-10 object-contain" />
                  </div>
                  <div className="text-left flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.category} — AED {p.price}</p>
                  </div>
                </button>
              ))}
            </div>

            {/* Quick nav */}
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setSelectedIdx((i) => Math.max(0, i - 1))}
                className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg bg-secondary text-secondary-foreground text-sm hover:bg-secondary/80"
              >
                <ChevronLeft className="h-4 w-4" /> Prev
              </button>
              <button
                onClick={() => setSelectedIdx((i) => Math.min(products.length - 1, i + 1))}
                className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg bg-secondary text-secondary-foreground text-sm hover:bg-secondary/80"
              >
                Next <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* Add to cart */}
            <button className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground font-display font-semibold hover:bg-primary/90 transition-colors">
              <ShoppingCart className="h-5 w-5" /> Add {selected.name} to Cart
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ARTryOn;
