import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../components/ui/dialog";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { CheckCircle2, MapPin, Phone, MessageCircle, ChevronDown } from "lucide-react";
import { useCart } from "../context/CartContext";
import api from "../lib/api";
import { toast } from "sonner";

export default function CheckoutModal({ open, onOpenChange, onCompleted }) {
  const { items, total, clear } = useCart();
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [showDelivery, setShowDelivery] = useState(false);
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    if (!open) {
      setConfirmed(false);
      setShowDelivery(false);
    }
  }, [open]);

  useEffect(() => {
    api.get("/config").then((r) => setWhatsappNumber(r.data.whatsapp_number || ""));
  }, []);

  const buildMessage = () => {
    const lines = [];
    lines.push("🌵 *Nuevo pedido - cactus*");
    lines.push("");
    lines.push("*Productos:*");
    items.forEach((it) => {
      lines.push(`• [${it.code}] ${it.name} x${it.qty} — $${(it.price * it.qty).toFixed(2)}`);
    });
    lines.push("");
    lines.push(`*Total:* $${total.toFixed(2)}`);
    lines.push("");
    if (address || phone) {
      lines.push("*Delivery:*");
      if (address) lines.push(`📍 Dirección: ${address}`);
      if (phone) lines.push(`📞 Teléfono: ${phone}`);
    } else {
      lines.push("*Delivery:* retirar en tienda");
    }
    return lines.join("\n");
  };

  const sendWhatsapp = () => {
    if (!whatsappNumber) {
      toast.error("Número de WhatsApp no configurado");
      return;
    }
    const text = encodeURIComponent(buildMessage());
    const number = whatsappNumber.replace(/\D/g, "");
    const url = `https://wa.me/${number}?text=${text}`;
    window.open(url, "_blank", "noopener,noreferrer");
    toast.success("Redirigiendo a WhatsApp…");
    clear();
    onCompleted && onCompleted();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-testid="checkout-modal"
        className="max-w-lg p-0 bg-[#FAFAFA] border-[#EFE9E1] gap-0 max-h-[90vh] flex flex-col"
      >
        <DialogHeader className="px-6 pt-6 pb-3 border-b border-[#EFE9E1] shrink-0">
          <DialogTitle className="font-serif-display text-3xl font-light text-[#3D405B]">
            Verifique sus productos
          </DialogTitle>
          <DialogDescription className="text-[#8D99AE]">
            Confirme la lista antes de enviar el pedido por WhatsApp.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          <ul className="space-y-2" data-testid="verify-items-list">
            {items.map((it) => (
              <li
                key={it.id}
                className="flex items-center justify-between gap-3 rounded-xl bg-white border border-[#EFE9E1] px-4 py-3"
                data-testid={`verify-item-${it.code}`}
              >
                <div className="flex-1 min-w-0">
                  <p className="font-serif-display text-lg text-[#3D405B] truncate">
                    {it.name}
                  </p>
                  <p className="text-[10px] font-mono text-[#8D99AE] tracking-wider">
                    {it.code} · x{it.qty}
                  </p>
                </div>
                <span className="font-serif-display text-xl text-[#84A59D] shrink-0">
                  ${(it.price * it.qty).toFixed(2)}
                </span>
              </li>
            ))}
          </ul>

          <div className="flex items-center justify-between rounded-xl bg-[#F7EDE2] px-4 py-3">
            <span className="text-xs uppercase tracking-[0.2em] text-[#3D405B]">Total</span>
            <span className="font-serif-display text-2xl text-[#3D405B]">
              ${total.toFixed(2)}
            </span>
          </div>

          <div className="rounded-xl bg-white border border-[#EFE9E1] overflow-hidden">
            <button
              type="button"
              data-testid="toggle-delivery-button"
              onClick={() => setShowDelivery((s) => !s)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#F7EDE2]/50 transition-colors"
            >
              <span className="flex items-center gap-2 text-sm text-[#3D405B]">
                <MapPin className="w-4 h-4 text-[#84A59D]" />
                Agregar delivery (dirección y teléfono)
              </span>
              <ChevronDown className={`w-4 h-4 text-[#8D99AE] transition-transform ${showDelivery ? "rotate-180" : ""}`} />
            </button>
            {showDelivery && (
              <div className="px-4 pb-4 pt-1 space-y-3 border-t border-[#EFE9E1]">
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-[0.2em] text-[#84A59D] flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> Dirección
                  </label>
                  <Input
                    data-testid="delivery-address-input"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Ej. Av. Bolívar 123, Caracas"
                    className="rounded-lg border-[#EFE9E1]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-[0.2em] text-[#84A59D] flex items-center gap-1">
                    <Phone className="w-3 h-3" /> Teléfono
                  </label>
                  <Input
                    data-testid="delivery-phone-input"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Ej. +58 414 1234567"
                    className="rounded-lg border-[#EFE9E1]"
                  />
                </div>
              </div>
            )}
          </div>

          <label className="flex items-start gap-3 rounded-xl bg-white border border-[#EFE9E1] px-4 py-3 cursor-pointer">
            <input
              type="checkbox"
              data-testid="verify-confirm-checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="mt-1 h-4 w-4 accent-[#84A59D]"
            />
            <span className="text-sm text-[#3D405B]">
              <CheckCircle2 className="inline w-4 h-4 mr-1 text-[#84A59D]" />
              Confirmo que la lista de productos es correcta.
            </span>
          </label>
        </div>

        <div className="border-t border-[#EFE9E1] px-6 py-4 flex gap-2 bg-white shrink-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="rounded-full border-[#EFE9E1]"
            data-testid="checkout-cancel-button"
          >
            Cancelar
          </Button>
          <Button
            data-testid="checkout-whatsapp-button"
            disabled={!confirmed || items.length === 0}
            onClick={sendWhatsapp}
            className="flex-1 rounded-full h-11 bg-[#25D366] hover:bg-[#1EBE58] text-white gap-2"
          >
            <MessageCircle className="w-4 h-4" />
            Enviar por WhatsApp
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
