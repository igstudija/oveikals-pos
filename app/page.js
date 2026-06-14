'use client';

import { useEffect, useRef, useState } from 'react';

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? '/pos';

export default function Slideshow() {
  const [slides, setSlides] = useState(null);
  const [intervalSec, setIntervalSec] = useState(7);
  const [index, setIndex] = useState(0);
  const timer = useRef(null);

  // Load slides, and refresh every 60s so screens pick up admin changes
  async function load() {
    try {
      const res = await fetch(`${BASE}/api/slides`, { cache: 'no-store' });
      const data = await res.json();
      setSlides(data.slides || []);
      if (data.intervalSec) setIntervalSec(data.intervalSec);
    } catch {
      setSlides([]);
    }
  }

  useEffect(() => {
    load();
    const refresh = setInterval(load, 60000);
    return () => clearInterval(refresh);
  }, []);

  // Advance the active slide
  useEffect(() => {
    if (!slides || slides.length <= 1) return;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, intervalSec * 1000);
    return () => clearTimeout(timer.current);
  }, [index, slides, intervalSec]);

  // Keep index in range if slide count shrinks
  useEffect(() => {
    if (slides && index >= slides.length) setIndex(0);
  }, [slides, index]);

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  }

  if (slides === null) {
    return <div className="show" />;
  }

  if (slides.length === 0) {
    return (
      <div className="show">
        <div className="show__empty">
          Nav neviena slaida. Pievieno tos admin panelī:{' '}
          <br />
          <strong>{BASE}/admin</strong>
        </div>
      </div>
    );
  }

  return (
    <div className="show" onClick={toggleFullscreen}>
      {slides.map((s, i) => (
        <div key={s.id} className={`show__slide ${i === index ? 'is-active' : ''}`}>
          {s.imageId && (
            <img
              src={`${BASE}/api/image/${s.imageId}`}
              alt={s.name || ''}
              draggable={false}
            />
          )}
        </div>
      ))}
    </div>
  );
}
