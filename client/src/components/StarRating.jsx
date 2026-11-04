import React, { useState } from 'react';
import { Star } from 'lucide-react';

/**
 * StarRating component
 * Props:
 *  - value: number (current rating, 0-5, supports decimals for read-only)
 *  - onChange: function(newValue) — if provided, component is interactive
 *  - readOnly: boolean — force read-only even if onChange provided
 *  - size: number — icon size (default 18)
 *  - className: string — extra classes on wrapper
 */
export function StarRating({ value = 0, onChange, readOnly = false, size = 18, className = '' }) {
  const [hovered, setHovered] = useState(null);
  const interactive = !readOnly && typeof onChange === 'function';
  const display = interactive ? (hovered ?? value) : value;

  return (
    <div
      className={`flex items-center gap-0.5 ${className}`}
      onMouseLeave={() => interactive && setHovered(null)}
    >
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = display >= star;
        const half = !filled && display >= star - 0.5;
        return (
          <button
            key={star}
            type="button"
            disabled={!interactive}
            onClick={() => interactive && onChange(star)}
            onMouseEnter={() => interactive && setHovered(star)}
            className={`relative leading-none disabled:cursor-default ${
              interactive ? 'cursor-pointer hover:scale-110 transition-transform' : ''
            }`}
            aria-label={`${star} star${star !== 1 ? 's' : ''}`}
          >
            {/* background (empty) star */}
            <Star
              size={size}
              className="text-slate-200"
              fill="currentColor"
            />
            {/* filled overlay */}
            {(filled || half) && (
              <span
                className="absolute inset-0 overflow-hidden"
                style={{ width: filled ? '100%' : '50%' }}
              >
                <Star
                  size={size}
                  className="text-amber-400"
                  fill="currentColor"
                />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
