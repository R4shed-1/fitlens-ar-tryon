import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Eye, Star } from "lucide-react";
import type { Product } from "@/lib/products";

const ProductCard = ({ product }: { product: Product }) => (
  <motion.div
    whileHover={{ y: -6 }}
    transition={{ type: "spring", stiffness: 280, damping: 20 }}
    className="glass-card rounded-2xl overflow-hidden group relative"
  >
    <Link to={`/product/${product.id}`} className="block">
      <div className="relative aspect-square bg-gradient-to-br from-secondary/40 via-card to-secondary/20 flex items-center justify-center p-8 overflow-hidden">
        <img
          src={product.image}
          alt={product.name}
          loading="lazy"
          className="w-full h-full object-contain transition-transform duration-700 group-hover:scale-110 drop-shadow-md"
        />
        {product.tags[0] && (
          <span className="absolute top-3 left-3 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full bg-card/90 backdrop-blur text-primary border border-primary/20 shadow-sm">
            {product.tags[0]}
          </span>
        )}
        {product.arEnabled && (
          <span className="absolute top-3 right-3 inline-flex items-center gap-1 px-2 py-1 text-[10px] font-semibold rounded-full bg-primary/90 text-primary-foreground shadow-sm">
            <Eye className="h-2.5 w-2.5" /> AR
          </span>
        )}
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-card via-card/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-4">
          <span className="flex items-center gap-1.5 text-sm text-primary font-medium">
            <Eye className="h-4 w-4" /> Quick View
          </span>
        </div>
      </div>
      <div className="p-5">
        <p className="text-[10px] text-muted-foreground uppercase tracking-[0.18em] mb-1.5">{product.category}</p>
        <h3 className="font-display font-semibold text-foreground text-lg leading-tight">{product.name}</h3>
        <div className="flex items-center gap-1 mt-1.5 mb-3">
          <Star className="h-3 w-3 fill-primary text-primary" />
          <span className="text-xs text-muted-foreground">{product.rating} · {product.reviews} reviews</span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="font-display font-bold text-foreground text-lg">AED {product.price}</span>
          {product.originalPrice && (
            <span className="text-xs text-muted-foreground line-through">AED {product.originalPrice}</span>
          )}
        </div>
      </div>
    </Link>
  </motion.div>
);

export default ProductCard;
