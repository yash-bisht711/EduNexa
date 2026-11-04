import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Eraser, Presentation, Trash2, X, Undo2 } from 'lucide-react';

const COLORS = ['#0f172a', '#6d5dfc', '#e11d48', '#f59e0b', '#059669', '#0ea5e9'];
const SIZES = [3, 6, 12];

// Collaborative whiteboard: strokes are normalised (0..1) so every peer redraws
// the same board at its own size. Partials are streamed while drawing.
export default function WhiteboardBoard({ socket, isHost, onClose }) {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const strokesRef = useRef([]);
  const drawingRef = useRef(null);
  const [color, setColor] = useState(COLORS[0]);
  const [size, setSize] = useState(6);
  const [erase, setErase] = useState(false);
  const [count, setCount] = useState(0);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const d = drawingRef.current;
    const live = d ? [{ points: d.points, color: d.color, size: d.size, erase: d.erase }] : [];
    for (const s of [...strokesRef.current, ...live]) {
      ctx.globalCompositeOperation = s.erase ? 'destination-out' : 'source-over';
      ctx.strokeStyle = s.erase ? 'rgba(0,0,0,1)' : s.color;
      ctx.lineWidth = (s.erase ? s.size * 3 : s.size) * (canvas.width / 1000);
      ctx.beginPath();
      s.points.forEach(([x, y], i) => {
        const px = x * canvas.width;
        const py = y * canvas.height;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const fit = () => {
      const rect = wrap.getBoundingClientRect();
      canvas.width = Math.max(320, Math.floor(rect.width));
      canvas.height = Math.max(200, Math.floor(rect.height));
      redraw();
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [redraw]);

  useEffect(() => {
    if (!socket) return;
    const onStroke = ({ stroke }) => {
      strokesRef.current.push(stroke);
      if (strokesRef.current.length > 400) strokesRef.current.shift();
      setCount(strokesRef.current.length);
      redraw();
    };
    const onClear = () => { strokesRef.current = []; setCount(0); redraw(); };
    const onSync = ({ strokes }) => { strokesRef.current = strokes || []; setCount(strokesRef.current.length); redraw(); };
    socket.on('wb:stroke', onStroke);
    socket.on('wb:clear', onClear);
    socket.on('wb:strokes', onSync);
    socket.emit('wb:sync', {});
    return () => {
      socket.off('wb:stroke', onStroke);
      socket.off('wb:clear', onClear);
      socket.off('wb:strokes', onSync);
    };
  }, [socket, redraw]);

  const norm = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return [
      Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)),
      Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height)),
    ];
  };

  const flush = (done) => {
    const d = drawingRef.current;
    if (!d) return;
    const rest = d.points.slice(Math.max(0, d.sent - 1));
    if (rest.length < 2) { if (done) drawingRef.current = null; return; }
    socket?.emit('wb:stroke', { stroke: { points: rest, color: d.color, size: d.size, erase: d.erase } });
    d.sent = d.points.length;
    if (done) drawingRef.current = null;
  };

  const down = (e) => {
    e.currentTarget.setPointerCapture?.(e.pointerId);
    drawingRef.current = { points: [norm(e)], sent: 1, color, size, erase };
  };
  const move = (e) => {
    const d = drawingRef.current;
    if (!d) return;
    d.points.push(norm(e));
    redraw();
    if (d.points.length - d.sent >= 7) flush(false);
  };
  const up = () => flush(true);

  const undo = () => {
    strokesRef.current = strokesRef.current.slice(0, -1);
    setCount(strokesRef.current.length);
    redraw();
  };

  return (
    <div className="live-board">
      <div className="live-board-bar">
        <span className="flex items-center gap-2 font-black text-[12px] text-white">
          <Presentation size={14} className="text-[#8b7dff]" /> Shared whiteboard
          <em className="not-italic text-[10px] font-semibold text-slate-500">{count} strokes · live for everyone</em>
        </span>
        <div className="flex items-center gap-1.5 flex-wrap">
          {COLORS.map((c) => (
            <button key={c} type="button" className={`live-board-dot ${color === c && !erase ? 'active' : ''}`} style={{ background: c }} onClick={() => { setColor(c); setErase(false); }} title={c} />
          ))}
          {SIZES.map((s) => (
            <button key={s} type="button" className={`live-board-size ${size === s ? 'active' : ''}`} onClick={() => setSize(s)} title={`Pen ${s}px`}>
              <i style={{ width: s + 2, height: s + 2 }} />
            </button>
          ))}
          <button type="button" className={`live-board-tool ${erase ? 'active' : ''}`} onClick={() => setErase((v) => !v)} title="Eraser"><Eraser size={14} /></button>
          <button type="button" className="live-board-tool" onClick={undo} title="Undo last stroke"><Undo2 size={14} /></button>
          {isHost && (
            <button type="button" className="live-board-tool" onClick={() => socket?.emit('wb:clear', {})} title="Clear board for everyone"><Trash2 size={14} /></button>
          )}
          <button type="button" className="live-board-tool" onClick={onClose} title="Close whiteboard"><X size={14} /></button>
        </div>
      </div>
      <div className="live-board-wrap" ref={wrapRef}>
        <canvas
          ref={canvasRef}
          className="live-board-canvas"
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerLeave={up}
        />
      </div>
    </div>
  );
}
