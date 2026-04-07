"use client";

import { useEffect, useRef, useState } from "react";
import SignaturePad from "signature_pad";
import { Button } from "./ui/button";

export function SignatureCanvas({
  onChange
}: {
  onChange?: (value: string | null) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const padRef = useRef<SignaturePad | null>(null);
  const [empty, setEmpty] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;
    const ctx = canvas.getContext("2d");
    if (ctx) ctx.scale(ratio, ratio);
    const pad = new SignaturePad(canvas, {
      backgroundColor: "rgb(255,255,255)"
    });
    padRef.current = pad;
    const update = () => {
      const dataUrl = pad.isEmpty() ? null : pad.toDataURL("image/png");
      setEmpty(pad.isEmpty());
      onChange?.(dataUrl);
    };
    pad.addEventListener("endStroke", update);
    return () => {
      pad.removeEventListener("endStroke", update);
      pad.off();
    };
  }, [onChange]);

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-dashed border-border bg-white p-3">
        <canvas ref={canvasRef} className="h-56 w-full rounded-xl bg-white" />
      </div>
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            padRef.current?.clear();
            setEmpty(true);
            onChange?.(null);
          }}
        >
          清除重簽
        </Button>
        <span className="text-sm text-muted-foreground">{empty ? "請在簽名板上親簽。" : "已完成簽名，可送出。"}</span>
      </div>
    </div>
  );
}
