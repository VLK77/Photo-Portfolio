(function() {
  "use strict";

  const container = document.getElementById("scrollContainer");
  // road-bg moves with scroll-container, no separate animation needed
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

    if (isMobile()) {
      // Mobile: scroll container to panel position
      var panelTop = panels[index].offsetTop;
      container.scrollTo({ top: panelTop, behavior: smooth ? "smooth" : "auto" });
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

  /* ===== SCROLL TO SUBSECTION (within panel 0 for About) ===== */
  function scrollToSubsection(target) {
    var inner = document.getElementById("panelHomeInner");
    var el = document.getElementById(target === "about" ? "homeAbout" : target);
    if (!inner || !el) return;
    if (isMobile()) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      // Desktop: first make sure we're on panel 0, then scroll within panel-inner
      if (currentPanel !== 0) {
        goToPanel(0, true);
        setTimeout(function() {
          inner.scrollTo({ top: el.offsetTop, behavior: "smooth" });
        }, 850);
      } else {
        inner.scrollTo({ top: el.offsetTop, behavior: "smooth" });
      }
    }
  }

  /* ===== UPDATE NAV DOTS ===== */
  function updateDots() {
    dots.forEach(function(dot, i) {
      dot.classList.toggle("active", i === currentPanel);
    });
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

    // Listen for scroll on the container itself (not window)
    container.addEventListener("scroll", function() {
      var best = 0, bestDist = Infinity;
      panels.forEach(function(p, i) {
        var rect = p.getBoundingClientRect();
        var dist = Math.abs(rect.top);
        if (dist < bestDist) { bestDist = dist; best = i; }
      });
      if (best !== currentPanel) {
        currentPanel = best;
        updateDots();
      }
      // Fade in visible
      panels[best].querySelectorAll(".fade-in:not(.visible)").forEach(function(el, i) {
        setTimeout(function() { el.classList.add("visible"); }, i * 100);
      });
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
      var targetPanel = parseInt(a.dataset.panel);
      var subsection = a.dataset.scrollto;
      if (subsection) {
        // First ensure panel 0, then scroll to subsection inside it
        if (currentPanel !== targetPanel) goToPanel(targetPanel, true);
        setTimeout(function() { scrollToSubsection(subsection); }, currentPanel === targetPanel ? 0 : 850);
      } else {
        goToPanel(targetPanel, true);
      }
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
      // respect in-panel vertical scroll
      var inner = panels[currentPanel].querySelector(".panel-inner");
      if (inner && inner.scrollHeight > inner.clientHeight) {
        var atTop = inner.scrollTop <= 0;
        var atBottom = inner.scrollTop + inner.clientHeight >= inner.scrollHeight - 2;
        if ((e.key === "ArrowDown" && !atBottom) || (e.key === "ArrowUp" && !atTop)) {
          return; // allow native scroll
        }
      }
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

  /* ===== IN-PANEL SCROLL: fade in about section when visible ===== */
  var panelHomeInner = document.getElementById("panelHomeInner");
  var homeAbout = document.getElementById("homeAbout");
  if (panelHomeInner && homeAbout) {
    panelHomeInner.addEventListener("scroll", function() {
      var rect = homeAbout.getBoundingClientRect();
      if (rect.top < window.innerHeight * 0.7) {
        homeAbout.querySelectorAll(".fade-in:not(.visible)").forEach(function(el, i) {
          setTimeout(function() { el.classList.add("visible"); }, i * 80);
        });
      }
    }, { passive: true });
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
