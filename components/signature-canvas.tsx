"use client";

import { useEffect, useRef, useState } from "react";
import SignaturePad from "signature_pad";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";

type Props = {
  onChange?: (value: string | null) => void;
  onConfirm?: (value: string) => void | Promise<void>;
  className?: string;
  canvasClassName?: string;
  confirmLabel?: string;
};

export function SignatureCanvas({ onChange, onConfirm, className, canvasClassName, confirmLabel = "確認簽名" }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const padRef = useRef<SignaturePad | null>(null);
  const onChangeRef = useRef<Props["onChange"]>(onChange);
  const [empty, setEmpty] = useState(true);
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const pad = new SignaturePad(canvas, {
      backgroundColor: "rgb(255,255,255)"
    });
    padRef.current = pad;

    const update = () => {
      const nextDataUrl = pad.isEmpty() ? null : pad.toDataURL("image/png");
      setEmpty(pad.isEmpty());
      setDataUrl(nextDataUrl);
      onChangeRef.current?.(nextDataUrl);
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
        setDataUrl(previous);
        onChangeRef.current?.(previous);
      } else {
        setEmpty(true);
        setDataUrl(null);
        onChangeRef.current?.(null);
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
  }, []);

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
            setDataUrl(null);
            onChangeRef.current?.(null);
          }}
        >
          清除簽名
        </Button>
        <Button
          type="button"
          onClick={async () => {
            if (!dataUrl || confirming) return;
            try {
              setConfirming(true);
              await Promise.resolve(onConfirm?.(dataUrl));
            } finally {
              setConfirming(false);
            }
          }}
          disabled={empty || !dataUrl || confirming}
        >
          {confirming ? "處理中..." : confirmLabel}
        </Button>
        <span className="text-sm text-muted-foreground">{confirming ? "簽名確認中，請稍候..." : empty ? "請在簽名板上親簽。" : "已完成簽名，可按確認簽名。"}</span>
      </div>
    </div>
  );
}
