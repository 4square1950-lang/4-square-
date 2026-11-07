import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Palette, Copy, Check } from 'lucide-react';

interface ColorWheelPickerProps {
  color: string; // e.g. '#2563EB'
  onChange: (hex: string) => void;
  label?: string;
  presetSwatches?: string[];
}

// Color conversion helpers
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    clean = clean.split('').map((c) => c + c).join('');
  }
  const num = parseInt(clean, 16);
  if (isNaN(num)) return { r: 37, g: 99, b: 235 };
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  const hexR = clamp(r).toString(16).padStart(2, '0');
  const hexG = clamp(g).toString(16).padStart(2, '0');
  const hexB = clamp(b).toString(16).padStart(2, '0');
  return `#${hexR}${hexG}${hexB}`.toUpperCase();
}

function rgbToHsv(r: number, g: number, b: number): { h: number; s: number; v: number } {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const diff = max - min;

  let h = 0;
  if (diff !== 0) {
    if (max === r) {
      h = ((g - b) / diff) % 6;
    } else if (max === g) {
      h = (b - r) / diff + 2;
    } else {
      h = (r - g) / diff + 4;
    }
    h = Math.round(h * 60);
    if (h < 0) h += 360;
  }

  const s = max === 0 ? 0 : diff / max;
  const v = max;
  return { h, s, v };
}

function hsvToRgb(h: number, s: number, v: number): { r: number; g: number; b: number } {
  h = ((h % 360) + 360) % 360;
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;

  let rPrime = 0, gPrime = 0, bPrime = 0;
  if (h >= 0 && h < 60) {
    rPrime = c; gPrime = x; bPrime = 0;
  } else if (h >= 60 && h < 120) {
    rPrime = x; gPrime = c; bPrime = 0;
  } else if (h >= 120 && h < 180) {
    rPrime = 0; gPrime = c; bPrime = x;
  } else if (h >= 180 && h < 240) {
    rPrime = 0; gPrime = x; bPrime = c;
  } else if (h >= 240 && h < 300) {
    rPrime = x; gPrime = 0; bPrime = c;
  } else {
    rPrime = c; gPrime = 0; bPrime = x;
  }

  return {
    r: Math.round((rPrime + m) * 255),
    g: Math.round((gPrime + m) * 255),
    b: Math.round((bPrime + m) * 255),
  };
}

