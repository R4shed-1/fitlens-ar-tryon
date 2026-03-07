import productImg1 from "@/assets/product-glasses-1.png";
import productImg2 from "@/assets/product-glasses-2.png";
import productImg3 from "@/assets/product-glasses-3.png";
import productImg4 from "@/assets/product-glasses-4.png";
import productImg5 from "@/assets/product-glasses-5.png";
import productImg6 from "@/assets/product-glasses-6.png";

export interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  category: string;
  description: string;
  rating: number;
  reviews: number;
  arEnabled: boolean;
  tags: string[];
}

export const products: Product[] = [
  {
    id: "1",
    name: "Nova Aviator",
    price: 299,
    originalPrice: 399,
    image: productImg1,
    category: "Sunglasses",
    description: "Classic aviator silhouette reimagined with lightweight titanium frames and polarized gradient lenses. Perfect for the modern trendsetter.",
    rating: 4.8,
    reviews: 234,
    arEnabled: true,
    tags: ["Bestseller", "AR Ready"],
  },
  {
    id: "2",
    name: "Orbit Round",
    price: 249,
    image: productImg2,
    category: "Eyeglasses",
    description: "Minimalist round frames crafted from premium acetate. Features blue-light filtering lenses for all-day digital comfort.",
    rating: 4.6,
    reviews: 189,
    arEnabled: true,
    tags: ["Blue Light", "AR Ready"],
  },
  {
    id: "3",
    name: "Eclipse Cat Eye",
    price: 349,
    originalPrice: 449,
    image: productImg3,
    category: "Sunglasses",
    description: "Bold cat-eye frames with oversized dark lenses. Handcrafted from Italian acetate for a luxurious feel.",
    rating: 4.9,
    reviews: 312,
    arEnabled: true,
    tags: ["Premium", "AR Ready"],
  },
  {
    id: "4",
    name: "Blaze Sport",
    price: 199,
    image: productImg4,
    category: "Sport",
    description: "High-performance sport frames with wraparound design. Impact-resistant lenses with anti-fog coating.",
    rating: 4.7,
    reviews: 156,
    arEnabled: true,
    tags: ["Sport", "AR Ready"],
  },
  {
    id: "5",
    name: "Vintage Steampunk",
    price: 279,
    image: productImg5,
    category: "Sunglasses",
    description: "Retro-inspired round frames with detailed metalwork. Rose gold finish with UV400 protection lenses.",
    rating: 4.5,
    reviews: 98,
    arEnabled: true,
    tags: ["Limited", "AR Ready"],
  },
  {
    id: "6",
    name: "Prism Titanium",
    price: 329,
    image: productImg6,
    category: "Eyeglasses",
    description: "Ultra-light rectangular titanium frames. Precision-engineered for all-day comfort with spring hinges.",
    rating: 4.8,
    reviews: 201,
    arEnabled: true,
    tags: ["Lightweight", "AR Ready"],
  },
];
