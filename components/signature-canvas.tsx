"use client";

import { useEffect, useRef, useState } from "react";
import SignaturePad from "signature_pad";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";

type Props = {
  onChange?: (value: string | null) => void;
  className?: string;
  canvasClassName?: string;
};

export function SignatureCanvas({ onChange, className, canvasClassName }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const padRef = useRef<SignaturePad | null>(null);
  const [empty, setEmpty] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const pad = new SignaturePad(canvas, {
      backgroundColor: "rgb(255,255,255)"
    });
    padRef.current = pad;

    const update = () => {
      const dataUrl = pad.isEmpty() ? null : pad.toDataURL("image/png");
      setEmpty(pad.isEmpty());
      onChange?.(dataUrl);
    };

    const resizeCanvas = () => {
      const previous = pad.isEmpty() ? null : pad.toDataURL("image/png");
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * ratio;
      canvas.height = rect.height * ratio;
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      pad.clear();
      if (previous) {
        pad.fromDataURL(previous);
        setEmpty(false);
        onChange?.(previous);
      } else {
        setEmpty(true);
        onChange?.(null);
      }
    };

    resizeCanvas();
    pad.addEventListener("endStroke", update);
    window.addEventListener("resize", resizeCanvas);

    return () => {
      pad.removeEventListener("endStroke", update);
      window.removeEventListener("resize", resizeCanvas);
      pad.off();
    };
  }, [onChange]);

  return (
    <div className={cn("space-y-3", className)}>
      <div className="rounded-2xl border border-dashed border-border bg-white p-3">
        <canvas ref={canvasRef} className={cn("h-64 w-full touch-none rounded-xl bg-white", canvasClassName)} />
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
