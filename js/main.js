/**
 * Mom & Dad's 25th Wedding Anniversary - High-Performance Main Controller
 * Zero layout thrashing, 60fps silky smooth scrolling, Swiss chronometer ticker.
 */
(function() {
  'use strict';

  // Wedding Date: November 11, 2001
  var WEDDING_DATE = new Date('2001-11-11T00:00:00');

  // DOM Elements
  var daysCountEl = document.getElementById('daysCount');
  var tYearsEl = document.getElementById('tYears');
  var tMonthsEl = document.getElementById('tMonths');
  var tDaysEl = document.getElementById('tDays');
  var tHoursEl = document.getElementById('tHours');
  var tMinutesEl = document.getElementById('tMinutes');
  var tSecondsEl = document.getElementById('tSeconds');
  var progressBar = document.getElementById('topProgressBar');

  /* =========================================================================
     1. ACCURATE LIVE TIME COUNTER
     ========================================================================= */
  function pad(n) {
    return n < 10 ? '0' + n : String(n);
  }

  function updateLiveCounter() {
    var now = new Date();
    var diffMs = now.getTime() - WEDDING_DATE.getTime();
    if (diffMs < 0) diffMs = 0;

    // Total days
    var totalDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (daysCountEl) {
      daysCountEl.textContent = totalDays.toLocaleString();
    }

    // Precise date breakdown
    var y1 = WEDDING_DATE.getFullYear();
    var m1 = WEDDING_DATE.getMonth();
    var d1 = WEDDING_DATE.getDate();

    var y2 = now.getFullYear();
    var m2 = now.getMonth();
    var d2 = now.getDate();

    var years = y2 - y1;
    var months = m2 - m1;
    var days = d2 - d1;

    if (days < 0) {
      months--;
      var prevMonth = new Date(y2, m2, 0);
      days += prevMonth.getDate();
    }
    if (months < 0) {
      years--;
      months += 12;
    }

    var hours = now.getHours();
    var mins = now.getMinutes();
    var secs = now.getSeconds();

    if (tYearsEl) tYearsEl.textContent = years;
    if (tMonthsEl) tMonthsEl.textContent = months;
    if (tDaysEl) tDaysEl.textContent = days;
    if (tHoursEl) tHoursEl.textContent = pad(hours);
    if (tMinutesEl) tMinutesEl.textContent = pad(mins);
    if (tSecondsEl) tSecondsEl.textContent = pad(secs);
  }

  setInterval(updateLiveCounter, 1000);
  updateLiveCounter();

  /* =========================================================================
     2. AUDIO PLAYER CONTROLLER
     ========================================================================= */
  var bgMusic = document.getElementById('bgMusic');
  var headerMusicBtn = document.getElementById('headerMusicBtn');
  var musicBtnLabel = document.getElementById('musicBtnLabel');
  var isPlaying = false;

  function toggleAudio() {
    if (!bgMusic) return;
    if (isPlaying) {
      bgMusic.pause();
      isPlaying = false;
      updateAudioUI(false);
    } else {
      bgMusic.play().then(function() {
        isPlaying = true;
        updateAudioUI(true);
      }).catch(function() {});
    }
  }

  function updateAudioUI(playing) {
    if (headerMusicBtn) {
      headerMusicBtn.classList.toggle('playing', playing);
      headerMusicBtn.setAttribute('aria-pressed', playing ? 'true' : 'false');
      if (musicBtnLabel) {
        musicBtnLabel.textContent = playing ? 'Music On' : 'Music Off';
      }
    }
  }

  if (headerMusicBtn) headerMusicBtn.addEventListener('click', toggleAudio);

  if (bgMusic) {
    bgMusic.addEventListener('play', function() {
      isPlaying = true;
      updateAudioUI(true);
    });
    bgMusic.addEventListener('pause', function() {
      isPlaying = false;
      updateAudioUI(false);
    });
    bgMusic.addEventListener('ended', function() {
      isPlaying = false;
      updateAudioUI(false);
    });
  }

  // User gesture unlock for music (covers clicks, mobile taps, scrolling, and keyboard)
  function startAudioOnGesture(e) {
    if (isPlaying || !bgMusic) return;
    
    // Ignore the music button itself so we don't conflict with its toggle logic
    if (e && e.target && e.target.closest && (e.target.closest('#headerMusicBtn') || e.target.id === 'headerMusicBtn')) return;
    
    bgMusic.play().then(function() {
      isPlaying = true;
      updateAudioUI(true);
      
      // Once the music unlocks, remove all these listeners so it doesn't slow down the site
      window.removeEventListener('click', startAudioOnGesture);
      window.removeEventListener('touchstart', startAudioOnGesture);
      window.removeEventListener('scroll', startAudioOnGesture);
      window.removeEventListener('keydown', startAudioOnGesture);
    }).catch(function() {
      // Browser hasn't allowed autoplay yet; keep waiting for the next gesture
    });
  }
  
  // Bind all interaction types
  window.addEventListener('click', startAudioOnGesture);
  window.addEventListener('touchstart', startAudioOnGesture, { passive: true });
  window.addEventListener('scroll', startAudioOnGesture, { passive: true });
  window.addEventListener('keydown', startAudioOnGesture, { passive: true });

  // pause music when stiwch tab
  var wasPlayingBeforeHide = false;
  
  document.addEventListener('visibilitychange', function() {
    if (!bgMusic) return;
    
    if (document.hidden) {
      // User switched to another tab
      wasPlayingBeforeHide = isPlaying;
      if (isPlaying) {
        bgMusic.pause(); // Triggers the existing pause event listener to update the UI
      }
    } else {
      // User came back to the tab
      if (wasPlayingBeforeHide) {
        bgMusic.play().catch(function() {});
      }
    }
  });

  /* =========================================================================
     3. ULTRA-FAST SCROLL PROGRESS & ZERO-LAG TIMELINE LIGHT BEAM
     ========================================================================= */
  var timelineEl = document.querySelector('.retrospective-timeline');
  var progressBeam = document.getElementById('timelineProgressBeam');
  var chapterEls = Array.prototype.slice.call(document.querySelectorAll('.retro-chapter'));
  var chapterData = chapterEls.map(function(ch) {
    return {
      chapter: ch,
      node: ch.querySelector('.retro-pin-node'),
      isIgnited: false
    };
  });

  var cachedTimelineTop = 0;
  var cachedTimelineHeight = 0;
  var cachedNodeTops = [];

  function measureTimelineMetrics() {
    if (!timelineEl) return;
    var tRect = timelineEl.getBoundingClientRect();
    var currentScrollY = window.scrollY !== undefined ? window.scrollY : (window.pageYOffset || 0);
    cachedTimelineTop = tRect.top + currentScrollY;
    cachedTimelineHeight = timelineEl.offsetHeight || tRect.height;

    cachedNodeTops = chapterData.map(function(item) {
      if (!item.node) return 0;
      var nRect = item.node.getBoundingClientRect();
      return nRect.top + currentScrollY;
    });
  }

  // Pre-calculate positions on init, load, and font ready
  measureTimelineMetrics();
  window.addEventListener('load', measureTimelineMetrics);
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(measureTimelineMetrics);
  }

  // Also re-measure if retrospective images finish loading
  var retroImages = timelineEl ? timelineEl.querySelectorAll('img') : [];
  retroImages.forEach(function(img) {
    if (!img.complete) {
      img.addEventListener('load', measureTimelineMetrics, { once: true });
    }
  });

  function updateProgress() {
    if (progressBar) {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      var scrollY = window.scrollY !== undefined ? window.scrollY : (window.pageYOffset || 0);
      var ratio = max > 0 ? (scrollY / max) : 0;
      progressBar.style.transform = 'scaleX(' + Math.min(1, Math.max(0, ratio)) + ')';
    }
  }

  var currentBeamProgress = 0;
  var targetBeamProgress = 0;
  var isBeamAnimating = false;

  function renderSmoothBeam() {
    var reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) {
      currentBeamProgress = targetBeamProgress;
      isBeamAnimating = false;
    } else {
      var diff = targetBeamProgress - currentBeamProgress;
      if (Math.abs(diff) < 0.0003) {
        currentBeamProgress = targetBeamProgress;
        isBeamAnimating = false;
      } else {
        // Silky exponential damping (factor 0.22 creates an ultra-smooth glide eliminating wheel notch steps)
        currentBeamProgress += diff * 0.22;
        requestAnimationFrame(renderSmoothBeam);
      }
    }

    if (progressBeam) {
      progressBeam.style.height = (currentBeamProgress * 100) + '%';
      progressBeam.classList.toggle('active', currentBeamProgress > 0.003);
    }

    var currentBeamPixelY = cachedTimelineTop + (currentBeamProgress * cachedTimelineHeight);
    for (var i = 0; i < chapterData.length; i++) {
      var item = chapterData[i];
      if (!item.node) continue;
      var nodeTop = cachedNodeTops[i] || 0;
      var shouldIgnite = nodeTop <= currentBeamPixelY + 16;
      if (item.isIgnited !== shouldIgnite) {
        item.isIgnited = shouldIgnite;
        item.node.classList.toggle('ignited', shouldIgnite);
        item.chapter.classList.toggle('illuminated', shouldIgnite);
      }
    }
  }

  function updateTimelineBeam() {
    if (!timelineEl || !progressBeam) return;
    if (cachedTimelineHeight <= 0) measureTimelineMetrics();

    var scrollY = window.scrollY !== undefined ? window.scrollY : (window.pageYOffset || 0);
    var windowH = window.innerHeight;
    var triggerY = scrollY + (windowH * 0.58);

    var progress = (triggerY - cachedTimelineTop) / cachedTimelineHeight;
    targetBeamProgress = Math.max(0, Math.min(1, progress));

    if (!isBeamAnimating) {
      isBeamAnimating = true;
      requestAnimationFrame(renderSmoothBeam);
    }
  }

  // High-performance continuous tracking: synchronized to display refresh rate via rAF
  var scrollTicking = false;
  function onScroll() {
    if (!scrollTicking) {
      scrollTicking = true;
      requestAnimationFrame(function() {
        updateProgress();
        updateTimelineBeam();
        scrollTicking = false;
      });
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });

  var resizeTicking = false;
  window.addEventListener('resize', function() {
    if (!resizeTicking) {
      resizeTicking = true;
      requestAnimationFrame(function() {
        measureTimelineMetrics();
        updateProgress();
        updateTimelineBeam();
        resizeTicking = false;
      });
    }
  }, { passive: true });

  function initScrollReveals() {
    var reveals = document.querySelectorAll('.reveal');
    var mosaicCards = document.querySelectorAll('.mosaic-photo-card');

    if ('IntersectionObserver' in window) {
      var observer = new IntersectionObserver(function(entries, obs) {
        entries.forEach(function(entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('active');
            obs.unobserve(entry.target);
          }
        });
      }, { threshold: 0.05, rootMargin: '0px 0px -20px 0px' });

      reveals.forEach(function(el) { observer.observe(el); });

      var cardObserver = new IntersectionObserver(function(entries, obs) {
        entries.forEach(function(entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('in-view');
            obs.unobserve(entry.target);
          }
        });
      }, { threshold: 0.08, rootMargin: '0px 0px -30px 0px' });

      mosaicCards.forEach(function(card) { cardObserver.observe(card); });
    } else {
      reveals.forEach(function(el) { el.classList.add('active'); });
      mosaicCards.forEach(function(card) { card.classList.add('in-view'); });
    }
  }

  /* =========================================================================
     4. UNIVERSAL HIGH-RES LIGHTBOX MODAL (Chapters & Photographic Archive)
     ========================================================================= */
  var photoCards = Array.prototype.slice.call(document.querySelectorAll('.mosaic-photo-card:not(.card-reserved)'));
  var chapterCards = Array.prototype.slice.call(document.querySelectorAll('.retro-entry-card'));
  var reservedCard = document.querySelector('.mosaic-photo-card.card-reserved');
  var lightbox = document.getElementById('lightboxModal');
  var lbImg = document.getElementById('lightboxImg');
  var lbCaption = document.getElementById('lightboxCaption');
  var lbCounter = document.getElementById('lightboxCounter');
  var lbClose = document.getElementById('lightboxClose');
  var lbPrev = document.getElementById('lightboxPrev');
  var lbNext = document.getElementById('lightboxNext');

  var activeCollection = 'archive'; // 'chapters' or 'archive'
  var activeIndex = 0;
  var lastFocusedElement = null;
  var cachedChapterItems = null;
  var cachedArchiveItems = null;

  function buildCollectionCaches() {
    cachedChapterItems = chapterCards.map(function(card) {
      var img = card.querySelector('.retro-img-fg') || card.querySelector('img');
      var title = card.querySelector('.retro-era-title');
      var badge = card.querySelector('.retro-era-badge');
      var titleText = title ? title.textContent.trim() : 'Cherished Chapter';
      var badgeText = badge ? badge.textContent.trim() : '';
      return {
        src: img ? img.src : '',
        alt: img ? img.alt : 'Mom & Dad Chapter',
        title: titleText,
        badge: badgeText,
        counterLabel: 'Chapter'
      };
    });

    cachedArchiveItems = photoCards.map(function(card) {
      var img = card.querySelector('img');
      var captionText = card.getAttribute('data-caption') || (card.querySelector('.mosaic-caption-text') ? card.querySelector('.mosaic-caption-text').textContent.trim() : 'Cherished Memory');
      var tagText = card.getAttribute('data-date') || (card.querySelector('.mosaic-date-tag') ? card.querySelector('.mosaic-date-tag').textContent.trim() : '');
      return {
        src: img ? img.src : '',
        alt: img ? img.alt : 'Mom & Dad Memory',
        title: captionText,
        badge: tagText,
        counterLabel: 'Memory'
      };
    });
  }

  function getActiveItems() {
    if (!cachedChapterItems || !cachedArchiveItems) {
      buildCollectionCaches();
    }
    return activeCollection === 'chapters' ? cachedChapterItems : cachedArchiveItems;
  }

  function renderLightbox(index) {
    var items = getActiveItems();
    if (!items || items.length === 0 || !items[index]) return;
    activeIndex = index;
    var item = items[index];

    if (lbImg) {
      if (lightbox && lightbox.classList.contains('active')) {
        lbImg.style.opacity = '0.35';
        lbImg.style.transform = 'scale(0.985)';
        setTimeout(function() {
          lbImg.src = item.src;
          lbImg.alt = item.alt;
          lbImg.style.opacity = '1';
          lbImg.style.transform = 'scale(1)';
        }, 50);
      } else {
        lbImg.src = item.src;
        lbImg.alt = item.alt;
        lbImg.style.opacity = '1';
        lbImg.style.transform = 'scale(1)';
      }
    }
    if (lbCaption) {
      lbCaption.innerHTML = item.title + (item.badge ? ' <span style="opacity: 0.7; font-size: 0.85em; font-weight: normal;">(' + item.badge + ')</span>' : '');
    }
    if (lbCounter) {
      lbCounter.textContent = item.counterLabel + ' ' + (activeIndex + 1) + ' of ' + items.length;
    }
    if (lightbox) {
      lightbox.classList.add('active');
      lightbox.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    }
  }

  function openLightbox(collection, index) {
    lastFocusedElement = document.activeElement;
    activeCollection = collection;
    renderLightbox(index);
    if (lbClose) {
      setTimeout(function() { lbClose.focus(); }, 60);
    }
  }

  function closeLightbox() {
    if (lightbox) {
      lightbox.classList.remove('active');
      lightbox.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
        lastFocusedElement.focus();
      }
    }
  }

  function prevPhoto() {
    var items = getActiveItems();
    if (items.length === 0) return;
    activeIndex = (activeIndex - 1 + items.length) % items.length;
    renderLightbox(activeIndex);
  }

  function nextPhoto() {
    var items = getActiveItems();
    if (items.length === 0) return;
    activeIndex = (activeIndex + 1) % items.length;
    renderLightbox(activeIndex);
  }

  // Wire up Photographic Archive cards
  photoCards.forEach(function(card, idx) {
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.setAttribute('title', 'Click to view full photo');
    card.addEventListener('click', function() {
      openLightbox('archive', idx);
    });
    card.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openLightbox('archive', idx);
      }
    });
  });

  // Wire up Chapters of a Shared Lifetime cards
  chapterCards.forEach(function(card, idx) {
    card.addEventListener('click', function() {
      openLightbox('chapters', idx);
    });
    card.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openLightbox('chapters', idx);
      }
    });
  });

  /* =========================================================================
     5. TOAST NOTIFICATION CONTROLLER (Debounced)
     ========================================================================= */
  var toastEl = document.getElementById('toastNotice');
  var toastTimeout = null;

  function showToast(message, duration) {
    if (!toastEl) return;
    if (toastTimeout) {
      clearTimeout(toastTimeout);
      toastTimeout = null;
    }
    toastEl.textContent = message;
    toastEl.classList.add('show');
    toastTimeout = setTimeout(function() {
      toastEl.classList.remove('show');
      toastTimeout = null;
    }, duration || 3200);
  }

  if (reservedCard) {
    reservedCard.setAttribute('role', 'button');
    reservedCard.setAttribute('tabindex', '0');
    reservedCard.setAttribute('title', 'Click or press Enter to celebrate');
    function triggerReservedCelebration() {
      if (window.Celebrations) {
        window.Celebrations.celebrate();
      }
      showToast("Reserved for Mom & Dad's upcoming 25th Anniversary portrait", 3500);
    }
    reservedCard.addEventListener('click', triggerReservedCelebration);
    reservedCard.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        triggerReservedCelebration();
      }
    });
  }

  if (lbClose) lbClose.addEventListener('click', closeLightbox);
  if (lbPrev) lbPrev.addEventListener('click', prevPhoto);
  if (lbNext) lbNext.addEventListener('click', nextPhoto);

  if (lightbox) {
    lightbox.addEventListener('click', function(e) {
      if (e.target === lightbox || e.target.classList.contains('lightbox-backdrop')) {
        closeLightbox();
      }
    });

    // Mobile Touch Swipe Navigation (with multi-touch & cancellation safeguards)
    var touchStartX = 0;
    var touchStartY = 0;
    var isMultiTouch = false;

    lightbox.addEventListener('touchstart', function(e) {
      if (e.touches && e.touches.length === 1) {
        isMultiTouch = false;
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
      } else {
        isMultiTouch = true;
      }
    }, { passive: true });

    lightbox.addEventListener('touchmove', function(e) {
      if (e.touches && e.touches.length > 1) {
        isMultiTouch = true;
      }
    }, { passive: true });

    lightbox.addEventListener('touchcancel', function() {
      touchStartX = 0;
      touchStartY = 0;
      isMultiTouch = false;
    }, { passive: true });

    lightbox.addEventListener('touchend', function(e) {
      if (isMultiTouch) {
        isMultiTouch = false;
        return;
      }
      if (e.changedTouches && e.changedTouches.length === 1) {
        var diffX = e.changedTouches[0].clientX - touchStartX;
        var diffY = e.changedTouches[0].clientY - touchStartY;
        if (Math.abs(diffX) > 45 && Math.abs(diffX) > Math.abs(diffY) * 1.4) {
          if (diffX < 0) {
            nextPhoto();
          } else {
            prevPhoto();
          }
        }
      }
    }, { passive: true });
  }

  /* =========================================================================
     6. TOP CELEBRATION BUTTON TRIGGER (Zero-Lag Ultra Fast)
     ========================================================================= */
  var quickCelebrateBtn = document.getElementById('quickCelebrateBtn');
  if (quickCelebrateBtn) {
    quickCelebrateBtn.addEventListener('click', function() {
      if (window.Celebrations) {
        window.Celebrations.celebrate();
      }
      showToast("A Golden Toast to Mom & Dad on their 25th Anniversary", 3200);
    });
  }

  /* =========================================================================
     7. KEYBOARD NAVIGATION & ACCESSIBLE FOCUS TRAP
     ========================================================================= */
  window.addEventListener('keydown', function(e) {
    if (lightbox && lightbox.classList.contains('active')) {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeLightbox();
        return;
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        prevPhoto();
        return;
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        nextPhoto();
        return;
      }

      // Accessible Focus Trap inside modal
      if (e.key === 'Tab') {
        var focusables = [lbClose, lbPrev, lbNext].filter(function(el) {
          return el && (el.offsetWidth > 0 || el.offsetHeight > 0);
        });
        if (focusables.length === 0) return;
        var firstEl = focusables[0];
        var lastEl = focusables[focusables.length - 1];

        if (focusables.indexOf(document.activeElement) === -1) {
          e.preventDefault();
          firstEl.focus();
        } else if (e.shiftKey) {
          if (document.activeElement === firstEl) {
            e.preventDefault();
            lastEl.focus();
          }
        } else {
          if (document.activeElement === lastEl) {
            e.preventDefault();
            firstEl.focus();
          }
        }
      }
    }
  });

  function initSmoothAnchors() {
    var navLinks = Array.prototype.slice.call(document.querySelectorAll('a[href^="#"]'));
    navLinks.forEach(function(anchor) {
      anchor.addEventListener('click', function(e) {
        var href = this.getAttribute('href');
        if (!href) return;
        if (href === '#' || href === '#top') {
          e.preventDefault();
          window.scrollTo({ top: 0, behavior: 'smooth' });
          return;
        }
        var target = document.querySelector(href);
        if (target) {
          e.preventDefault();
          var headerOffset = 80;
          var elementPosition = target.getBoundingClientRect().top;
          var offsetPosition = elementPosition + (window.scrollY || window.pageYOffset) - headerOffset;
          window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
          });
        }
      });
    });
  }

  /* =========================================================================
     8. INITIALIZATION
     ========================================================================= */
  function init() {
    initScrollReveals();
    initSmoothAnchors();
    measureTimelineMetrics();
    updateProgress();
    updateTimelineBeam();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.addEventListener('load', function() {
    measureTimelineMetrics();
    updateProgress();
    updateTimelineBeam();
  });

})();
