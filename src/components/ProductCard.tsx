import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Eye, Star } from "lucide-react";
import type { Product } from "@/lib/products";

const ProductCard = ({ product }: { product: Product }) => (
  <motion.div
    whileHover={{ y: -8, scale: 1.02 }}
    transition={{ type: "spring", stiffness: 300 }}
    className="glass-card rounded-xl overflow-hidden group"
  >
    <Link to={`/product/${product.id}`}>
      <div className="relative aspect-square bg-secondary/30 flex items-center justify-center p-6 overflow-hidden">
        <img
          src={product.image}
          alt={product.name}
          className="w-3/4 h-3/4 object-contain transition-transform duration-500 group-hover:scale-110"
        />
        {product.tags[0] && (
          <span className="absolute top-3 left-3 px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full bg-primary/20 text-primary border border-primary/30">
            {product.tags[0]}
          </span>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-card/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-4">
          <span className="flex items-center gap-1 text-sm text-primary font-medium">
            <Eye className="h-4 w-4" /> Try in AR
          </span>
        </div>
      </div>
      <div className="p-4">
        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{product.category}</p>
        <h3 className="font-display font-semibold text-foreground">{product.name}</h3>
        <div className="flex items-center gap-1 mt-1 mb-2">
          <Star className="h-3 w-3 fill-primary text-primary" />
          <span className="text-xs text-muted-foreground">{product.rating} ({product.reviews})</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-display font-bold text-foreground">AED {product.price}</span>
          {product.originalPrice && (
            <span className="text-xs text-muted-foreground line-through">AED {product.originalPrice}</span>
          )}
        </div>
      </div>
    </Link>
  </motion.div>
);

export default ProductCard;
