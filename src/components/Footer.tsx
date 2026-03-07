import { Glasses } from "lucide-react";
import { Link } from "react-router-dom";

const Footer = () => (
  <footer className="border-t border-border bg-card/50">
    <div className="container mx-auto px-4 py-12">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Glasses className="h-6 w-6 text-primary" />
            <span className="font-display text-lg font-bold gradient-text">FitLens AR</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Try before you buy. AI-powered virtual try-on for the modern shopper.
          </p>
        </div>
        <div>
          <h4 className="font-display font-semibold mb-3 text-foreground">Shop</h4>
          <div className="flex flex-col gap-2">
            <Link to="/products" className="text-sm text-muted-foreground hover:text-primary transition-colors">All Products</Link>
            <Link to="/ar-tryon" className="text-sm text-muted-foreground hover:text-primary transition-colors">AR Try-On</Link>
          </div>
        </div>
        <div>
          <h4 className="font-display font-semibold mb-3 text-foreground">Company</h4>
          <div className="flex flex-col gap-2">
            <span className="text-sm text-muted-foreground">About Us</span>
            <span className="text-sm text-muted-foreground">Careers</span>
            <span className="text-sm text-muted-foreground">Contact</span>
          </div>
        </div>
        <div>
          <h4 className="font-display font-semibold mb-3 text-foreground">Follow Us</h4>
          <div className="flex flex-col gap-2">
            <span className="text-sm text-muted-foreground">Instagram</span>
            <span className="text-sm text-muted-foreground">Twitter</span>
            <span className="text-sm text-muted-foreground">TikTok</span>
          </div>
        </div>
      </div>
      <div className="mt-8 pt-8 border-t border-border text-center">
        <p className="text-xs text-muted-foreground">© 2026 FitLens AR. All rights reserved.</p>
      </div>
    </div>
  </footer>
);

export default Footer;
