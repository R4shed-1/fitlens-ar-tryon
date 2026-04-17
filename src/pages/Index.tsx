import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Eye, Sparkles, Share2, ShieldCheck, Zap, Smartphone, Quote, Star } from "lucide-react";
import heroImage from "@/assets/hero-glasses.png";
import ProductCard from "@/components/ProductCard";
import { products } from "@/lib/products";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.6 } }),
};

const steps = [
  { icon: Smartphone, title: "Open Camera", desc: "Allow camera access on your device" },
  { icon: Eye, title: "Select Product", desc: "Choose any AR-ready eyewear to try" },
  { icon: Sparkles, title: "See the Magic", desc: "AI overlays glasses on your face in real-time" },
  { icon: Share2, title: "Share & Buy", desc: "Share with friends or add to cart instantly" },
];

const testimonials = [
  { name: "Layla A.", city: "Dubai", text: "The 3D try-on feels exactly like the boutique. I bought my Maison Gold without ever leaving home.", rating: 5 },
  { name: "Omar R.", city: "Abu Dhabi", text: "Frames sit perfectly on my face in the preview — no more guessing if a style suits me. Brilliant.", rating: 5 },
  { name: "Fatima K.", city: "Sharjah", text: "Elegant, fast, and the delivery was next-day. FitLens AR is now my go-to for eyewear.", rating: 5 },
];

const stats = [
  { value: "120K+", label: "Virtual fittings" },
  { value: "4.9★", label: "Customer rating" },
  { value: "48h", label: "UAE delivery" },
  { value: "30-day", label: "Easy returns" },
];

const Index = () => (
  <div className="min-h-screen">
    {/* Hero */}
    <section className="relative min-h-screen flex items-center overflow-hidden">
      {/* Soft warm gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-secondary/40 to-background" />
      <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-[120px]" />

      <div className="container mx-auto px-4 pt-24 pb-16 relative">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <motion.div initial="hidden" animate="visible" className="space-y-6">
            <motion.div custom={0} variants={fadeUp}>
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/30 bg-primary/5 text-primary text-xs font-medium tracking-wide">
                <Sparkles className="h-3 w-3" /> AI-Powered Virtual Try-On
              </span>
            </motion.div>
            <motion.h1 custom={1} variants={fadeUp} className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight text-foreground">
              Try Before You Buy —{" "}
              <span className="gradient-text italic">Elegance Meets Innovation</span>
            </motion.h1>
            <motion.p custom={2} variants={fadeUp} className="text-lg text-muted-foreground max-w-lg leading-relaxed">
              See how glasses, accessories, and more look on you in real time. No guesswork, no returns — just confidence.
            </motion.p>
            <motion.div custom={3} variants={fadeUp} className="flex flex-wrap gap-4">
              <Link
                to="/ar-tryon"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-display font-semibold hover:bg-primary/90 transition-colors glow-warm"
              >
                <Eye className="h-5 w-5" /> Try in AR
              </Link>
              <Link
                to="/products"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-border text-foreground font-display font-medium hover:bg-secondary transition-colors"
              >
                Shop Collection <ArrowRight className="h-4 w-4" />
              </Link>
            </motion.div>
            <motion.div custom={4} variants={fadeUp} className="flex items-center gap-6 pt-4">
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <ShieldCheck className="h-4 w-4 text-primary" /> Secure Checkout
              </div>
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Zap className="h-4 w-4 text-primary" /> Free UAE Shipping
              </div>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="relative"
          >
            <div className="relative rounded-2xl overflow-hidden glow-warm bg-secondary/50 p-8">
              <img src={heroImage} alt="FitLens AR Virtual Try-On" className="w-full animate-float" />
            </div>
          </motion.div>
        </div>
      </div>
    </section>

    {/* How it works */}
    <section className="py-24 relative">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground mb-4">
            How <span className="gradient-text italic">Virtual Try-On</span> Works
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Four simple steps to find your perfect pair — no store visit needed.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step, i) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="glass-card rounded-xl p-6 text-center group hover:border-primary/40 transition-colors"
            >
              <div className="mx-auto mb-4 h-12 w-12 rounded-xl gradient-bg flex items-center justify-center">
                <step.icon className="h-6 w-6 text-primary" />
              </div>
              <div className="text-xs text-primary font-bold mb-2 tracking-widest uppercase">Step {i + 1}</div>
              <h3 className="font-display font-semibold text-foreground mb-1">{step.title}</h3>
              <p className="text-sm text-muted-foreground">{step.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>

    {/* Featured Products */}
    <section className="py-24 relative">
      <div className="absolute inset-0 gradient-bg opacity-40" />
      <div className="container mx-auto px-4 relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex items-end justify-between mb-12"
        >
          <div>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground mb-2">
              Featured <span className="gradient-text italic">Collection</span>
            </h2>
            <p className="text-muted-foreground">Curated picks, all AR-ready.</p>
          </div>
          <Link to="/products" className="hidden sm:flex items-center gap-1 text-primary text-sm font-medium hover:underline">
            View All <ArrowRight className="h-4 w-4" />
          </Link>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.slice(0, 6).map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>

        <div className="mt-8 text-center sm:hidden">
          <Link to="/products" className="text-primary text-sm font-medium">
            View All Products →
          </Link>
        </div>
      </div>
    </section>

    {/* CTA */}
    <section className="py-24">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="glass-card rounded-2xl p-12 text-center relative overflow-hidden"
        >
          <div className="absolute inset-0 gradient-bg opacity-50" />
          <div className="relative">
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Ready to Find Your <span className="gradient-text italic">Perfect Pair</span>?
            </h2>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto">
              Experience our AI-powered virtual try-on and never second-guess an online purchase again.
            </p>
            <Link
              to="/ar-tryon"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-primary text-primary-foreground font-display font-semibold text-lg hover:bg-primary/90 transition-colors glow-warm"
            >
              <Eye className="h-5 w-5" /> Try AR Now
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  </div>
);

export default Index;
