import React from 'react';

const CONFETTI_PIECES = Array.from({ length: 28 }).map((_, idx) => ({
  id: idx,
  left: `${(idx * 3.7) % 100}%`,
  delay: `${(idx % 7) * 0.22}s`,
  duration: `${2.6 + (idx % 5) * 0.45}s`,
  color: ['#FFE9B0', '#E07030', '#38B6FF', '#75B843', '#F472B6', '#FACC15'][idx % 6],
  size: idx % 2 === 0 ? 'w-3 h-3 rounded-full' : 'w-2.5 h-4 rounded-xs rotate-45',
}));

export default function ConfettiEffect() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 overflow-hidden z-20"
    >
      <style>{`
        @keyframes bukunaConfettiFall {
          0% {
            transform: translateY(-20px) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(95vh) rotate(360deg);
            opacity: 0;
          }
        }
      `}</style>
      {CONFETTI_PIECES.map((piece) => (
        <span
          key={piece.id}
          className={`Absolute top-0 ${piece.size}`}
          style={{
            position: 'absolute',
            left: piece.left,
            top: '-16px',
            backgroundColor: piece.color,
            animation: `bukunaConfettiFall ${piece.duration} ease-in-out ${piece.delay} infinite`,
          }}
        />
      ))}
    </div>
  );
}

