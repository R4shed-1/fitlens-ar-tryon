import { Glasses, Instagram, Twitter, Music2, Mail } from "lucide-react";
import { Link } from "react-router-dom";

const Footer = () => (
  <footer className="border-t border-border bg-gradient-to-b from-card/40 to-card/80">
    <div className="container mx-auto px-4 py-16">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
        <div className="md:col-span-4">
          <div className="flex items-center gap-2 mb-4">
            <Glasses className="h-6 w-6 text-primary" />
            <span className="font-display text-xl font-bold gradient-text">FitLens AR</span>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed mb-5 max-w-xs">
            A virtual atelier for the modern Middle East. Try every frame, find your signature look — from anywhere.
          </p>
          <div className="flex items-center gap-3">
            {[Instagram, Twitter, Music2].map((Icon, i) => (
              <a
                key={i}
                href="#"
                className="h-9 w-9 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors"
                aria-label="Social"
              >
                <Icon className="h-4 w-4" />
              </a>
            ))}
          </div>
        </div>

        <div className="md:col-span-2">
          <h4 className="font-display font-semibold mb-4 text-foreground text-sm">Shop</h4>
          <div className="flex flex-col gap-2.5">
            <Link to="/products" className="text-sm text-muted-foreground hover:text-primary transition-colors">All Products</Link>
            <Link to="/products" className="text-sm text-muted-foreground hover:text-primary transition-colors">Sunglasses</Link>
            <Link to="/products" className="text-sm text-muted-foreground hover:text-primary transition-colors">Eyeglasses</Link>
            <Link to="/ar-tryon" className="text-sm text-muted-foreground hover:text-primary transition-colors">AR Try-On</Link>
          </div>
        </div>

        <div className="md:col-span-2">
          <h4 className="font-display font-semibold mb-4 text-foreground text-sm">Company</h4>
          <div className="flex flex-col gap-2.5">
            <span className="text-sm text-muted-foreground hover:text-primary cursor-pointer transition-colors">About</span>
            <span className="text-sm text-muted-foreground hover:text-primary cursor-pointer transition-colors">Journal</span>
            <span className="text-sm text-muted-foreground hover:text-primary cursor-pointer transition-colors">Stores</span>
            <span className="text-sm text-muted-foreground hover:text-primary cursor-pointer transition-colors">Contact</span>
          </div>
        </div>

        <div className="md:col-span-4">
          <h4 className="font-display font-semibold mb-4 text-foreground text-sm">Stay in the loop</h4>
          <p className="text-sm text-muted-foreground mb-4">
            New drops, private previews, and styling notes — straight to your inbox.
          </p>
          <form
            className="flex items-center gap-2 bg-background border border-border rounded-full p-1.5 pl-4 focus-within:border-primary/40 transition-colors"
            onSubmit={(e) => e.preventDefault()}
          >
            <Mail className="h-4 w-4 text-muted-foreground" />
            <input
              type="email"
              placeholder="your@email.com"
              className="flex-1 bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground"
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-full bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors"
            >
              Subscribe
            </button>
          </form>
        </div>
      </div>

      <div className="mt-12 pt-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">© 2026 FitLens AR · Crafted in the UAE.</p>
        <div className="flex items-center gap-5 text-xs text-muted-foreground">
          <span className="hover:text-primary cursor-pointer transition-colors">Privacy</span>
          <span className="hover:text-primary cursor-pointer transition-colors">Terms</span>
          <span className="hover:text-primary cursor-pointer transition-colors">Shipping</span>
        </div>
      </div>
    </div>
  </footer>
);

export default Footer;
