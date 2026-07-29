import React, { useEffect, useMemo, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { ChevronLeft, ChevronRight, Sparkles, ShoppingBag } from "lucide-react";
import { Button } from "../components/ui/button";
import { fileUrl } from "../lib/api";
import { useCart } from "../context/CartContext";
import { toast } from "sonner";

const badgeStyles = {
  nuevo: "bg-[#D48A94] text-white",
  oferta: "bg-[#E5646A] text-white",
  agotado: "bg-[#A38999] text-white",
};

export default function ProductShowcase({ products }) {
  const { addItem } = useCart();
  const [emblaRef, emblaApi] = useEmblaCarousel(
    { loop: true, align: "start", skipSnaps: false },
    [Autoplay({ delay: 5000, stopOnInteraction: false, stopOnMouseEnter: true })]
  );
  const [selectedIndex, setSelectedIndex] = useState(0);

  const featured = useMemo(() => {
    if (!products || products.length === 0) return [];
    return products.slice(0, 8);
  }, [products]);

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setSelectedIndex(emblaApi.selectedScrollSnap());
    emblaApi.on("select", onSelect);
    onSelect();
    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi]);

  const scrollTo = (i) => emblaApi && emblaApi.scrollTo(i);

  const handleAdd = (p) => {
    if (p.badge === "agotado") {
      toast.error("Producto agotado");
      return;
    }
    addItem({
      id: p.id,
      code: p.code,
      name: p.name,
      price: p.price,
      image_path: p.image_path,
    });
    toast.success(`${p.name} agregado al carrito`);
  };

  // Empty-state showcase: hero fallback
  if (featured.length === 0) {
    return (
      <section className="relative overflow-hidden" data-testid="hero-empty">
        <div className="absolute inset-0 bg-gradient-to-b from-[#FCE4E2] via-[#FEF7F5] to-[#FEF7F5]" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 sm:pt-24 pb-16 text-center">
          <span className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-[#D48A94]">
            <Sparkles className="w-3 h-3" /> Próximamente
          </span>
          <h1 className="mt-4 font-serif-display text-5xl sm:text-6xl lg:text-7xl font-light text-[#3D2A3A] leading-[1.02]">
            Uñas, maquillaje <br />
            <em className="not-italic text-[#D48A94]">y un toque de brillo.</em>
          </h1>
          <p className="mt-6 text-[#4A3542] text-base max-w-lg mx-auto leading-relaxed">
            Estamos preparando nuestros productos. Pronto podrás explorar toda la colección.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section
      className="relative overflow-hidden bg-gradient-to-b from-[#FCE4E2] via-[#FEF7F5] to-[#FEF7F5]"
      data-testid="product-showcase"
    >
      <div className="relative max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-8 sm:pt-14 pb-10 sm:pb-14">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-5 sm:mb-10">
          <div>
            <span className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-[#D48A94]">
              <Sparkles className="w-3 h-3" /> Escaparate
            </span>
            <h1 className="mt-2 font-serif-display text-3xl sm:text-5xl lg:text-6xl font-light text-[#3D2A3A] leading-[1.05]">
              Nuestros productos <em className="not-italic text-[#D48A94]">favoritos</em>
            </h1>
            <p className="mt-2 text-[#4A3542] text-sm sm:text-base max-w-xl">
              Desliza para descubrir lo nuevo de la temporada.
            </p>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <Button
              data-testid="showcase-prev"
              variant="ghost"
              size="icon"
              onClick={() => emblaApi && emblaApi.scrollPrev()}
              className="h-10 w-10 sm:h-11 sm:w-11 rounded-full bg-white/70 backdrop-blur border border-[#F4DBD8] hover:bg-white text-[#3D2A3A]"
              aria-label="Anterior"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <Button
              data-testid="showcase-next"
              variant="ghost"
              size="icon"
              onClick={() => emblaApi && emblaApi.scrollNext()}
              className="h-10 w-10 sm:h-11 sm:w-11 rounded-full bg-white/70 backdrop-blur border border-[#F4DBD8] hover:bg-white text-[#3D2A3A]"
              aria-label="Siguiente"
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Embla viewport */}
        <div className="overflow-hidden" ref={emblaRef}>
          <div className="flex -mx-2 sm:-mx-3">
            {featured.map((p) => (
              <div
                key={p.id}
                className="min-w-0 shrink-0 grow-0 basis-full sm:basis-[70%] md:basis-[55%] lg:basis-[45%] xl:basis-[40%] px-2 sm:px-3"
                data-testid={`showcase-slide-${p.code}`}
              >
                <article className="grid grid-cols-1 sm:grid-cols-[1.1fr,1fr] gap-0 sm:gap-6 rounded-2xl sm:rounded-3xl bg-white border border-[#F4DBD8] overflow-hidden shadow-[0_30px_80px_-40px_rgba(61,42,58,0.35)]">
                  <div className="relative aspect-[4/5] sm:aspect-auto bg-[#FCE4E2] overflow-hidden">
                    <img
                      src={fileUrl(p.image_path)}
                      alt={p.name}
                      className={`w-full h-full object-cover ${p.badge === "agotado" ? "grayscale opacity-80" : ""}`}
                    />
                    {p.badge && (
                      <span
                        className={`absolute top-3 left-3 px-3 py-1 rounded-full text-[10px] tracking-[0.15em] uppercase font-medium ${badgeStyles[p.badge]}`}
                      >
                        {p.badge}
                      </span>
                    )}
                    <span className="absolute top-3 right-3 px-2.5 py-1 rounded-full text-[10px] tracking-wider font-mono bg-white/85 backdrop-blur text-[#3D2A3A]">
                      {p.code}
                    </span>
                  </div>
                  <div className="p-4 sm:p-6 flex flex-col justify-between gap-4">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.25em] text-[#D48A94]">
                        Destacado
                      </p>
                      <h3 className="mt-1 font-serif-display text-2xl sm:text-4xl text-[#3D2A3A] leading-tight">
                        {p.name}
                      </h3>
                    </div>
                    <div>
                      <span className="block font-serif-display text-4xl sm:text-6xl font-light tracking-tight text-[#D48A94]">
                        ${Number(p.price).toFixed(2)}
                      </span>
                      <Button
                        data-testid={`showcase-add-${p.code}`}
                        onClick={() => handleAdd(p)}
                        disabled={p.badge === "agotado"}
                        className="mt-4 rounded-full h-11 px-5 sm:px-6 bg-[#3D2A3A] hover:bg-[#2C1F2A] text-white gap-2 disabled:opacity-40 w-full sm:w-auto"
                      >
                        <ShoppingBag className="w-4 h-4" />
                        Agregar al carrito
                      </Button>
                    </div>
                  </div>
                </article>
              </div>
            ))}
          </div>
        </div>

        {/* Dots */}
        <div className="flex items-center justify-center gap-2 mt-5 sm:mt-6" data-testid="showcase-dots">
          {featured.map((_, i) => (
            <button
              key={i}
              onClick={() => scrollTo(i)}
              aria-label={`Ir al slide ${i + 1}`}
              data-testid={`showcase-dot-${i}`}
              className={`transition-all rounded-full ${
                selectedIndex === i
                  ? "w-8 h-2 bg-[#D48A94]"
                  : "w-2 h-2 bg-[#F4DBD8] hover:bg-[#E5C0C4]"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
