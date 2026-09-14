"use client";

import React, { useRef, useState } from "react";
import { QRCodeSVG, QRCodeCanvas } from "qrcode.react";

interface QRCodeCardProps {
  url: string;
  recipientName: string;
  slug: string;
}

export const QRCodeCard: React.FC<QRCodeCardProps> = ({ url, recipientName, slug }) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleDownload = () => {
    try {
      setIsDownloading(true);
      const canvas = canvasRef.current;
      if (!canvas) return;

      const pngUrl = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.href = pngUrl;
      downloadLink.download = `wishlight-gift-${slug || "birthday"}.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    } catch (err) {
      console.error("Failed to download QR code:", err);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="rounded-xl border border-amber-500/20 bg-stone-900/60 p-6 backdrop-blur-md flex flex-col items-center justify-center text-center shadow-xl">
      <div className="text-xs uppercase tracking-widest text-amber-300/70 font-semibold mb-3">
        Printable & Scannable Gift QR
      </div>

      {/* Visible SVG QR Code */}
      <div
        className="p-4 bg-white rounded-lg shadow-inner flex items-center justify-center border border-stone-300"
        role="img"
        aria-label={`QR Code link for ${recipientName}`}
      >
        <QRCodeSVG
          value={url}
          size={180}
          level="M"
          includeMargin={false}
          fgColor="#121212"
          bgColor="#FFFFFF"
        />
      </div>

      {/* Hidden Offscreen Canvas for High-Res PNG Download */}
      <div className="hidden" aria-hidden="true">
        <QRCodeCanvas
          ref={canvasRef}
          value={url}
          size={1024}
          level="H"
          includeMargin={true}
          fgColor="#121212"
          bgColor="#FFFFFF"
        />
      </div>

      <p className="text-xs text-stone-400 mt-4 max-w-xs leading-relaxed">
        Scan with any mobile camera to immediately open {recipientName}&apos;s locked cover scene.
      </p>

      <button
        onClick={handleDownload}
        disabled={isDownloading}
        className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-xs uppercase tracking-wider font-semibold rounded-md border border-amber-500/40 bg-stone-800 hover:bg-stone-700 text-amber-200 transition-all focus:outline-none focus:ring-2 focus:ring-amber-400"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        {isDownloading ? "Downloading..." : "Download High-Res QR Code"}
      </button>
    </div>
  );
};
