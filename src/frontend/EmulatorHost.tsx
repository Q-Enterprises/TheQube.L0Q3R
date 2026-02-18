import React, { useEffect, useRef } from "react";
import { Emulator } from "../emulator/Emulator";

export const EmulatorHost: React.FC<{ romData: Uint8Array }> = ({ romData }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const emulatorRef = useRef<Emulator | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    const emulator = new Emulator((frame) => {
      const imageData = ctx.createImageData(frame.width, frame.height);
      const buffer = new Uint32Array(imageData.data.buffer);
      buffer.set(frame.pixels);
      ctx.putImageData(imageData, 0, 0);
    });

    emulator.loadROM(romData);
    emulator.start();
    emulatorRef.current = emulator;

    return () => {
      emulator.stop();
    };
  }, [romData]);

  return (
    <canvas
      ref={canvasRef}
      width={256}
      height={240}
      style={{ imageRendering: "pixelated", border: "1px solid #ccc" }}
    />
  );
};
