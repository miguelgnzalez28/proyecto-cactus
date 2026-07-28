import React, { useEffect, useRef, useState } from "react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "../components/ui/select";
import { Badge } from "../components/ui/badge";
import api, { fileUrl } from "../lib/api";
import { toast } from "sonner";
import { LogOut, Upload, Trash2, Instagram, Loader2, Leaf } from "lucide-react";

const STATUS_LABELS = {
  pending: { label: "Pendiente", color: "bg-[#F7EDE2] text-[#3D405B]" },
  published: { label: "Publicado", color: "bg-[#84A59D] text-white" },
  failed: { label: "Falló", color: "bg-[#F28482] text-white" },
  skipped: { label: "No configurado", color: "bg-[#8D99AE] text-white" },
};

export default function Admin() {
  const [token, setToken] = useState(() => localStorage.getItem("cactus_admin_token") || "");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState([]);
  const [igEnabled, setIgEnabled] = useState(false);

  // form state
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [badge, setBadge] = useState("none");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef();

  useEffect(() => {
    if (token) loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const loadAll = async () => {
    try {
      const [me, list, cfg] = await Promise.all([
        api.get("/auth/me"),
        api.get("/products"),
        api.get("/config"),
      ]);
      if (me.data?.user) {
        setProducts(list.data || []);
        setIgEnabled(!!cfg.data.instagram_enabled);
      }
    } catch (e) {
      logout();
    }
  };

  const login = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post("/auth/login", { username, password });
      localStorage.setItem("cactus_admin_token", res.data.token);
      setToken(res.data.token);
      toast.success("Bienvenido, admin");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Credenciales incorrectas");
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("cactus_admin_token");
    setToken("");
    setProducts([]);
  };

  const onFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 10 * 1024 * 1024) {
      toast.error("La imagen no puede superar 10MB");
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const resetForm = () => {
    setName("");
    setPrice("");
    setBadge("none");
    setFile(null);
    setPreview("");
    if (fileRef.current) fileRef.current.value = "";
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return toast.error("Nombre requerido");
    const p = parseFloat(price);
    if (isNaN(p) || p <= 0) return toast.error("Precio inválido");
    if (!file) return toast.error("Imagen requerida");

    const form = new FormData();
    form.append("name", name.trim());
    form.append("price", String(p));
    if (badge && badge !== "none") form.append("badge", badge);
    form.append("image", file);

    setSubmitting(true);
    try {
      const res = await api.post("/products", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success(`Producto ${res.data.code} creado`);
      if (igEnabled) {
        toast.message("Publicación en Instagram en curso…", {
          description: "Se procesará en segundo plano.",
        });
      } else {
        toast.message("Instagram no configurado", {
          description: "Agrega INSTAGRAM_USER_ID y META_ACCESS_TOKEN en el backend .env para activarlo.",
        });
      }
      resetForm();
      loadAll();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Error al crear producto");
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (p) => {
    if (!window.confirm(`¿Eliminar ${p.name} (${p.code})?`)) return;
    try {
      await api.delete(`/products/${p.id}`);
      toast.success("Producto eliminado");
      loadAll();
    } catch (e) {
      toast.error("No se pudo eliminar");
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-white rounded-3xl border border-[#EFE9E1] p-8 shadow-[0_20px_60px_-20px_rgba(61,64,91,0.15)]">
          <div className="flex flex-col items-center gap-2 mb-6">
            <div className="w-12 h-12 rounded-full bg-[#F7EDE2] flex items-center justify-center">
              <Leaf className="w-5 h-5 text-[#84A59D]" />
            </div>
            <h1 className="font-serif-display text-3xl text-[#3D405B]">Admin cactus</h1>
            <p className="text-xs text-[#8D99AE] uppercase tracking-[0.2em]">
              Solo administradores
            </p>
          </div>
          <form onSubmit={login} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-[0.2em] text-[#84A59D]">
                Usuario
              </label>
              <Input
                data-testid="admin-username-input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                className="rounded-lg border-[#EFE9E1]"
                autoComplete="username"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-[0.2em] text-[#84A59D]">
                Contraseña
              </label>
              <Input
                data-testid="admin-password-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="rounded-lg border-[#EFE9E1]"
                autoComplete="current-password"
                required
              />
            </div>
            <Button
              data-testid="admin-login-submit"
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-full bg-[#3D405B] hover:bg-[#2E3149] text-white"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Entrar"}
            </Button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <header className="border-b border-[#EFE9E1] bg-white/80 backdrop-blur sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-baseline gap-3">
            <span className="font-serif-display text-3xl text-[#3D405B]">cactus</span>
            <span className="text-[10px] uppercase tracking-[0.3em] text-[#84A59D]">admin</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:flex items-center gap-1.5 text-xs text-[#8D99AE]">
              <Instagram className="w-3.5 h-3.5" />
              {igEnabled ? "Instagram activo" : "Instagram no configurado"}
            </span>
            <Button
              data-testid="admin-logout-button"
              variant="ghost"
              onClick={logout}
              className="rounded-full text-[#3D405B] hover:bg-[#F7EDE2] gap-2"
            >
              <LogOut className="w-4 h-4" /> Salir
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 grid gap-8 lg:grid-cols-[1fr,1.4fr]">
        {/* Product form */}
        <section
          data-testid="admin-product-form"
          className="bg-white rounded-3xl border border-[#EFE9E1] p-6"
        >
          <h2 className="font-serif-display text-2xl text-[#3D405B] mb-1">
            Nuevo producto
          </h2>
          <p className="text-xs text-[#8D99AE] mb-5">
            Al guardar, se publicará automáticamente en Instagram si la integración está activa.
          </p>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-[0.2em] text-[#84A59D]">
                Nombre
              </label>
              <Input
                data-testid="product-name-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej. Echeveria rosa"
                className="rounded-lg border-[#EFE9E1]"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-[0.2em] text-[#84A59D]">
                Precio (USD)
              </label>
              <Input
                data-testid="product-price-input"
                type="number"
                step="0.01"
                min="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="Ej. 12.50"
                className="rounded-lg border-[#EFE9E1]"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-[0.2em] text-[#84A59D]">
                Badge (opcional)
              </label>
              <Select value={badge} onValueChange={setBadge}>
                <SelectTrigger
                  data-testid="product-badge-select"
                  className="rounded-lg border-[#EFE9E1]"
                >
                  <SelectValue placeholder="Ninguno" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Ninguno</SelectItem>
                  <SelectItem value="nuevo">Nuevo</SelectItem>
                  <SelectItem value="oferta">Oferta</SelectItem>
                  <SelectItem value="agotado">Agotado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-[0.2em] text-[#84A59D]">
                Imagen
              </label>
              <label
                htmlFor="product-image-input"
                className="cursor-pointer flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#EFE9E1] p-6 bg-[#FAFAFA] hover:bg-[#F7EDE2]/50 transition-colors"
              >
                {preview ? (
                  <img
                    src={preview}
                    alt="preview"
                    className="max-h-48 rounded-lg object-cover"
                  />
                ) : (
                  <>
                    <Upload className="w-6 h-6 text-[#84A59D]" />
                    <span className="text-sm text-[#3D405B]">
                      Haz click para seleccionar
                    </span>
                    <span className="text-xs text-[#8D99AE]">
                      JPG, PNG, WEBP o GIF · máx 10MB
                    </span>
                  </>
                )}
                <input
                  id="product-image-input"
                  data-testid="product-image-input"
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={onFile}
                  className="hidden"
                />
              </label>
            </div>
            <Button
              data-testid="product-submit-button"
              type="submit"
              disabled={submitting}
              className="w-full h-11 rounded-full bg-[#84A59D] hover:bg-[#6C8A82] text-white gap-2"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Upload className="w-4 h-4" /> Guardar y publicar
                </>
              )}
            </Button>
          </form>
        </section>

        {/* Product list */}
        <section
          data-testid="admin-product-list"
          className="bg-white rounded-3xl border border-[#EFE9E1] p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif-display text-2xl text-[#3D405B]">
              Productos ({products.length})
            </h2>
          </div>
          {products.length === 0 ? (
            <div className="py-12 text-center text-sm text-[#8D99AE]">
              Todavía no has agregado productos.
            </div>
          ) : (
            <ul className="divide-y divide-[#EFE9E1]">
              {products.map((p) => {
                const st = STATUS_LABELS[p.instagram_status] || STATUS_LABELS.pending;
                return (
                  <li
                    key={p.id}
                    data-testid={`admin-row-${p.code}`}
                    className="py-4 flex items-center gap-4"
                  >
                    <img
                      src={fileUrl(p.image_path)}
                      alt={p.name}
                      className="w-16 h-16 rounded-lg object-cover bg-[#F7EDE2]"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-serif-display text-lg text-[#3D405B] truncate">
                          {p.name}
                        </p>
                        <span className="text-[10px] font-mono text-[#8D99AE] tracking-wider">
                          {p.code}
                        </span>
                        {p.badge && (
                          <Badge className="bg-[#F7EDE2] text-[#3D405B] border-transparent text-[10px] uppercase tracking-wider">
                            {p.badge}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[#84A59D] font-serif-display text-lg">
                          ${Number(p.price).toFixed(2)}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full ${st.color}`}
                          title={p.instagram_error || ""}
                        >
                          <Instagram className="w-3 h-3" /> {st.label}
                        </span>
                      </div>
                    </div>
                    <Button
                      data-testid={`delete-product-${p.code}`}
                      variant="ghost"
                      size="icon"
                      onClick={() => remove(p)}
                      className="text-[#8D99AE] hover:text-[#F28482] hover:bg-[#F7EDE2]"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
