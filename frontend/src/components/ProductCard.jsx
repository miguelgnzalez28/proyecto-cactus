import React from "react";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import { Button } from "../components/ui/button";
import { fileUrl } from "../lib/api";
import { useCart } from "../context/CartContext";
import { toast } from "sonner";

const badgeStyles = {
  nuevo: "bg-[#D48A94] text-white",
  oferta: "bg-[#E5646A] text-white",
  agotado: "bg-[#A38999] text-white",
};
const badgeLabels = { nuevo: "Nuevo", oferta: "Oferta", agotado: "Agotado" };

export default function ProductCard({ product, index = 0 }) {
  const { addItem } = useCart();
  const isSoldOut = product.badge === "agotado";

  const handleAdd = () => {
    if (isSoldOut) {
      toast.error("Producto agotado");
      return;
    }
    addItem({
      id: product.id,
      code: product.code,
      name: product.name,
      price: product.price,
      image_path: product.image_path,
    });
    toast.success(`${product.name} agregado al carrito`);
  };

  return (
    <motion.article
      data-testid={`product-card-${product.code}`}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.5, ease: "easeOut" }}
      className="group flex flex-col rounded-2xl overflow-hidden bg-white hover:shadow-[0_20px_50px_-20px_rgba(61,64,91,0.25)] hover:-translate-y-1 transition-all duration-300 border border-[#F4DBD8]"
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-[#FCE4E2]">
        <img
          src={fileUrl(product.image_path)}
          alt={product.name}
          loading="lazy"
          className={`w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 ${
            isSoldOut ? "grayscale opacity-70" : ""
          }`}
        />
        {product.badge && (
          <span
            data-testid={`badge-${product.badge}`}
            className={`absolute top-3 left-3 px-3 py-1 rounded-full text-[10px] tracking-[0.15em] uppercase font-medium ${badgeStyles[product.badge]}`}
          >
            {badgeLabels[product.badge]}
          </span>
        )}
        <span
          data-testid={`product-code-${product.code}`}
          className="absolute top-3 right-3 px-2.5 py-1 rounded-full text-[10px] tracking-wider font-mono bg-white/85 backdrop-blur text-[#3D2A3A]"
        >
          {product.code}
        </span>
      </div>

      <div className="p-5 flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-serif-display text-xl sm:text-2xl text-[#3D2A3A] leading-tight">
            {product.name}
          </h3>
        </div>
        <div className="flex items-end justify-between gap-3">
          <span
            data-testid={`product-price-${product.code}`}
            className="font-serif-display text-3xl sm:text-4xl font-light tracking-tight text-[#D48A94]"
          >
            ${Number(product.price).toFixed(2)}
          </span>
          <Button
            data-testid={`add-to-cart-${product.code}`}
            onClick={handleAdd}
            disabled={isSoldOut}
            className="rounded-full h-10 px-4 bg-[#3D2A3A] text-white hover:bg-[#2C1F2A] disabled:opacity-40"
          >
            <Plus className="w-4 h-4" />
            <span className="text-xs">Agregar</span>
          </Button>
        </div>
      </div>
    </motion.article>
  );
}
