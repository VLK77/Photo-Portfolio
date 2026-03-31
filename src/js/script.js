const navLinks = document.getElementById("navLinks");
hamburger.addEventListener("click", () => {
  hamburger.classList.toggle("open");
  navLinks.classList.toggle("open");
});
navLinks.querySelectorAll("a").forEach((a) => {
  a.addEventListener("click", () => {
    hamburger.classList.remove("open");
    navLinks.classList.remove("open");
  });
});

document.querySelectorAll(".filter-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document
      .querySelectorAll(".filter-btn")
      .forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    const cat = btn.dataset.cat;
    document.querySelectorAll(".gallery-item").forEach((item) => {
      if (cat === "all" || item.dataset.cat === cat) {
        item.classList.remove("hidden");
      } else {
        item.classList.add("hidden");
      }
    });
  });
});

const lbImg = document.getElementById("lightbox-img");
document.querySelectorAll(".gallery-item").forEach((item) => {
  item.addEventListener("click", () => {
    const img = item.querySelector("img");
    if (img) {
      lbImg.src = img.src;
      lbImg.style.display = "block";
    } else {
      lbImg.src = "";
      lbImg.style.display = "none";
    }
    document.getElementById("lightbox").classList.add("active");
  });
});

document.getElementById("lightbox").addEventListener("click", closeLightbox);

document.addEventListener("contextmenu", (e) => e.preventDefault());

document.addEventListener("dragstart", (e) => {
  if (e.target.tagName === "IMG") e.preventDefault();
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeLightbox();
    return;
  }
  if (
    (e.ctrlKey || e.metaKey) &&
    ["s", "u", "p"].includes(e.key.toLowerCase())
  ) {
    e.preventDefault();
  }
});

function closeLightbox() {
  document.getElementById("lightbox").classList.remove("active");
}

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        setTimeout(() => {
          entry.target.classList.add("visible");
        }, i * 80);
        observer.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.1 },
);

document.querySelectorAll(".fade-in").forEach((el) => observer.observe(el));

const contactForm = document.getElementById("contactForm");
const formStatus = document.getElementById("formStatus");

contactForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = contactForm.querySelector("button");
  btn.textContent = "Sending&#8230;";
  btn.disabled = true;

  try {
    const res = await fetch(contactForm.action, {
      method: "POST",
      body: new FormData(contactForm),
      headers: { Accept: "application/json" },
    });

    if (res.ok) {
      formStatus.textContent = "Message sent &mdash; I'll be in touch soon.";
      formStatus.className = "form-status visible ok";
      contactForm.reset();
      btn.textContent = "Send message &#8599;";
    } else {
      throw new Error();
    }
  } catch {
    formStatus.textContent = "Something went wrong. Try emailing me directly.";
    formStatus.className = "form-status visible err";
    btn.textContent = "Send message &#8599;";
  }

  btn.disabled = false;
  setTimeout(() => formStatus.classList.remove("visible"), 6000);
});
