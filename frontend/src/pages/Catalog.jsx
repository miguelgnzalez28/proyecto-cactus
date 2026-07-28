import React, { useEffect, useMemo, useState } from "react";
import Header from "../components/Header";
import ProductCard from "../components/ProductCard";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "../components/ui/select";
import api from "../lib/api";
import { toast } from "sonner";
import { Sprout, Filter, Leaf } from "lucide-react";

export default function Catalog() {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("newest");
  const [badge, setBadge] = useState("all");
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => {
      loadProducts();
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, sort]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const params = {};
      if (search) params.q = search;
      if (sort && sort !== "newest") params.sort = sort;
      const res = await api.get("/products", { params });
      setProducts(res.data || []);
    } catch (e) {
      console.error(e);
      toast.error("No se pudieron cargar los productos");
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    if (badge === "all") return products;
    return products.filter((p) => (p.badge || "sin") === badge);
  }, [products, badge]);

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <Header search={search} setSearch={setSearch} />

      {/* Hero */}
      <section className="relative overflow-hidden" data-testid="hero-section">
        <div className="absolute inset-0 bg-gradient-to-b from-[#F7EDE2] via-[#FAFAFA] to-[#FAFAFA]" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 sm:pt-20 pb-10">
          <div className="grid md:grid-cols-[1.4fr,1fr] gap-8 items-end">
            <div className="space-y-4">
              <span className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-[#84A59D]">
                <Leaf className="w-3 h-3" /> Nueva colección
              </span>
              <h1 className="font-serif-display text-5xl sm:text-6xl lg:text-7xl font-light text-[#3D405B] leading-[1.02]">
                Un pequeño desierto <br />
                <em className="not-italic text-[#84A59D]">en tu casa.</em>
              </h1>
              <p className="text-[#4A4E69] text-base max-w-lg leading-relaxed">
                Explora nuestro catálogo de cactus, suculentas y macetas. Selecciona tus favoritos, arma tu carrito y recibe todo en la puerta de tu casa.
              </p>
            </div>
            <div className="hidden md:block">
              <img
                src="https://images.unsplash.com/photo-1610391437424-a78a33ee5716?crop=entropy&cs=srgb&fm=jpg&w=800&q=80"
                alt="desert"
                className="w-full aspect-[4/5] object-cover rounded-3xl"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Filters */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] text-[#84A59D]">
            <Filter className="w-3 h-3" /> Filtrar
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {[
              { k: "all", label: "Todos" },
              { k: "nuevo", label: "Nuevos" },
              { k: "oferta", label: "Ofertas" },
              { k: "agotado", label: "Agotados" },
            ].map((b) => (
              <button
                key={b.k}
                data-testid={`filter-badge-${b.k}`}
                onClick={() => setBadge(b.k)}
                className={`px-3 py-1.5 rounded-full text-xs transition-colors border ${
                  badge === b.k
                    ? "bg-[#3D405B] text-white border-[#3D405B]"
                    : "bg-white text-[#3D405B] border-[#EFE9E1] hover:bg-[#F7EDE2]"
                }`}
              >
                {b.label}
              </button>
            ))}
            <Select value={sort} onValueChange={setSort}>
              <SelectTrigger
                data-testid="sort-select"
                className="w-[170px] rounded-full h-9 border-[#EFE9E1] bg-white text-xs"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Más recientes</SelectItem>
                <SelectItem value="price_asc">Precio: menor a mayor</SelectItem>
                <SelectItem value="price_desc">Precio: mayor a menor</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      {/* Product grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        {loading ? (
          <div
            data-testid="loading-state"
            className="py-24 text-center text-[#8D99AE] flex flex-col items-center gap-2"
          >
            <Sprout className="w-8 h-8 animate-pulse text-[#84A59D]" />
            <p className="text-sm">Cargando catálogo…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div
            data-testid="empty-state"
            className="py-24 text-center text-[#8D99AE] flex flex-col items-center gap-3"
          >
            <Sprout className="w-10 h-10 text-[#84A59D]" />
            <p className="font-serif-display text-2xl text-[#3D405B]">
              No hay productos aún
            </p>
            <p className="text-sm max-w-sm">
              Vuelve más tarde o entra al panel de administrador para agregar productos.
            </p>
          </div>
        ) : (
          <div
            data-testid="products-grid"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-8"
          >
            {filtered.map((p, i) => (
              <ProductCard key={p.id} product={p} index={i} />
            ))}
          </div>
        )}
      </section>

      <footer className="border-t border-[#EFE9E1] bg-white/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-wrap items-center justify-between gap-4">
          <span className="font-serif-display text-2xl text-[#3D405B]">cactus</span>
          <p className="text-xs text-[#8D99AE]">
            Hecho con amor y un poco de arena · {new Date().getFullYear()}
          </p>
        </div>
      </footer>
    </div>
  );
}
