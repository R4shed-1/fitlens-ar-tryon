import clothingImg1 from "@/assets/product-clothing-1.png";
import clothingImg2 from "@/assets/product-clothing-2.png";
import clothingImg3 from "@/assets/product-clothing-3.png";
import clothingImg4 from "@/assets/product-clothing-4.png";

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
  /** Optional AR model id matching glassesOptions in ARTryOn page */
  arModelId?: string;
}

export const products: Product[] = [
  {
    id: "1",
    name: "Mirage Sport",
    price: 249,
    originalPrice: 329,
    image: "/models-3d-all/glasses-01/glasses_01.png",
    category: "Sport",
    description:
      "Aerodynamic sport frames in sunset orange. Lightweight TR-90 build with anti-glare polarized lenses — engineered for movement.",
    rating: 4.7,
    reviews: 168,
    arEnabled: true,
    tags: ["Sport", "AR Ready"],
    arModelId: "glasses-01",
  },
  {
    id: "2",
    name: "Onyx Wayfarer",
    price: 289,
    image: "/models-3d-all/glasses-02/glasses_02.png",
    category: "Sunglasses",
    description:
      "The timeless wayfarer, refined. Hand-polished black acetate with crystal-clear UV400 lenses. A wardrobe essential.",
    rating: 4.9,
    reviews: 412,
    arEnabled: true,
    tags: ["Bestseller", "AR Ready"],
    arModelId: "glasses-02",
  },
  {
    id: "3",
    name: "Azure Horizon",
    price: 269,
    image: "/models-3d-all/glasses-03/glasses_03.png",
    category: "Sunglasses",
    description:
      "Modern square frames in deep azure blue. A confident silhouette with gradient lenses and a feather-light fit.",
    rating: 4.6,
    reviews: 197,
    arEnabled: true,
    tags: ["New", "AR Ready"],
    arModelId: "glasses-03",
  },
  {
    id: "4",
    name: "Crimson Heritage",
    price: 309,
    originalPrice: 389,
    image: "/models-3d-all/glasses-04/glasses_04.png",
    category: "Eyeglasses",
    description:
      "Bold rectangular frames in rich crimson acetate. A statement of heritage craftsmanship paired with blue-light lenses.",
    rating: 4.8,
    reviews: 221,
    arEnabled: true,
    tags: ["Limited", "AR Ready"],
    arModelId: "glasses-04",
  },
  {
    id: "5",
    name: "Sahara Aviator",
    price: 349,
    originalPrice: 449,
    image: "/models-3d-all/glasses-05/glasses_05.png",
    category: "Sunglasses",
    description:
      "Iconic teardrop aviator in warm gold. Polarized desert-tinted lenses inspired by the dunes of the Empty Quarter.",
    rating: 4.9,
    reviews: 356,
    arEnabled: true,
    tags: ["Premium", "AR Ready"],
    arModelId: "glasses-05",
  },
  {
    id: "6",
    name: "Violet Muse",
    price: 279,
    image: "/models-3d-all/glasses-06/glasses_06.png",
    category: "Sunglasses",
    description:
      "Editorial round frames in iridescent violet. A poetic accent piece — sculpted for those who like to be seen.",
    rating: 4.7,
    reviews: 143,
    arEnabled: true,
    tags: ["Editorial", "AR Ready"],
    arModelId: "glasses-06",
  },
  {
    id: "7",
    name: "Atelier Wireframe",
    price: 319,
    image: "/models-3d-all/glasses-07/glasses_07.png",
    category: "Eyeglasses",
    description:
      "Ultra-fine wire round frames in brushed metal. An architect's choice — minimal, precise, weightless on the bridge.",
    rating: 4.8,
    reviews: 189,
    arEnabled: true,
    tags: ["Lightweight", "AR Ready"],
    arModelId: "glasses-07",
  },
  {
    id: "8",
    name: "Linen Tailored Blazer",
    price: 459,
    originalPrice: 599,
    image: clothingImg1,
    category: "Clothing",
    description:
      "A beautifully tailored beige linen blazer with a relaxed silhouette. Perfect for smart-casual occasions with premium horn buttons.",
    rating: 4.7,
    reviews: 142,
    arEnabled: false,
    tags: ["New Arrival"],
  },
  {
    id: "9",
    name: "Essential Cotton Tee",
    price: 129,
    image: clothingImg2,
    category: "Clothing",
    description:
      "Luxuriously soft 100% organic cotton t-shirt in crisp white. Relaxed fit with a refined crew neckline for everyday elegance.",
    rating: 4.6,
    reviews: 387,
    arEnabled: false,
    tags: ["Essentials"],
  },
  {
    id: "10",
    name: "Terracotta Maxi Dress",
    price: 549,
    originalPrice: 699,
    image: clothingImg3,
    category: "Clothing",
    description:
      "A flowing chiffon maxi dress in a warm terracotta hue. Features a flattering ruched waist and delicate spaghetti straps.",
    rating: 4.9,
    reviews: 205,
    arEnabled: false,
    tags: ["Premium"],
  },
  {
    id: "11",
    name: "Slim-Fit Navy Chinos",
    price: 289,
    image: clothingImg4,
    category: "Clothing",
    description:
      "Tailored slim-fit chinos in deep navy. Crafted from stretch cotton twill for comfort and a polished look all day long.",
    rating: 4.7,
    reviews: 176,
    arEnabled: false,
    tags: ["Bestseller"],
  },
];
