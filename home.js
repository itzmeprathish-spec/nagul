const heroBg = document.getElementById("heroBg");
const shopNowBtn = document.getElementById("shopNowBtn");
const productGrid = document.getElementById("productGrid");
const emptyState = document.getElementById("emptyState");
const filterChips = document.querySelectorAll(".filterChip");
const navButtons = document.querySelectorAll(".nav__button");
const searchInput = document.getElementById("searchInput");
const heroDots = document.getElementById("heroDots");
const wishlistCountBadge = document.getElementById("wishlistCountBadge");
const trendingTrack = document.getElementById("trendingTrack");
const trendPrev = document.getElementById("trendPrev");
const trendNext = document.getElementById("trendNext");
const dealTabs = document.querySelectorAll(".dealTab");
const shopCatBtns = document.querySelectorAll(".shopCatBtn");

const heroSlides = [
  "https://images.unsplash.com/photo-1606220588913-b3aacb4d2f46?q=80&w=1600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1545127398-14699f92334b?q=80&w=1600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=1600&auto=format&fit=crop"
];
let heroIndex = 0;
let allProducts = [];
let activeCategory = "All";
let searchTerm = "";
let wishlist = new Set(JSON.parse(localStorage.getItem("wishlistIds") || "[]"));
let trendOffset = 0;

const fetchJSON = window.apiFetch
  ? (url) => window.apiFetch(url)
  : async (url) => {
      const res = await fetch(url);
      if (!res.ok) throw new Error("API error");
      return res.json();
    };

function setHeroImage() {
  if (!heroBg) return;
  heroBg.style.backgroundImage = `url("${heroSlides[heroIndex]}")`;
  if (heroDots) {
    heroDots.innerHTML = heroSlides
      .map((_, i) => `<button class="dot ${i === heroIndex ? "is-active" : ""}" data-dot-index="${i}" type="button"></button>`)
      .join("");
  }
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (m) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[m])
  );
}

function formatINR(price) {
  return "₹" + Number(price).toLocaleString("en-IN");
}

function productCardHtml(p) {
  const price = Number(p.price || 0);
  const mrp = Number(p.mrp || Math.round(price * 1.8));
  const off = Math.max(5, Math.round(((mrp - price) / mrp) * 100));
  const rating = Number(p.rating || 4.3).toFixed(1);
  const pid = String(p._id || p.id);
  const liked = wishlist.has(pid);
  return `
    <article class="productCard">
      <img src="${p.imageUrl}" alt="${escapeHtml(p.name)}" />
      <div class="ratingBadge">⭐ ${rating}</div>
      <button class="wishBtn ${liked ? "is-liked" : ""}" data-wish-product-id="${pid}" type="button">❤</button>
      <h3>${escapeHtml(p.name)}</h3>
      <p class="priceNow">${formatINR(price)}</p>
      <div class="priceRow">
        <span class="priceOld">${formatINR(mrp)}</span>
        <span class="priceOff">${off}% off</span>
      </div>
      <button data-add-product-id="${pid}">Add to Bag</button>
    </article>
  `;
}

function updateWishlistBadge() {
  if (wishlistCountBadge) wishlistCountBadge.textContent = String(wishlist.size);
}

function saveWishlist() {
  localStorage.setItem("wishlistIds", JSON.stringify([...wishlist]));
  updateWishlistBadge();
}

function normalizeCategory(raw) {
  const v = String(raw || "").trim().toLowerCase();
  if (v.startsWith("ear") || v.includes("airdop")) return "Earbuds";
  if (v.startsWith("smart") || v.includes("watch")) return "Smartwatch";
  if (v.startsWith("speaker") || v.includes("sound")) return "Speakers";
  return "All";
}

function fallbackProducts() {
  return [
    { id: "g1", name: "Airdopes 181 Pro", price: 999, mrp: 4990, category: "Earbuds", rating: 4.7, imageUrl: "https://images.unsplash.com/photo-1588423771073-b8903fbb85b5?q=80&w=900&auto=format&fit=crop" },
    { id: "g2", name: "Airdopes Prime 701 ANC", price: 1899, mrp: 7990, category: "Earbuds", rating: 4.8, imageUrl: "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?q=80&w=900&auto=format&fit=crop" },
    { id: "g3", name: "Wave Fury Smartwatch", price: 1099, mrp: 6999, category: "Smartwatch", rating: 4.6, imageUrl: "https://images.unsplash.com/photo-1546868871-7041f2a55e12?q=80&w=900&auto=format&fit=crop" },
    { id: "g4", name: "Storm Call 3", price: 1299, mrp: 8499, category: "Smartwatch", rating: 4.5, imageUrl: "https://images.unsplash.com/photo-1617043786394-f977fa12eddf?q=80&w=900&auto=format&fit=crop" },
    { id: "g5", name: "Stone 350 Speaker", price: 1399, mrp: 3490, category: "Speakers", rating: 4.7, imageUrl: "https://images.unsplash.com/photo-1589003077984-894e133dabab?q=80&w=900&auto=format&fit=crop" },
    { id: "g6", name: "PartyPal 65 Pro", price: 4799, mrp: 15999, category: "Speakers", rating: 4.6, imageUrl: "https://images.unsplash.com/photo-1545454675-3531b543be5d?q=80&w=900&auto=format&fit=crop" }
  ];
}

