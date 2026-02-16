/**
 * Subtle background particles — floating stars/dots.
 */
export function initParticles(container) {
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:fixed;inset:0;z-index:0;pointer-events:none;opacity:0.3;';
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  container.prepend(canvas);

  const ctx = canvas.getContext('2d');
  const particles = [];

  for (let i = 0; i < 40; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: 0.5 + Math.random() * 1.5,
      vx: (Math.random() - 0.5) * 0.3,
      vy: -0.1 - Math.random() * 0.3,
      opacity: 0.3 + Math.random() * 0.7,
    });
  }

  let animFrame;

  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;

      // Wrap around
      if (p.y < -10) p.y = canvas.height + 10;
      if (p.x < -10) p.x = canvas.width + 10;
      if (p.x > canvas.width + 10) p.x = -10;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(0, 240, 255, ${p.opacity * 0.5})`;
      ctx.fill();
    }

    animFrame = requestAnimationFrame(animate);
  }

  animate();

  // Handle resize
  const onResize = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  };
  window.addEventListener('resize', onResize);

  return () => {
    cancelAnimationFrame(animFrame);
    window.removeEventListener('resize', onResize);
    canvas.remove();
  };
}
