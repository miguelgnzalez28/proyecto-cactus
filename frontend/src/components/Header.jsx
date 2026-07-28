import React, { useState } from "react";
import { ShoppingBag, Search, Share2, ArrowRight } from "lucide-react";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { useCart } from "../context/CartContext";
import CartDrawer from "./CartDrawer";
import QRModal from "./QRModal";

export default function Header({ search, setSearch }) {
  const { count } = useCart();
  const [cartOpen, setCartOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);

  return (
    <header
      className="sticky top-0 z-40 w-full backdrop-blur-xl bg-white/70 border-b border-[#F4DBD8]"
      data-testid="site-header"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-4">
        <a href="/" className="flex items-center gap-1 shrink-0" data-testid="brand-logo">
          <img
            src="/assets/logo.png"
            alt="cactus"
            className="h-11 sm:h-14 w-auto object-contain"
          />
        </a>

        <div className="flex-1 max-w-xl mx-auto relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A38999] w-4 h-4" />
          <Input
            data-testid="search-input"
            type="text"
            placeholder="Buscar por nombre o código…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-11 rounded-full border-[#F4DBD8] bg-white/80 focus-visible:ring-[#D48A94]"
          />
        </div>

        <Button
          data-testid="share-qr-button"
          variant="ghost"
          size="icon"
          onClick={() => setQrOpen(true)}
          className="rounded-full h-11 w-11 text-[#3D2A3A] hover:bg-[#FCE4E2]"
          aria-label="Compartir tienda"
        >
          <Share2 className="w-5 h-5" />
        </Button>

        <Button
          data-testid="cart-drawer-toggle"
          onClick={() => setCartOpen(true)}
          className="relative rounded-full h-11 pl-4 pr-5 bg-[#3D2A3A] hover:bg-[#2C1F2A] text-white gap-2"
        >
          <ShoppingBag className="w-4 h-4" />
          <span className="hidden sm:inline text-sm">Carrito</span>
          {count > 0 && (
            <span
              data-testid="cart-count-badge"
              className="ml-1 min-w-[22px] h-[22px] px-1.5 rounded-full bg-[#E5646A] text-white text-xs font-medium flex items-center justify-center"
            >
              {count}
            </span>
          )}
          <ArrowRight className="w-4 h-4 opacity-70 hidden sm:inline-block" />
        </Button>
      </div>
      <CartDrawer open={cartOpen} onOpenChange={setCartOpen} />
      <QRModal open={qrOpen} onOpenChange={setQrOpen} />
    </header>
  );
}