export const ColorWheelPicker: React.FC<ColorWheelPickerProps> = ({
  color,
  onChange,
  label = 'Custom Color',
  presetSwatches = [
    '#2563EB', '#EF4444', '#F59E0B', '#10B981', '#06B6D4',
    '#8B5CF6', '#EC4899', '#F97316', '#FACC15', '#0F172A',
    '#64748B', '#F8FAFC', '#F2D6B3', '#D4A373', '#78350F'
  ],
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDraggingWheel = useRef(false);
  const [copied, setCopied] = useState(false);

  // Parse initial color
  const rgb = hexToRgb(color);
  const initialHsv = rgbToHsv(rgb.r, rgb.g, rgb.b);

  const [hsv, setHsv] = useState<{ h: number; s: number; v: number }>(initialHsv);
  const [hexInput, setHexInput] = useState<string>(color.toUpperCase());
  const [rInput, setRInput] = useState<number>(rgb.r);
  const [gInput, setGInput] = useState<number>(rgb.g);
  const [bInput, setBInput] = useState<number>(rgb.b);
  const [decInput, setDecInput] = useState<string>(
    parseInt(color.replace('#', ''), 16).toString()
  );

  // Sync state if external color changes
  useEffect(() => {
    const currentRgb = hexToRgb(color);
    const newHsv = rgbToHsv(currentRgb.r, currentRgb.g, currentRgb.b);
    setHsv(newHsv);
    setHexInput(color.toUpperCase());
    setRInput(currentRgb.r);
    setGInput(currentRgb.g);
    setBInput(currentRgb.b);
    const decVal = parseInt(color.replace('#', ''), 16);
    if (!isNaN(decVal)) setDecInput(decVal.toString());
  }, [color]);

  // Draw Color Wheel Canvas
  const drawWheel = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = canvas.width;
    const center = size / 2;
    const radius = center - 8;

    ctx.clearRect(0, 0, size, size);

    // Draw Wheel using radial slices
    const step = 1;
    for (let angle = 0; angle < 360; angle += step) {
      const radStart = ((angle - 1) * Math.PI) / 180;
      const radEnd = ((angle + step + 1) * Math.PI) / 180;

      const grad = ctx.createRadialGradient(center, center, 0, center, center, radius);
      const rgbPure = hsvToRgb(angle, 1, hsv.v);
      const rgbCenter = hsvToRgb(angle, 0, hsv.v);

      grad.addColorStop(0, `rgb(${rgbCenter.r}, ${rgbCenter.g}, ${rgbCenter.b})`);
      grad.addColorStop(1, `rgb(${rgbPure.r}, ${rgbPure.g}, ${rgbPure.b})`);

      ctx.beginPath();
      ctx.moveTo(center, center);
      ctx.arc(center, center, radius, radStart, radEnd);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();
    }

    // Outer border
    ctx.beginPath();
    ctx.arc(center, center, radius, 0, Math.PI * 2);
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw Thumb for current (H, S)
    const currentAngleRad = (hsv.h * Math.PI) / 180;
    const currentDist = hsv.s * radius;
    const thumbX = center + currentDist * Math.cos(currentAngleRad);
    const thumbY = center + currentDist * Math.sin(currentAngleRad);

    // Outer ring
    ctx.beginPath();
    ctx.arc(thumbX, thumbY, 8, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 4;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#09090b';
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Inner preview dot
    ctx.beginPath();
    ctx.arc(thumbX, thumbY, 5, 0, Math.PI * 2);
    const currentRgb = hsvToRgb(hsv.h, hsv.s, hsv.v);
    ctx.fillStyle = `rgb(${currentRgb.r}, ${currentRgb.g}, ${currentRgb.b})`;
    ctx.fill();
  }, [hsv]);

  useEffect(() => {
    drawWheel();
  }, [drawWheel]);

  // Handle Wheel Interaction
  const handleWheelPointer = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const size = rect.width;
    const center = size / 2;
    const radius = center - 8;

    const dx = x - center;
    const dy = y - center;
    const dist = Math.hypot(dx, dy);

    let angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
    if (angleDeg < 0) angleDeg += 360;

    const sat = Math.min(1.0, Math.max(0, dist / radius));
    const newHsv = { ...hsv, h: angleDeg, s: sat };
    setHsv(newHsv);

    const newRgb = hsvToRgb(newHsv.h, newHsv.s, newHsv.v);
    const newHex = rgbToHex(newRgb.r, newRgb.g, newRgb.b);
    setHexInput(newHex);
    setRInput(newRgb.r);
    setGInput(newRgb.g);
    setBInput(newRgb.b);
    setDecInput(parseInt(newHex.replace('#', ''), 16).toString());
    onChange(newHex);
  };

  // Brightness / Value slider change
  const handleBrightnessChange = (vVal: number) => {
    const newHsv = { ...hsv, v: vVal };
    setHsv(newHsv);
    const newRgb = hsvToRgb(newHsv.h, newHsv.s, newHsv.v);
    const newHex = rgbToHex(newRgb.r, newRgb.g, newRgb.b);
    setHexInput(newHex);
    setRInput(newRgb.r);
    setGInput(newRgb.g);
    setBInput(newRgb.b);
    setDecInput(parseInt(newHex.replace('#', ''), 16).toString());
    onChange(newHex);
  };

  // Hex Text Change
  const handleHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;
    if (!val.startsWith('#')) val = '#' + val;
    setHexInput(val.toUpperCase());

    const clean = val.replace('#', '');
    if (clean.length === 6 && /^[0-9A-Fa-f]{6}$/.test(clean)) {
      const newRgb = hexToRgb(val);
      const newHsv = rgbToHsv(newRgb.r, newRgb.g, newRgb.b);
      setHsv(newHsv);
      setRInput(newRgb.r);
      setGInput(newRgb.g);
      setBInput(newRgb.b);
      setDecInput(parseInt(clean, 16).toString());
      onChange(val.toUpperCase());
    }
  };

  // RGB Decimal Component Change
  const handleRgbChange = (r: number, g: number, b: number) => {
    const clamp = (v: number) => Math.max(0, Math.min(255, isNaN(v) ? 0 : v));
    const cr = clamp(r);
    const cg = clamp(g);
    const cb = clamp(b);
    setRInput(cr);
    setGInput(cg);
    setBInput(cb);

    const newHex = rgbToHex(cr, cg, cb);
    setHexInput(newHex);
    setDecInput(parseInt(newHex.replace('#', ''), 16).toString());
    const newHsv = rgbToHsv(cr, cg, cb);
    setHsv(newHsv);
    onChange(newHex);
  };

  // Decimal Integer Input Change
  const handleDecChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '');
    setDecInput(val);
    const num = parseInt(val, 10);
    if (!isNaN(num) && num >= 0 && num <= 16777215) {
      const newHex = '#' + num.toString(16).padStart(6, '0').toUpperCase();
      setHexInput(newHex);
      const newRgb = hexToRgb(newHex);
      setRInput(newRgb.r);
      setGInput(newRgb.g);
      setBInput(newRgb.b);
      const newHsv = rgbToHsv(newRgb.r, newRgb.g, newRgb.b);
      setHsv(newHsv);
      onChange(newHex);
    }
  };

  const handleCopyHex = () => {
    navigator.clipboard.writeText(hexInput);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="bg-slate-900/90 border border-slate-700/80 rounded-2xl p-4 shadow-xl">
      {/* Header with color swatch preview */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg shadow-inner border border-white/20 transition-transform active:scale-95"
            style={{ backgroundColor: color }}
          />
          <div>
            <div className="text-xs font-black text-white uppercase tracking-wider">{label}</div>
            <div className="text-[10px] font-mono text-slate-400">{hexInput}</div>
          </div>
        </div>

        <button
          onClick={handleCopyHex}
          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[10px] font-mono transition-colors cursor-pointer"
        >
          {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>

      {/* Main Color Wheel and Controls */}
      <div className="flex flex-col sm:flex-row items-center gap-4">
        {/* Color Wheel Canvas */}
        <div className="relative shrink-0 flex items-center justify-center">
          <canvas
            ref={canvasRef}
            width={160}
            height={160}
            onPointerDown={(e) => {
              isDraggingWheel.current = true;
              (e.target as HTMLElement).setPointerCapture(e.pointerId);
              handleWheelPointer(e);
            }}
            onPointerMove={(e) => {
              if (isDraggingWheel.current) {
                handleWheelPointer(e);
              }
            }}
            onPointerUp={(e) => {
              isDraggingWheel.current = false;
              try {
                (e.target as HTMLElement).releasePointerCapture(e.pointerId);
              } catch {}
            }}
            className="w-40 h-40 cursor-crosshair rounded-full touch-none select-none shadow-md"
          />
        </div>

        {/* Sliders & Numeric Inputs */}
        <div className="flex-1 w-full space-y-3">
          {/* Brightness / Luminance Slider */}
          <div>
            <div className="flex justify-between text-[11px] font-bold text-slate-400 mb-1">
              <span>Luminance / Value</span>
              <span className="font-mono text-slate-300">{Math.round(hsv.v * 100)}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={hsv.v}
              onChange={(e) => handleBrightnessChange(parseFloat(e.target.value))}
              className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-gradient-to-r from-black via-slate-500 to-white"
            />
          </div>

          {/* Hex & Decimal Code Inputs */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-mono font-bold text-slate-400 uppercase mb-0.5">
                Hex Code
              </label>
              <input
                type="text"
                value={hexInput}
                onChange={handleHexChange}
                placeholder="#2563EB"
                maxLength={7}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 font-mono text-xs font-bold text-amber-300 focus:outline-none focus:border-amber-400 shadow-inner"
              />
            </div>

            <div>
              <label className="block text-[10px] font-mono font-bold text-slate-400 uppercase mb-0.5">
                Decimal Integer
              </label>
              <input
                type="text"
                value={decInput}
                onChange={handleDecChange}
                placeholder="2450411"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 font-mono text-xs font-bold text-cyan-300 focus:outline-none focus:border-cyan-400 shadow-inner"
              />
            </div>
          </div>

          {/* RGB Components */}
          <div>
            <label className="block text-[10px] font-mono font-bold text-slate-400 uppercase mb-0.5">
              RGB Channels (0-255)
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              <div className="flex items-center bg-slate-950 border border-red-900/50 rounded-lg px-2 py-1">
                <span className="text-[10px] font-black text-red-400 mr-1">R</span>
                <input
                  type="number"
                  min={0}
                  max={255}
                  value={rInput}
                  onChange={(e) => handleRgbChange(parseInt(e.target.value, 10), gInput, bInput)}
                  className="w-full bg-transparent font-mono text-xs text-white focus:outline-none"
                />
              </div>
              <div className="flex items-center bg-slate-950 border border-green-900/50 rounded-lg px-2 py-1">
                <span className="text-[10px] font-black text-green-400 mr-1">G</span>
                <input
                  type="number"
                  min={0}
                  max={255}
                  value={gInput}
                  onChange={(e) => handleRgbChange(rInput, parseInt(e.target.value, 10), bInput)}
                  className="w-full bg-transparent font-mono text-xs text-white focus:outline-none"
                />
              </div>
              <div className="flex items-center bg-slate-950 border border-blue-900/50 rounded-lg px-2 py-1">
                <span className="text-[10px] font-black text-blue-400 mr-1">B</span>
                <input
                  type="number"
                  min={0}
                  max={255}
                  value={bInput}
                  onChange={(e) => handleRgbChange(rInput, gInput, parseInt(e.target.value, 10))}
                  className="w-full bg-transparent font-mono text-xs text-white focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Swatches */}
      {presetSwatches && presetSwatches.length > 0 && (
        <div className="mt-3 pt-3 border-t border-slate-800">
          <div className="text-[10px] font-bold text-slate-400 uppercase mb-1.5">Quick Swatches</div>
          <div className="flex flex-wrap gap-1.5">
            {presetSwatches.map((swatch) => (
              <button
                key={swatch}
                onClick={() => {
                  setHexInput(swatch.toUpperCase());
                  const newRgb = hexToRgb(swatch);
                  setRInput(newRgb.r);
                  setGInput(newRgb.g);
                  setBInput(newRgb.b);
                  setDecInput(parseInt(swatch.replace('#', ''), 16).toString());
                  const newHsv = rgbToHsv(newRgb.r, newRgb.g, newRgb.b);
                  setHsv(newHsv);
                  onChange(swatch);
                }}
                className={`w-6 h-6 rounded-md border transition-transform hover:scale-110 active:scale-95 cursor-pointer ${
                  color.toUpperCase() === swatch.toUpperCase()
                    ? 'ring-2 ring-amber-400 border-white scale-110'
                    : 'border-slate-700/60'
                }`}
                style={{ backgroundColor: swatch }}
                title={swatch}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
