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
import { Sparkles, Filter } from "lucide-react";

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
    <div className="min-h-screen bg-[#FEF7F5]">
      <Header search={search} setSearch={setSearch} />

      {/* Hero */}
      <section className="relative overflow-hidden" data-testid="hero-section">
        <div className="absolute inset-0 bg-gradient-to-b from-[#FCE4E2] via-[#FEF7F5] to-[#FEF7F5]" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 sm:pt-20 pb-10">
          <div className="grid md:grid-cols-[1.4fr,1fr] gap-8 items-end">
            <div className="space-y-4">
              <span className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-[#D48A94]">
                <Sparkles className="w-3 h-3" /> Nueva colección
              </span>
              <h1 className="font-serif-display text-5xl sm:text-6xl lg:text-7xl font-light text-[#3D2A3A] leading-[1.02]">
                Uñas, maquillaje <br />
                <em className="not-italic text-[#D48A94]">y un toque de brillo.</em>
              </h1>
              <p className="text-[#4A3542] text-base max-w-lg leading-relaxed">
                Variedades pensadas para realzar tu belleza: esmaltes, cosméticos, herramientas de manicura y accesorios. Elige tus favoritos, arma tu carrito y recibe todo en la puerta de tu casa.
              </p>
            </div>
            <div className="hidden md:block">
              <img
                src="https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?crop=entropy&cs=srgb&fm=jpg&w=800&q=80"
                alt="beauty"
                className="w-full aspect-[4/5] object-cover rounded-3xl"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Filters */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] text-[#D48A94]">
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
                    ? "bg-[#3D2A3A] text-white border-[#3D2A3A]"
                    : "bg-white text-[#3D2A3A] border-[#F4DBD8] hover:bg-[#FCE4E2]"
                }`}
              >
                {b.label}
              </button>
            ))}
            <Select value={sort} onValueChange={setSort}>
              <SelectTrigger
                data-testid="sort-select"
                className="w-[170px] rounded-full h-9 border-[#F4DBD8] bg-white text-xs"
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
            className="py-24 text-center text-[#A38999] flex flex-col items-center gap-2"
          >
            <Sparkles className="w-8 h-8 animate-pulse text-[#D48A94]" />
            <p className="text-sm">Cargando catálogo…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div
            data-testid="empty-state"
            className="py-24 text-center text-[#A38999] flex flex-col items-center gap-3"
          >
            <Sparkles className="w-10 h-10 text-[#D48A94]" />
            <p className="font-serif-display text-2xl text-[#3D2A3A]">
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

      <footer className="border-t border-[#F4DBD8] bg-white/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-wrap items-center justify-between gap-4">
          <span className="font-serif-display text-2xl text-[#3D2A3A]">cactus</span>
          <p className="text-xs text-[#A38999]">
            Belleza para lucir cada día · {new Date().getFullYear()}
          </p>
        </div>
      </footer>
    </div>
  );
}
