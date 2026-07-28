import React, { useState } from "react";
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "../components/ui/sheet";
import { Button } from "../components/ui/button";
import { useCart } from "../context/CartContext";
import { fileUrl } from "../lib/api";
import CheckoutModal from "./CheckoutModal";

export default function CartDrawer({ open, onOpenChange }) {
  const { items, setQty, removeItem, total, count } = useCart();
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md p-0 flex flex-col bg-[#FEF7F5]"
        data-testid="cart-drawer"
      >
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-[#F4DBD8]">
          <SheetTitle className="font-serif-display text-2xl text-[#3D2A3A]">
            Tu carrito
          </SheetTitle>
          <SheetDescription className="text-xs uppercase tracking-[0.2em] text-[#D48A94]">
            {count} {count === 1 ? "producto" : "productos"}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center gap-4 py-16">
              <div className="w-16 h-16 rounded-full bg-[#FCE4E2] flex items-center justify-center">
                <ShoppingBag className="w-6 h-6 text-[#D48A94]" />
              </div>
              <p className="text-[#A38999] text-sm">Aún no tienes productos</p>
            </div>
          ) : (
            <ul className="space-y-4" data-testid="cart-items-list">
              {items.map((it) => (
                <li
                  key={it.id}
                  className="flex gap-4 rounded-xl bg-white p-3 border border-[#F4DBD8]"
                  data-testid={`cart-item-${it.code}`}
                >
                  <img
                    src={fileUrl(it.image_path)}
                    alt={it.name}
                    className="w-20 h-20 object-cover rounded-lg bg-[#FCE4E2]"
                  />
                  <div className="flex-1 flex flex-col gap-1">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-serif-display text-lg text-[#3D2A3A] leading-tight">
                          {it.name}
                        </h4>
                        <p className="text-[10px] font-mono text-[#A38999] tracking-wider">
                          {it.code}
                        </p>
                      </div>
                      <button
                        data-testid={`remove-item-${it.code}`}
                        onClick={() => removeItem(it.id)}
                        className="text-[#A38999] hover:text-[#E5646A] transition-colors"
                        aria-label="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="mt-auto flex items-center justify-between">
                      <div className="inline-flex items-center gap-1 rounded-full border border-[#F4DBD8] bg-white">
                        <button
                          data-testid={`decrease-qty-${it.code}`}
                          onClick={() => setQty(it.id, it.qty - 1)}
                          className="h-8 w-8 flex items-center justify-center text-[#3D2A3A] hover:bg-[#FCE4E2] rounded-l-full"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="min-w-[24px] text-center text-sm">{it.qty}</span>
                        <button
                          data-testid={`increase-qty-${it.code}`}
                          onClick={() => setQty(it.id, it.qty + 1)}
                          className="h-8 w-8 flex items-center justify-center text-[#3D2A3A] hover:bg-[#FCE4E2] rounded-r-full"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <span className="font-serif-display text-lg text-[#D48A94]">
                        ${(it.price * it.qty).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border-t border-[#F4DBD8] px-6 py-5 bg-white">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs uppercase tracking-[0.2em] text-[#D48A94]">Total</span>
            <span
              data-testid="cart-total"
              className="font-serif-display text-3xl text-[#3D2A3A]"
            >
              ${total.toFixed(2)}
            </span>
          </div>
          <Button
            data-testid="checkout-open-button"
            disabled={items.length === 0}
            onClick={() => setCheckoutOpen(true)}
            className="w-full h-12 rounded-full bg-[#D48A94] hover:bg-[#B37380] text-white text-sm tracking-wide gap-2"
          >
            Finalizar compra <ArrowRight className="w-4 h-4" />
          </Button>
        </div>

        <CheckoutModal
          open={checkoutOpen}
          onOpenChange={setCheckoutOpen}
          onCompleted={() => onOpenChange(false)}
        />
      </SheetContent>
    </Sheet>
  );
}
