/**
 * Ultra-Fast, Zero-Lag Celebration Confetti Engine
 * Designed for 60fps performance on all hardware (including integrated laptop GPUs).
 * Zero shadowBlur, zero font thrashing, hardware-friendly 1x canvas buffer.
 */
(function(window) {
  'use strict';

  var canvas = null;
  var ctx = null;
  var w = 0;
  var h = 0;
  var particles = [];
  var animId = null;
  var isRunning = false;
  var audioCtx = null;
  var lastTriggerTime = 0;

  var PALETTE = [
    '#C5A059', // Brushed Gold
    '#D4AF37', // Classic Gold
    '#EFE0BD', // Champagne
    '#C86D7C', // Rose
    '#F6DFE3', // Soft Blush
    '#E76F51', // Coral Warmth
    '#FFD700', // Bright Gold
    '#FFFFFF'  // Pure Spark
  ];

  function initCanvas() {
    if (canvas) return;
    canvas = document.createElement('canvas');
    canvas.id = 'celebrationCanvas';
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100vw';
    canvas.style.height = '100vh';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '99999';
    canvas.setAttribute('aria-hidden', 'true');
    document.body.appendChild(canvas);
    ctx = canvas.getContext('2d', { alpha: true });
    resize();
    window.addEventListener('resize', resize, { passive: true });
  }

  function resize() {
    if (!canvas) return;
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = w;
    canvas.height = h;
  }

  function randomRange(min, max) {
    return Math.random() * (max - min) + min;
  }

  // Pre-defined tiny heart drawing path (NO font rasterization)
  function drawMiniHeart(c, x, y, size, color, alpha) {
    c.save();
    c.globalAlpha = alpha;
    c.fillStyle = color;
    c.translate(x, y);
    c.beginPath();
    var top = size * 0.3;
    c.moveTo(0, top);
    c.bezierCurveTo(-size / 2, -top, -size, size / 3, 0, size);
    c.bezierCurveTo(size, size / 3, size / 2, -top, 0, top);
    c.closePath();
    c.fill();
    c.restore();
  }

  function Particle(x, y, vx, vy, isHeart) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.color = PALETTE[Math.floor(Math.random() * PALETTE.length)];
    this.isHeart = !!isHeart;
    this.size = this.isHeart ? randomRange(10, 16) : randomRange(6, 12);
    this.w = this.size;
    this.h = this.isHeart ? this.size : this.size * randomRange(0.4, 0.7);
    this.rotation = randomRange(0, Math.PI * 2);
    this.rotSpeed = randomRange(-0.15, 0.15);
    this.gravity = 0.38;
    this.drag = 0.985;
    this.opacity = 1;
    this.decay = randomRange(0.008, 0.016);
    this.wobble = Math.random() * Math.PI * 2;
    this.wobbleSpeed = randomRange(0.08, 0.15);
  }

  Particle.prototype.update = function() {
    this.vx *= this.drag;
    this.vy += this.gravity;
    this.wobble += this.wobbleSpeed;
    this.x += this.vx + Math.sin(this.wobble) * 0.6;
    this.y += this.vy;
    this.rotation += this.rotSpeed;
    this.opacity -= this.decay;
  };

  Particle.prototype.draw = function(c) {
    if (this.opacity <= 0) return;
    if (this.isHeart) {
      drawMiniHeart(c, this.x, this.y, this.size, this.color, Math.max(0, this.opacity));
      return;
    }

    c.save();
    c.globalAlpha = Math.max(0, this.opacity);
    c.translate(this.x, this.y);
    c.rotate(this.rotation);
    // 3D flip effect via cosine width scaling
    var scaleX = Math.cos(this.wobble);
    c.scale(scaleX, 1);
    c.fillStyle = this.color;
    c.fillRect(-this.w / 2, -this.h / 2, this.w, this.h);
    c.restore();
  };

  function animLoop() {
    if (!ctx) return;
    ctx.clearRect(0, 0, w, h);

    for (var i = particles.length - 1; i >= 0; i--) {
      var p = particles[i];
      p.update();
      p.draw(ctx);
      if (p.opacity <= 0 || p.y > h + 40) {
        particles.splice(i, 1);
      }
    }

    if (particles.length > 0) {
      animId = requestAnimationFrame(animLoop);
      isRunning = true;
    } else {
      isRunning = false;
      ctx.clearRect(0, 0, w, h);
    }
  }

  function launchBurst(originX, originY, count, isLeftCannon, isRightCannon) {
    initCanvas();
    var maxTotal = 95; // strict cap to guarantee 60fps on i7 / low-end hardware
    var available = Math.max(0, maxTotal - particles.length);
    var toAdd = Math.min(count, available);

    for (var i = 0; i < toAdd; i++) {
      var angle;
      var speed;
      if (isLeftCannon) {
        angle = randomRange(-Math.PI * 0.45, -Math.PI * 0.08);
        speed = randomRange(12, 24);
      } else if (isRightCannon) {
        angle = randomRange(-Math.PI * 0.92, -Math.PI * 0.55);
        speed = randomRange(12, 24);
      } else {
        angle = randomRange(-Math.PI * 0.85, -Math.PI * 0.15);
        speed = randomRange(8, 20);
      }

      var isHeart = (i % 4 === 0);
      particles.push(new Particle(
        originX,
        originY,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        isHeart
      ));
    }

    if (!isRunning && particles.length > 0) {
      isRunning = true;
      animId = requestAnimationFrame(animLoop);
    }
  }

  function playChime() {
    try {
      var AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;
      if (!audioCtx) {
        audioCtx = new AudioContextClass();
      }
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }

      var now = audioCtx.currentTime;
      var notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      notes.forEach(function(freq, idx) {
        var osc = audioCtx.createOscillator();
        var gain = audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.06);
        gain.gain.setValueAtTime(0.08, now + idx * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.06 + 0.9);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now + idx * 0.06);
        osc.stop(now + idx * 0.06 + 1.0);
        osc.onended = function() {
          try {
            osc.disconnect();
            gain.disconnect();
          } catch (err) {}
        };
      });
    } catch (e) {
      // Audio driver fallback
    }
  }

  var Celebrations = {
    celebrate: function() {
      if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        playChime();
        return;
      }
      var now = Date.now();
      if (now - lastTriggerTime < 250) return; // Debounce rapid multi-clicks
      lastTriggerTime = now;

      initCanvas();
      // Dual golden cannon blast
      launchBurst(w * 0.15, h * 0.85, 30, true, false);
      launchBurst(w * 0.85, h * 0.85, 30, false, true);
      playChime();
    },

    doubleCannon: function() {
      this.celebrate();
    },

    hearts: function() {
      // Included in celebrate
    },

    sparkles: function() {
      // Included in celebrate
    },

    playChime: playChime
  };

  window.Celebrations = Celebrations;
})(window);
