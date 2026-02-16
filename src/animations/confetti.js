/**
 * Confetti animation using Canvas.
 */

const COLORS = ['#00f0ff', '#ff00e5', '#39ff14', '#ffd700', '#ff6b35', '#ff1744'];

export function launchConfetti(container, duration = 3000) {
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:fixed;inset:0;z-index:9999;pointer-events:none;';
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  container.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  const particles = [];
  const startTime = performance.now();

  // Create particles
  for (let i = 0; i < 120; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: -20 - Math.random() * 100,
      w: 4 + Math.random() * 6,
      h: 8 + Math.random() * 10,
      vx: (Math.random() - 0.5) * 4,
      vy: 2 + Math.random() * 4,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.2,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      opacity: 1,
    });
  }

  function animate(now) {
    const elapsed = now - startTime;
    if (elapsed > duration) {
      canvas.remove();
      return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const fadeStart = duration * 0.7;
    const globalOpacity = elapsed > fadeStart
      ? 1 - (elapsed - fadeStart) / (duration - fadeStart)
      : 1;

    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.05; // gravity
      p.rotation += p.rotationSpeed;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.globalAlpha = globalOpacity * p.opacity;
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }

    requestAnimationFrame(animate);
  }

  requestAnimationFrame(animate);
}
