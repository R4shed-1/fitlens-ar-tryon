import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Eye, Star, ShoppingCart, Share2, Heart, ArrowLeft } from "lucide-react";
import { products } from "@/lib/products";
import ProductCard from "@/components/ProductCard";

const ProductDetail = () => {
  const { id } = useParams();
  const product = products.find((p) => p.id === id);

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-24">
        <p className="text-muted-foreground">Product not found.</p>
      </div>
    );
  }

  const recommended = products.filter((p) => p.id !== id).slice(0, 3);

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container mx-auto px-4">
        <Link to="/products" className="inline-flex items-center gap-1 text-muted-foreground hover:text-primary text-sm mb-8">
          <ArrowLeft className="h-4 w-4" /> Back to Collection
        </Link>

        <div className="grid lg:grid-cols-2 gap-12">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass-card rounded-2xl aspect-square flex items-center justify-center p-12"
          >
            <img src={product.image} alt={product.name} className="w-3/4 h-3/4 object-contain" />
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
            <div>
              <p className="text-xs text-primary uppercase tracking-widest font-medium mb-1">{product.category}</p>
              <h1 className="font-display text-3xl sm:text-4xl font-bold text-foreground">{product.name}</h1>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className={`h-4 w-4 ${i < Math.floor(product.rating) ? "fill-primary text-primary" : "text-muted"}`} />
                ))}
              </div>
              <span className="text-sm text-muted-foreground">{product.rating} ({product.reviews} reviews)</span>
            </div>

            <div className="flex items-baseline gap-3">
              <span className="font-display text-3xl font-bold text-foreground">AED {product.price}</span>
              {product.originalPrice && (
                <span className="text-lg text-muted-foreground line-through">AED {product.originalPrice}</span>
              )}
            </div>

            <p className="text-muted-foreground leading-relaxed">{product.description}</p>

            <div className="flex flex-wrap gap-2">
              {product.tags.map((tag) => (
                <span key={tag} className="px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                  {tag}
                </span>
              ))}
            </div>

            <div className="flex flex-wrap gap-3 pt-4">
              <Link
                to={`/ar-tryon?product=${product.id}`}
                className="flex-1 min-w-[160px] inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-display font-semibold hover:bg-primary/90 transition-colors glow-warm"
              >
                <Eye className="h-5 w-5" /> Try with AR
              </Link>
              <button className="flex-1 min-w-[160px] inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-border text-foreground font-display font-medium hover:bg-secondary transition-colors">
                <ShoppingCart className="h-5 w-5" /> Add to Cart
              </button>
            </div>

            <div className="flex gap-3 pt-2">
              <button className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors">
                <Heart className="h-4 w-4" /> Wishlist
              </button>
              <button className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors">
                <Share2 className="h-4 w-4" /> Share
              </button>
            </div>
          </motion.div>
        </div>

        <section className="mt-24">
          <h2 className="font-display text-2xl font-bold text-foreground mb-2">
            <span className="gradient-text italic">Curated for You</span> — You May Also Like
          </h2>
          <p className="text-muted-foreground text-sm mb-8">Based on your browsing and style preferences.</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {recommended.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default ProductDetail;
