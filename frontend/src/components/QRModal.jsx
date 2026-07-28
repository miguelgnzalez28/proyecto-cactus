import React, { useMemo } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../components/ui/dialog";
import { Button } from "../components/ui/button";
import { Copy, Download } from "lucide-react";
import { toast } from "sonner";

export default function QRModal({ open, onOpenChange }) {
  const url = useMemo(() => (typeof window !== "undefined" ? window.location.origin : ""), []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copiado");
    } catch {
      toast.error("No se pudo copiar el link");
    }
  };

  const download = () => {
    const canvas = document.querySelector("#cactus-qr-canvas");
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = "cactus-qr.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="qr-modal" className="max-w-sm bg-white border-[#EFE9E1]">
        <DialogHeader>
          <DialogTitle className="font-serif-display text-2xl text-[#3D405B]">
            Compartir tienda
          </DialogTitle>
          <DialogDescription className="text-[#8D99AE]">
            Escanea el código QR para abrir el catálogo cactus.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-2">
          <div className="p-4 bg-[#F7EDE2] rounded-2xl">
            <QRCodeCanvas
              id="cactus-qr-canvas"
              value={url}
              size={220}
              bgColor="#F7EDE2"
              fgColor="#3D405B"
              level="H"
            />
          </div>
          <p
            data-testid="qr-url-text"
            className="text-xs font-mono text-[#8D99AE] break-all text-center max-w-full"
          >
            {url}
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            data-testid="qr-copy-button"
            variant="outline"
            onClick={copy}
            className="flex-1 rounded-full border-[#EFE9E1] gap-2"
          >
            <Copy className="w-4 h-4" /> Copiar link
          </Button>
          <Button
            data-testid="qr-download-button"
            onClick={download}
            className="flex-1 rounded-full bg-[#3D405B] hover:bg-[#2E3149] text-white gap-2"
          >
            <Download className="w-4 h-4" /> Descargar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
