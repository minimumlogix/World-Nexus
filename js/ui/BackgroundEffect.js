/* js/ui/BackgroundEffect.js */
import { Device } from '../utils/Device.js';

class BackgroundEffect {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.particles = [];
    this.animationId = null;
    this.currentTheme = 'default';
    this.mouse = { x: null, y: null, radius: 150 };
    
    // Theme configuration schemes
    this.themeConfigs = {
      default: {
        count: 70,
        color: '212, 175, 55', // gold
        shape: 'circle',
        speed: 0.2,
        connectDist: 100,
        sizeRange: [1, 2.5],
        connectMouse: true
      },
      abyss: {
        count: 60,
        color: '34, 211, 238', // cyan
        shape: 'plus',
        speed: 0.4,
        connectDist: 0, // no connections
        sizeRange: [3, 6],
        connectMouse: false,
        verticalOnly: true // float straight up like coding grid
      },
      neonveil: {
        count: 65,
        color: '236, 72, 153', // pink/magenta
        shape: 'triangle',
        speed: 0.6,
        connectDist: 80,
        sizeRange: [2, 5],
        connectMouse: true
      },
      azmerheim: {
        count: 50,
        color: '245, 158, 11', // amber/clockwork gold
        shape: 'gear-shard',
        speed: 0.15,
        connectDist: 120,
        sizeRange: [2, 6],
        connectMouse: true
      }
    };
  }

  init() {
    if (typeof window === 'undefined' || Device.prefersReducedMotion()) return;

    // Create background canvas
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'nexus-background-canvas';
    this.canvas.style.position = 'fixed';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';
    this.canvas.style.width = '100vw';
    this.canvas.style.height = '100vh';
    this.canvas.style.zIndex = '-1';
    this.canvas.style.pointerEvents = 'none';
    this.canvas.style.background = 'transparent';
    
    document.body.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');
    
    this.resizeCanvas();
    this.spawnParticles();
    this.animate();

    // Bind event listeners
    window.addEventListener('resize', () => this.resizeCanvas());
    window.addEventListener('mousemove', (e) => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
    });
    window.addEventListener('mouseleave', () => {
      this.mouse.x = null;
      this.mouse.y = null;
    });
  }

  setTheme(themeId) {
    const targetTheme = this.themeConfigs[themeId] ? themeId : 'default';
    if (this.currentTheme === targetTheme) return;
    
    this.currentTheme = targetTheme;
    this.spawnParticles();
  }

  resizeCanvas() {
    if (!this.canvas) return;
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  spawnParticles() {
    if (!this.canvas) return;
    this.particles = [];
    const config = this.themeConfigs[this.currentTheme];
    
    for (let i = 0; i < config.count; i++) {
      const size = Math.random() * (config.sizeRange[1] - config.sizeRange[0]) + config.sizeRange[0];
      const angle = config.verticalOnly ? -Math.PI / 2 : Math.random() * Math.PI * 2;
      const velocity = config.speed * (Math.random() * 0.8 + 0.6);
      
      this.particles.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity,
        size: size,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.02,
        alpha: Math.random() * 0.5 + 0.3
      });
    }
  }

  drawShape(ctx, p, config) {
    ctx.strokeStyle = `rgba(${config.color}, ${p.alpha})`;
    ctx.fillStyle = `rgba(${config.color}, ${p.alpha})`;
    ctx.lineWidth = 1;

    switch (config.shape) {
      case 'plus':
        // Cyber coordinates
        ctx.beginPath();
        ctx.moveTo(p.x - p.size, p.y);
        ctx.lineTo(p.x + p.size, p.y);
        ctx.moveTo(p.x, p.y - p.size);
        ctx.lineTo(p.x, p.y + p.size);
        ctx.stroke();
        break;
      
      case 'triangle':
        // Pink cyber sparks
        ctx.beginPath();
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.moveTo(0, -p.size);
        ctx.lineTo(p.size * 0.8, p.size * 0.8);
        ctx.lineTo(-p.size * 0.8, p.size * 0.8);
        ctx.closePath();
        ctx.stroke();
        ctx.fillStyle = `rgba(${config.color}, ${p.alpha * 0.15})`;
        ctx.fill();
        ctx.restore();
        break;

      case 'gear-shard':
        // Clockwork magical floating shards
        ctx.beginPath();
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        // Draw a small gear tooth / rhomboid shard
        ctx.moveTo(0, -p.size);
        ctx.lineTo(p.size * 0.5, -p.size * 0.2);
        ctx.lineTo(p.size * 0.4, p.size * 0.5);
        ctx.lineTo(-p.size * 0.4, p.size * 0.5);
        ctx.lineTo(-p.size * 0.5, -p.size * 0.2);
        ctx.closePath();
        ctx.stroke();
        ctx.fillStyle = `rgba(${config.color}, ${p.alpha * 0.25})`;
        ctx.fill();
        ctx.restore();
        break;

      case 'circle':
      default:
        // Constellation stars
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        break;
    }
  }

  animate() {
    if (!this.canvas || !this.ctx) return;
    
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    const config = this.themeConfigs[this.currentTheme];

    // 1. Draw connections
    if (config.connectDist > 0) {
      for (let i = 0; i < this.particles.length; i++) {
        const p1 = this.particles[i];
        
        // Draw constellation lines between nodes
        for (let j = i + 1; j < this.particles.length; j++) {
          const p2 = this.particles[j];
          const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
          
          if (dist < config.connectDist) {
            const alpha = (1 - dist / config.connectDist) * 0.15;
            this.ctx.strokeStyle = `rgba(${config.color}, ${alpha})`;
            this.ctx.lineWidth = 0.5;
            this.ctx.beginPath();
            this.ctx.moveTo(p1.x, p1.y);
            this.ctx.lineTo(p2.x, p2.y);
            this.ctx.stroke();
          }
        }

        // Draw connections to mouse if active
        if (config.connectMouse && this.mouse.x !== null) {
          const mDist = Math.hypot(p1.x - this.mouse.x, p1.y - this.mouse.y);
          if (mDist < this.mouse.radius) {
            const alpha = (1 - mDist / this.mouse.radius) * 0.25;
            this.ctx.strokeStyle = `rgba(${config.color}, ${alpha})`;
            this.ctx.lineWidth = 0.75;
            this.ctx.beginPath();
            this.ctx.moveTo(p1.x, p1.y);
            this.ctx.lineTo(this.mouse.x, this.mouse.y);
            this.ctx.stroke();
          }
        }
      }
    }

    // 2. Render & update positions of particles
    this.particles.forEach(p => {
      // Draw particle
      this.drawShape(this.ctx, p, config);
      
      // Update coordinates
      p.x += p.vx;
      p.y += p.vy;
      p.rotation += p.rotSpeed;

      // Parallax push/repel from mouse if nearby
      if (this.mouse.x !== null) {
        const dx = p.x - this.mouse.x;
        const dy = p.y - this.mouse.y;
        const dist = Math.hypot(dx, dy);
        
        if (dist < this.mouse.radius) {
          const force = (this.mouse.radius - dist) / this.mouse.radius;
          const angle = Math.atan2(dy, dx);
          // Apply a gentle nudge away from the mouse cursor
          p.x += Math.cos(angle) * force * 1.5;
          p.y += Math.sin(angle) * force * 1.5;
        }
      }

      // Re-boundary checking
      if (p.x < -10) p.x = this.canvas.width + 10;
      if (p.x > this.canvas.width + 10) p.x = -10;
      if (p.y < -10) p.y = this.canvas.height + 10;
      if (p.y > this.canvas.height + 10) p.y = -10;
    });

    if (typeof requestAnimationFrame === 'function') {
      this.animationId = requestAnimationFrame(() => this.animate());
    }
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    if (this.canvas) {
      this.canvas.remove();
    }
    window.removeEventListener('resize', this.resizeCanvas);
  }
}

export const backgroundEffect = new BackgroundEffect();
export default BackgroundEffect;