async function fetchProducts() {
  try {
    const json = await fetchJSON("/api/products");
    const arr = Array.isArray(json) ? json : (json.products || []);
    const mapped = arr.map((p) => ({
      ...p,
      id: p.id || p._id,
      imageUrl: p.imageUrl || p.image || "https://images.unsplash.com/photo-1517336714739-489689fd1ca8?q=80&w=900&auto=format&fit=crop",
      category: normalizeCategory(p.category),
      rating: p.rating || (3.8 + Math.random())
    }));
    return mapped.length ? mapped : fallbackProducts();
  } catch (err) {
    console.error("Fetch error:", err);
    return fallbackProducts();
  }
}

function setActiveFilter(category) {
  navButtons.forEach((btn) => btn.classList.toggle("is-active", btn.dataset.category === category));
  filterChips.forEach((chip) => chip.classList.toggle("is-active", chip.dataset.category === category));
  dealTabs.forEach((tab) => tab.classList.toggle("is-active", tab.dataset.tabCategory === category));
}

function filteredProducts() {
  return allProducts.filter((p) => {
    const matchCategory = activeCategory === "All" || p.category === activeCategory;
    const matchSearch = !searchTerm || p.name.toLowerCase().includes(searchTerm);
    return matchCategory && matchSearch;
  });
}

function renderProducts() {
  if (!productGrid) return;
  productGrid.innerHTML = "";
  if (emptyState) emptyState.hidden = true;
  const products = filteredProducts();
  if (products.length === 0) {
    if (emptyState) emptyState.hidden = false;
    return;
  }
  products.forEach((p) => {
    const el = document.createElement("div");
    el.innerHTML = productCardHtml(p);
    productGrid.appendChild(el.firstElementChild);
  });
}

function renderTrending() {
  if (!trendingTrack) return;
  const picks = allProducts.slice(0, 8);
  trendingTrack.innerHTML = picks.map((p) => {
    const pid = String(p._id || p.id);
    return `
      <article class="trendCard">
        <img src="${p.imageUrl}" alt="${escapeHtml(p.name)}" />
        <div class="trendCard__meta">
          <h4>${escapeHtml(p.name)}</h4>
          <p>${formatINR(p.price)}</p>
          <button data-add-product-id="${pid}">Add to Bag</button>
        </div>
      </article>
    `;
  }).join("");
  trendingTrack.style.transform = `translateX(-${trendOffset * 266}px)`;
}

function wireProductAdd() {
  if (!productGrid) return;
  productGrid.addEventListener("click", async (e) => {
    const wishBtn = e.target.closest("[data-wish-product-id]");
    if (wishBtn) {
      const id = String(wishBtn.getAttribute("data-wish-product-id"));
      if (wishlist.has(id)) wishlist.delete(id); else wishlist.add(id);
      saveWishlist();
      renderProducts();
      return;
    }
    const btn = e.target.closest("[data-add-product-id]");
    if (!btn) return;
    const productId = btn.getAttribute("data-add-product-id");
    if (window.addToCart) await window.addToCart(productId, 1);
  });

  trendingTrack?.addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-add-product-id]");
    if (!btn) return;
    const productId = btn.getAttribute("data-add-product-id");
    if (window.addToCart) await window.addToCart(productId, 1);
  });
}

function wireFilters() {
  filterChips.forEach((chip) => chip.addEventListener("click", () => {
    activeCategory = chip.dataset.category;
    setActiveFilter(activeCategory);
    renderProducts();
  }));

  navButtons.forEach((btn) => btn.addEventListener("click", () => {
    activeCategory = btn.dataset.category;
    setActiveFilter(activeCategory);
    renderProducts();
  }));

  if (shopNowBtn) {
    shopNowBtn.addEventListener("click", () => {
      activeCategory = "Earbuds";
      document.querySelector('[data-category="Earbuds"]')?.click();
      document.querySelector("main")?.scrollIntoView({ behavior: "smooth" });
    });
  }

  dealTabs.forEach((tab) => tab.addEventListener("click", () => {
    activeCategory = tab.dataset.tabCategory || "All";
    setActiveFilter(activeCategory);
    renderProducts();
  }));

  shopCatBtns.forEach((btn) => btn.addEventListener("click", () => {
    activeCategory = btn.dataset.categoryTarget || "All";
    setActiveFilter(activeCategory);
    renderProducts();
    productGrid?.scrollIntoView({ behavior: "smooth", block: "start" });
  }));

  searchInput?.addEventListener("input", (e) => {
    searchTerm = String(e.target.value || "").trim().toLowerCase();
    renderProducts();
  });

  trendPrev?.addEventListener("click", () => {
    trendOffset = Math.max(0, trendOffset - 1);
    if (trendingTrack) trendingTrack.style.transform = `translateX(-${trendOffset * 266}px)`;
  });
  trendNext?.addEventListener("click", () => {
    const maxOffset = Math.max(0, Math.min(4, allProducts.length - 4));
    trendOffset = Math.min(maxOffset, trendOffset + 1);
    if (trendingTrack) trendingTrack.style.transform = `translateX(-${trendOffset * 266}px)`;
  });

  heroDots?.addEventListener("click", (e) => {
    const dot = e.target.closest("[data-dot-index]");
    if (!dot) return;
    heroIndex = Number(dot.getAttribute("data-dot-index")) || 0;
    setHeroImage();
  });
}

window.addEventListener("load", async () => {
  setHeroImage();
  setInterval(() => {
    heroIndex = (heroIndex + 1) % heroSlides.length;
    setHeroImage();
  }, 3500);
  wireProductAdd();
  wireFilters();
  allProducts = await fetchProducts();
  localStorage.setItem("catalogCache", JSON.stringify(allProducts));
  window.getProductById = (id) => allProducts.find((p) => String(p.id || p._id) === String(id)) || null;
  updateWishlistBadge();
  renderTrending();
  setActiveFilter("All");
  renderProducts();
});
