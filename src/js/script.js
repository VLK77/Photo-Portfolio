(function() {
  "use strict";

  const container = document.getElementById("scrollContainer");
  const roadBg = document.getElementById("roadBg");
  const dots = document.querySelectorAll(".nav-dot");
  const panels = document.querySelectorAll(".panel");
  const hamburger = document.getElementById("navHamburger");
  const navLinks = document.getElementById("navLinks");
  const isMobile = () => window.innerWidth <= 768;

  let currentPanel = 0;
  let isAnimating = false;

  /* ===== NAVIGATE TO PANEL ===== */
  function goToPanel(index, smooth) {
    if (index < 0 || index >= panels.length) return;
    isAnimating = true;
    currentPanel = index;
    updateDots();
    updateRoad();

    if (isMobile()) {
      // Mobile: vertical scroll
      panels[index].scrollIntoView({ behavior: smooth ? "smooth" : "auto" });
    } else {
      // Desktop: slide container
      const offset = index * window.innerWidth;
      container.style.transition = smooth ? "transform 0.8s cubic-bezier(0.76, 0, 0.24, 1)" : "none";
      container.style.transform = "translateX(-" + offset + "px)";
    }

    // Hide scroll hint after first navigation
    const hint = document.getElementById("scrollHint");
    if (hint && index > 0) hint.style.opacity = "0";

    setTimeout(function() { isAnimating = false; }, smooth ? 900 : 50);

    // Trigger fade-in for visible panel
    setTimeout(function() {
      panels[index].querySelectorAll(".fade-in").forEach(function(el, i) {
        setTimeout(function() { el.classList.add("visible"); }, i * 100);
      });
    }, smooth ? 300 : 0);
  }

  /* ===== UPDATE NAV DOTS ===== */
  function updateDots() {
    dots.forEach(function(dot, i) {
      dot.classList.toggle("active", i === currentPanel);
    });
  }

  /* ===== ROAD PARALLAX ===== */
  function updateRoad() {
    // Shift the 200vw road strip left as panels advance
    // Panel 0 = 0vw, Panel 3 = -100vw (showing the mirrored tile)
    var shift = currentPanel * (100 / (panels.length - 1));
    roadBg.style.transform = "translateX(-" + shift + "vw)";
  }

  /* ===== WHEEL NAVIGATION (desktop) ===== */
  var wheelTimeout = null;
  document.addEventListener("wheel", function(e) {
    if (isMobile()) return;
    // Allow vertical scroll inside scrollable panel-inner
    var inner = panels[currentPanel].querySelector(".panel-inner");
    if (inner && inner.scrollHeight > inner.clientHeight) {
      var atTop = inner.scrollTop <= 0;
      var atBottom = inner.scrollTop + inner.clientHeight >= inner.scrollHeight - 2;
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        if ((e.deltaY < 0 && !atTop) || (e.deltaY > 0 && !atBottom)) {
          return;
        }
      }
    }
    e.preventDefault();
    if (isAnimating) return;
    clearTimeout(wheelTimeout);
    wheelTimeout = setTimeout(function() {
      var delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if (delta > 5) goToPanel(currentPanel + 1, true);
      else if (delta < -5) goToPanel(currentPanel - 1, true);
    }, 80);
  }, { passive: false });

  /* ===== TOUCH SWIPE (desktop horizontal) ===== */
  var touchStartX = 0, touchStartY = 0;
  container.addEventListener("touchstart", function(e) {
    if (isMobile()) return;
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }, { passive: true });
  container.addEventListener("touchend", function(e) {
    if (isMobile()) return;
    if (isAnimating) return;
    var dx = e.changedTouches[0].clientX - touchStartX;
    var dy = e.changedTouches[0].clientY - touchStartY;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 60) {
      if (dx < 0) goToPanel(currentPanel + 1, true);
      else goToPanel(currentPanel - 1, true);
    }
  }, { passive: true });

  /* ===== MOBILE: detect current panel on scroll ===== */
  if (isMobile()) {
    container.style.transform = "none";
    container.style.width = "100vw";
    container.style.height = "auto";
    container.style.flexDirection = "column";
    container.style.overflowY = "auto";

    var scrollDetect = null;
    window.addEventListener("scroll", function() {
      clearTimeout(scrollDetect);
      scrollDetect = setTimeout(function() {
        var best = 0, bestDist = Infinity;
        panels.forEach(function(p, i) {
          var rect = p.getBoundingClientRect();
          var dist = Math.abs(rect.top);
          if (dist < bestDist) { bestDist = dist; best = i; }
        });
        if (best !== currentPanel) {
          currentPanel = best;
          updateDots();
          updateRoad();
        }
        // Fade in visible
        panels[best].querySelectorAll(".fade-in:not(.visible)").forEach(function(el, i) {
          setTimeout(function() { el.classList.add("visible"); }, i * 100);
        });
      }, 100);
    }, { passive: true });
  }

  /* ===== NAV DOT CLICKS ===== */
  dots.forEach(function(dot) {
    dot.addEventListener("click", function() {
      goToPanel(parseInt(dot.dataset.panel), true);
    });
  });

  /* ===== NAV LINK CLICKS ===== */
  navLinks.querySelectorAll("a").forEach(function(a) {
    a.addEventListener("click", function(e) {
      e.preventDefault();
      goToPanel(parseInt(a.dataset.panel), true);
      hamburger.classList.remove("open");
      navLinks.classList.remove("open");
    });
  });

  /* ===== HAMBURGER ===== */
  hamburger.addEventListener("click", function() {
    hamburger.classList.toggle("open");
    navLinks.classList.toggle("open");
  });

  /* ===== KEYBOARD NAV ===== */
  document.addEventListener("keydown", function(e) {
    if (e.key === "Escape") {
      closeLightbox();
      return;
    }
    if (!isMobile() && !isAnimating) {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") { e.preventDefault(); goToPanel(currentPanel + 1, true); }
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); goToPanel(currentPanel - 1, true); }
    }
    if ((e.ctrlKey || e.metaKey) && ["s","u","p"].includes(e.key.toLowerCase())) {
      e.preventDefault();
    }
  });

  /* ===== GALLERY FILTERS ===== */
  document.querySelectorAll(".filter-btn").forEach(function(btn) {
    btn.addEventListener("click", function() {
      document.querySelectorAll(".filter-btn").forEach(function(b) { b.classList.remove("active"); });
      btn.classList.add("active");
      var cat = btn.dataset.cat;
      document.querySelectorAll(".gallery-item").forEach(function(item) {
        if (cat === "all" || item.dataset.cat === cat) item.classList.remove("hidden");
        else item.classList.add("hidden");
      });
    });
  });

  /* ===== LIGHTBOX ===== */
  var lbImg = document.getElementById("lightbox-img");
  document.querySelectorAll(".gallery-item").forEach(function(item) {
    item.addEventListener("click", function() {
      var img = item.querySelector("img");
      if (img) {
        lbImg.src = img.src;
        lbImg.style.display = "block";
      } else {
        lbImg.style.display = "none";
      }
      document.getElementById("lightbox").classList.add("active");
    });
  });
  document.getElementById("lightbox").addEventListener("click", closeLightbox);

  /* ===== ANTI COPY ===== */
  document.addEventListener("contextmenu", function(e) { e.preventDefault(); });
  document.addEventListener("dragstart", function(e) { if (e.target.tagName === "IMG") e.preventDefault(); });

  /* ===== CONTACT FORM ===== */
  var contactForm = document.getElementById("contactForm");
  var formStatus = document.getElementById("formStatus");
  if (contactForm) {
    contactForm.addEventListener("submit", function(e) {
      e.preventDefault();
      var btn = contactForm.querySelector("button");
      btn.textContent = "Sending...";
      btn.disabled = true;
      fetch(contactForm.action, {
        method: "POST",
        body: new FormData(contactForm),
        headers: { "Accept": "application/json" }
      }).then(function(res) {
        if (res.ok) {
          formStatus.textContent = "Message sent! I'll be in touch soon.";
          formStatus.className = "form-status visible ok";
          contactForm.reset();
        } else {
          formStatus.textContent = "Something went wrong. Try again.";
          formStatus.className = "form-status visible";
        }
        btn.textContent = "Send message \u2197";
        btn.disabled = false;
      }).catch(function() {
        formStatus.textContent = "Network error. Please try again.";
        formStatus.className = "form-status visible";
        btn.textContent = "Send message \u2197";
        btn.disabled = false;
      });
    });
  }

  /* ===== RESIZE HANDLER ===== */
  window.addEventListener("resize", function() {
    if (!isMobile()) {
      container.style.cssText = "";
      goToPanel(currentPanel, false);
    }
  });

  /* ===== INIT ===== */
  goToPanel(0, false);
  // Fade in hero elements
  panels[0].querySelectorAll(".fade-in").forEach(function(el, i) {
    setTimeout(function() { el.classList.add("visible"); }, i * 100 + 200);
  });

})();

function closeLightbox() {
  document.getElementById("lightbox").classList.remove("active");
}
