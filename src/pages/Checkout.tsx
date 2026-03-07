import { useState } from "react";
import { motion } from "framer-motion";
import { CreditCard, Smartphone, ShieldCheck, ArrowLeft, Check } from "lucide-react";
import { Link } from "react-router-dom";
import { products } from "@/lib/products";

const Checkout = () => {
  const [paymentMethod, setPaymentMethod] = useState<"card" | "apple" | "google">("card");
  const cartItems = [products[0], products[2]];
  const subtotal = cartItems.reduce((s, p) => s + p.price, 0);
  const shipping = 0;
  const total = subtotal + shipping;

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container mx-auto px-4 max-w-4xl">
        <Link to="/products" className="inline-flex items-center gap-1 text-muted-foreground hover:text-primary text-sm mb-8">
          <ArrowLeft className="h-4 w-4" /> Continue Shopping
        </Link>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-display text-3xl font-bold text-foreground mb-8"
        >
          Checkout
        </motion.h1>

        <div className="grid lg:grid-cols-5 gap-8">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="lg:col-span-3 space-y-6">
            <div className="glass-card rounded-xl p-6 space-y-4">
              <h2 className="font-display font-semibold text-foreground">Shipping Information</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <input placeholder="First Name" className="w-full bg-secondary rounded-lg px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
                <input placeholder="Last Name" className="w-full bg-secondary rounded-lg px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
              </div>
              <input placeholder="Email Address" className="w-full bg-secondary rounded-lg px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
              <input placeholder="Phone Number" className="w-full bg-secondary rounded-lg px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
              <input placeholder="Street Address" className="w-full bg-secondary rounded-lg px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
              <div className="grid sm:grid-cols-3 gap-4">
                <input placeholder="City" className="w-full bg-secondary rounded-lg px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
                <input placeholder="Emirate" className="w-full bg-secondary rounded-lg px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
                <input placeholder="Postal Code" className="w-full bg-secondary rounded-lg px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
              </div>
            </div>

            <div className="glass-card rounded-xl p-6 space-y-4">
              <h2 className="font-display font-semibold text-foreground">Payment Method</h2>
              <div className="grid grid-cols-3 gap-3">
                {([
                  { id: "card" as const, label: "Credit Card", icon: CreditCard },
                  { id: "apple" as const, label: "Apple Pay", icon: Smartphone },
                  { id: "google" as const, label: "Google Pay", icon: Smartphone },
                ]).map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setPaymentMethod(m.id)}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all text-sm ${
                      paymentMethod === m.id
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/30"
                    }`}
                  >
                    <m.icon className="h-5 w-5" />
                    {m.label}
                  </button>
                ))}
              </div>

              {paymentMethod === "card" && (
                <div className="space-y-4 pt-2">
                  <input placeholder="Card Number" className="w-full bg-secondary rounded-lg px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
                  <div className="grid grid-cols-2 gap-4">
                    <input placeholder="MM / YY" className="w-full bg-secondary rounded-lg px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
                    <input placeholder="CVV" className="w-full bg-secondary rounded-lg px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
                  </div>
                </div>
              )}
            </div>

            <button className="w-full py-4 rounded-xl bg-primary text-primary-foreground font-display font-semibold text-lg hover:bg-primary/90 transition-colors glow-warm flex items-center justify-center gap-2">
              <ShieldCheck className="h-5 w-5" /> Place Order — AED {total}
            </button>

            <p className="text-center text-xs text-muted-foreground flex items-center justify-center gap-1">
              <ShieldCheck className="h-3 w-3" /> Secured with 256-bit SSL encryption
            </p>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="lg:col-span-2">
            <div className="glass-card rounded-xl p-6 space-y-4 sticky top-24">
              <h2 className="font-display font-semibold text-foreground">Order Summary</h2>
              <div className="space-y-3">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex gap-3">
                    <div className="h-16 w-16 rounded-lg bg-secondary/50 flex items-center justify-center flex-shrink-0">
                      <img src={item.image} alt={item.name} className="h-12 w-12 object-contain" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{item.category}</p>
                      <p className="text-sm font-semibold text-foreground mt-1">AED {item.price}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t border-border pt-3 space-y-2 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span><span>AED {subtotal}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Shipping</span><span className="text-primary">Free</span>
                </div>
                <div className="flex justify-between text-foreground font-display font-bold text-lg pt-2 border-t border-border">
                  <span>Total</span><span>AED {total}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2">
                <Check className="h-3 w-3 text-primary" /> Free express shipping across UAE
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
