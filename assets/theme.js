/* ============================================
   Podium Theme – Vanilla JS (Custom Elements)
   ============================================ */

/* --- Utilities --- */

function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

function fetchConfig(type = 'json') {
  return {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': `application/${type}` }
  };
}

function bodyScrollLock(lock) {
  document.body.style.overflow = lock ? 'hidden' : '';
}

function trapFocus(element) {
  const focusable = element.querySelectorAll(
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
  );
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  element._trapHandler = (e) => {
    if (e.key !== 'Tab') return;
    if (e.shiftKey) {
      if (document.activeElement === first) { e.preventDefault(); last.focus(); }
    } else {
      if (document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  };
  element.addEventListener('keydown', element._trapHandler);
  first.focus();
}

function removeTrapFocus(element) {
  if (element._trapHandler) {
    element.removeEventListener('keydown', element._trapHandler);
    delete element._trapHandler;
  }
}

function formatMoney(cents, format) {
  if (typeof cents === 'string') cents = cents.replace('.', '');
  const value = (cents / 100).toFixed(2);
  const moneyFormat = format || window.Shopify.money_format || '€{{amount}}';
  return moneyFormat
    .replace(/\{\{\s*amount_no_decimals\s*\}\}/g, value.split('.')[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' '))
    .replace(/\{\{\s*amount_with_comma_separator\s*\}\}/g, value.replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.'))
    .replace(/\{\{\s*amount\s*\}\}/g, value.replace(/\B(?=(\d{3})+(?!\d))/g, ','));
}

/* --- Overlay --- */

function getOverlay() {
  return document.querySelector('[data-overlay]');
}

function showOverlay(callback) {
  const overlay = getOverlay();
  if (overlay) {
    overlay.classList.add('is-active');
    overlay.onclick = callback || null;
  }
}

function hideOverlay() {
  const overlay = getOverlay();
  if (overlay) {
    overlay.classList.remove('is-active');
    overlay.onclick = null;
  }
}

/* --- Sticky Header --- */

class StickyHeader extends HTMLElement {
  connectedCallback() {
    if (this.dataset.sticky !== 'true') return;
    this.header = this.querySelector('.header');
    if (!this.header) return;
    this.sentinel = document.createElement('div');
    this.sentinel.style.height = '1px';
    this.sentinel.style.position = 'absolute';
    this.sentinel.style.top = this.offsetTop + this.offsetHeight + 'px';
    this.sentinel.style.left = '0';
    this.sentinel.style.width = '100%';
    this.sentinel.style.pointerEvents = 'none';
    document.body.appendChild(this.sentinel);
    this.observer = new IntersectionObserver(([entry]) => {
      this.header.classList.toggle('is-sticky', !entry.isIntersecting);
    });
    this.observer.observe(this.sentinel);
  }
  disconnectedCallback() {
    if (this.observer) this.observer.disconnect();
    if (this.sentinel) this.sentinel.remove();
  }
}

/* --- Mobile Menu --- */

class MobileMenuDrawer extends HTMLElement {
  connectedCallback() {
    this.openBtn = document.querySelector('[data-mobile-menu-open]');
    this.closeBtn = this.querySelector('[data-mobile-menu-close]');
    if (this.openBtn) this.openBtn.addEventListener('click', () => this.open());
    if (this.closeBtn) this.closeBtn.addEventListener('click', () => this.close());
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.classList.contains('is-open')) this.close();
    });
  }
  open() {
    this.classList.add('is-open');
    bodyScrollLock(true);
    showOverlay(() => this.close());
    if (this.openBtn) this.openBtn.setAttribute('aria-expanded', 'true');
    trapFocus(this);
  }
  close() {
    this.classList.remove('is-open');
    bodyScrollLock(false);
    hideOverlay();
    if (this.openBtn) {
      this.openBtn.setAttribute('aria-expanded', 'false');
      this.openBtn.focus();
    }
    removeTrapFocus(this);
  }
}

/* --- Search Overlay --- */

class SearchOverlayElement extends HTMLElement {
  connectedCallback() {
    this.input = this.querySelector('.search-overlay__input');
    this.closeBtn = this.querySelector('[data-search-close]');
    document.querySelectorAll('[data-search-open]').forEach(btn => {
      btn.addEventListener('click', () => this.open());
    });
    if (this.closeBtn) this.closeBtn.addEventListener('click', () => this.close());
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.classList.contains('is-open')) this.close();
    });
  }
  open() {
    this.classList.add('is-open');
    bodyScrollLock(true);
    if (this.input) setTimeout(() => this.input.focus(), 100);
  }
  close() {
    this.classList.remove('is-open');
    bodyScrollLock(false);
    const trigger = document.querySelector('[data-search-open]');
    if (trigger) trigger.focus();
  }
}

/* --- Cart Drawer --- */

class CartDrawerElement extends HTMLElement {
  connectedCallback() {
    document.querySelectorAll('[data-cart-open]').forEach(btn => {
      btn.addEventListener('click', () => this.open());
    });
    this.querySelector('[data-cart-close]')?.addEventListener('click', () => this.close());
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.classList.contains('is-open')) this.close();
    });
    this.addEventListener('click', (e) => {
      const removeBtn = e.target.closest('[data-remove-item]');
      if (removeBtn) {
        e.preventDefault();
        this.removeItem(removeBtn.dataset.removeItem);
      }
    });
    this.setupQuantitySteppers();
  }

  open() {
    this.classList.add('is-open');
    bodyScrollLock(true);
    showOverlay(() => this.close());
    trapFocus(this);
  }

  close() {
    this.classList.remove('is-open');
    bodyScrollLock(false);
    hideOverlay();
    removeTrapFocus(this);
  }

  setupQuantitySteppers() {
    this.addEventListener('click', (e) => {
      const minus = e.target.closest('[data-qty-minus]');
      const plus = e.target.closest('[data-qty-plus]');
      if (minus || plus) {
        const stepper = (minus || plus).closest('.quantity-stepper');
        const input = stepper.querySelector('[data-qty-input]');
        const key = stepper.dataset.lineKey;
        let qty = parseInt(input.value) || 1;
        if (minus) qty = Math.max(0, qty - 1);
        if (plus) qty = qty + 1;
        input.value = qty;
        if (key) this.updateQuantity(key, qty);
      }
    });
  }

  async addToCart(formData) {
    try {
      const res = await fetch(window.Shopify.routes.cart_add_url + '.js', {
        ...fetchConfig(),
        body: JSON.stringify(formData)
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.description || 'Could not add to cart');
      }
      await this.refreshCart();
      this.open();
      document.dispatchEvent(new CustomEvent('cart:updated'));
    } catch (error) {
      console.error('Add to cart error:', error);
      alert(error.message);
    }
  }

  async updateQuantity(key, quantity) {
    try {
      const res = await fetch(window.Shopify.routes.cart_change_url + '.js', {
        ...fetchConfig(),
        body: JSON.stringify({ id: key, quantity })
      });
      if (!res.ok) throw new Error('Could not update cart');
      await this.refreshCart();
      document.dispatchEvent(new CustomEvent('cart:updated'));
    } catch (error) {
      console.error('Update cart error:', error);
    }
  }

  async removeItem(key) {
    await this.updateQuantity(key, 0);
  }

  async refreshCart() {
    try {
      const res = await fetch('/?sections=cart-drawer');
      const data = await res.json();
      const html = data['cart-drawer'];
      const temp = document.createElement('div');
      temp.innerHTML = html;
      const newBody = temp.querySelector('.cart-drawer__body');
      const newFooter = temp.querySelector('.cart-drawer__footer');
      const currentBody = this.querySelector('.cart-drawer__body');
      const currentFooter = this.querySelector('.cart-drawer__footer');
      if (newBody && currentBody) currentBody.innerHTML = newBody.innerHTML;
      if (newFooter && currentFooter) currentFooter.innerHTML = newFooter.innerHTML;

      // Update cart count in header
      const cartRes = await fetch('/cart.js');
      const cart = await cartRes.json();
      document.querySelectorAll('[data-cart-count]').forEach(el => {
        el.textContent = cart.item_count;
        el.style.display = cart.item_count > 0 ? '' : 'none';
      });
    } catch (error) {
      console.error('Refresh cart error:', error);
    }
  }
}

/* --- Product Form --- */

function initProductForms() {
  document.addEventListener('submit', async (e) => {
    const form = e.target.closest('[data-product-form]');
    if (!form) return;
    e.preventDefault();
    const btn = form.querySelector('[data-add-to-cart]');
    const btnText = btn ? btn.textContent : '';
    if (btn) {
      btn.disabled = true;
      btn.textContent = '...';
    }
    const formData = {};
    const fd = new FormData(form);
    for (const [key, value] of fd.entries()) {
      formData[key] = value;
    }
    // Ensure quantity
    if (!formData.quantity) formData.quantity = 1;
    const cartDrawer = document.querySelector('cart-drawer');
    if (cartDrawer) {
      await cartDrawer.addToCart({ items: [{ id: parseInt(formData.id), quantity: parseInt(formData.quantity) }] });
    }
    if (btn) {
      btn.disabled = false;
      btn.textContent = btnText;
    }
  });
}

/* --- Hero Slider --- */

class HeroSlider extends HTMLElement {
  connectedCallback() {
    this.track = this.querySelector('.hero-slider__track');
    this.slides = this.querySelectorAll('.hero-slider__slide');
    this.dots = this.querySelectorAll('[data-slide-dot]');
    this.prevBtn = this.querySelector('[data-slide-prev]');
    this.nextBtn = this.querySelector('[data-slide-next]');
    this.current = 0;
    this.total = this.slides.length;
    if (this.total <= 1) return;

    this.dots.forEach((dot, i) => {
      dot.addEventListener('click', () => this.goTo(i));
    });
    if (this.prevBtn) this.prevBtn.addEventListener('click', () => this.prev());
    if (this.nextBtn) this.nextBtn.addEventListener('click', () => this.next());

    // Autoplay
    if (this.dataset.autoplay === 'true') {
      this.interval = parseInt(this.dataset.interval) || 5000;
      this.startAutoplay();
      this.addEventListener('mouseenter', () => this.stopAutoplay());
      this.addEventListener('mouseleave', () => this.startAutoplay());
    }

    // Touch support
    let startX = 0;
    this.addEventListener('touchstart', (e) => { startX = e.touches[0].clientX; }, { passive: true });
    this.addEventListener('touchend', (e) => {
      const diff = startX - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 50) {
        diff > 0 ? this.next() : this.prev();
      }
    }, { passive: true });
  }

  goTo(index) {
    if (index < 0) index = this.total - 1;
    if (index >= this.total) index = 0;
    this.current = index;
    this.track.style.transform = `translateX(-${index * 100}%)`;
    this.dots.forEach((dot, i) => {
      dot.classList.toggle('active', i === index);
      dot.setAttribute('aria-selected', i === index);
    });
  }

  prev() { this.goTo(this.current - 1); }
  next() { this.goTo(this.current + 1); }
  startAutoplay() { this.timer = setInterval(() => this.next(), this.interval); }
  stopAutoplay() { clearInterval(this.timer); }

  disconnectedCallback() { this.stopAutoplay(); }
}

/* --- Featured Products (pill tab switching) --- */

class FeaturedProductsSection extends HTMLElement {
  connectedCallback() {
    this.pills = this.querySelectorAll('[data-pill]');
    this.grid = this.querySelector('[data-products-grid]');
    this.sectionId = this.dataset.sectionId;
    this.pills.forEach((pill, index) => {
      pill.addEventListener('click', () => this.switchPill(index, pill));
    });
  }

  async switchPill(index, pill) {
    this.pills.forEach(p => p.classList.remove('active'));
    pill.classList.add('active');
    if (!this.grid || !this.sectionId) return;
    this.grid.classList.add('is-loading');
    try {
      const url = `${window.location.pathname}?section_id=${this.sectionId}&pill_active=${index}`;
      const res = await fetch(url);
      const html = await res.text();
      const temp = document.createElement('div');
      temp.innerHTML = html;
      const newGrid = temp.querySelector('[data-products-grid]');
      if (newGrid) this.grid.innerHTML = newGrid.innerHTML;
    } catch (error) {
      console.error('Featured products fetch error:', error);
    }
    this.grid.classList.remove('is-loading');
  }
}

/* --- Product Gallery --- */

class ProductGalleryElement extends HTMLElement {
  connectedCallback() {
    this.mainImage = this.querySelector('[data-main-image]');
    this.thumbs = this.querySelectorAll('[data-thumb]');
    this.prevBtn = this.querySelector('[data-gallery-prev]');
    this.nextBtn = this.querySelector('[data-gallery-next]');
    this.images = Array.from(this.querySelectorAll('[data-thumb]')).map(t => ({
      src: t.dataset.fullSrc,
      alt: t.querySelector('img')?.alt || ''
    }));
    this.current = 0;

    this.thumbs.forEach((thumb, i) => {
      thumb.addEventListener('click', () => this.goTo(i));
    });
    if (this.prevBtn) this.prevBtn.addEventListener('click', () => this.goTo(this.current - 1));
    if (this.nextBtn) this.nextBtn.addEventListener('click', () => this.goTo(this.current + 1));

    // Touch on main image
    let startX = 0;
    const mainWrap = this.querySelector('.product-gallery__main');
    if (mainWrap) {
      mainWrap.addEventListener('touchstart', (e) => { startX = e.touches[0].clientX; }, { passive: true });
      mainWrap.addEventListener('touchend', (e) => {
        const diff = startX - e.changedTouches[0].clientX;
        if (Math.abs(diff) > 50) {
          diff > 0 ? this.goTo(this.current + 1) : this.goTo(this.current - 1);
        }
      }, { passive: true });
    }

    // Listen for variant image changes
    document.addEventListener('variant:imageChanged', (e) => {
      const idx = this.images.findIndex(img => img.src === e.detail.src);
      if (idx !== -1) this.goTo(idx);
    });
  }

  goTo(index) {
    if (index < 0) index = this.images.length - 1;
    if (index >= this.images.length) index = 0;
    this.current = index;
    if (this.mainImage && this.images[index]) {
      this.mainImage.src = this.images[index].src;
      this.mainImage.alt = this.images[index].alt;
    }
    this.thumbs.forEach((thumb, i) => {
      thumb.classList.toggle('active', i === index);
    });
  }
}

/* --- Variant Selector --- */

class VariantSelectorElement extends HTMLElement {
  connectedCallback() {
    const variantsScript = this.querySelector('[data-variants]');
    if (variantsScript) {
      try { this.variants = JSON.parse(variantsScript.textContent); } catch (e) { this.variants = []; }
    } else {
      this.variants = [];
    }
    this.options = {};
    this.hiddenInput = this.querySelector('input[name="id"]');
    this.priceEl = this.closest('form')?.parentElement?.querySelector('[data-product-price]');
    this.comparePriceEl = this.closest('form')?.parentElement?.querySelector('[data-compare-price]');
    this.addBtn = this.closest('form')?.querySelector('[data-add-to-cart]');

    this.querySelectorAll('[data-option]').forEach(el => {
      el.addEventListener('click', () => {
        const position = el.dataset.optionPosition;
        const value = el.dataset.value;
        // Update active state within same option group
        this.querySelectorAll(`[data-option-position="${position}"]`).forEach(opt => {
          opt.classList.toggle('active', opt.dataset.value === value);
        });
        this.options[position] = value;
        this.updateVariant();
      });
    });

    // Initialize with first variant options
    if (this.variants.length) {
      const firstVariant = this.variants[0];
      firstVariant.options.forEach((opt, i) => {
        this.options[String(i + 1)] = opt;
      });
    }
  }

  updateVariant() {
    const selectedOptions = Object.values(this.options);
    const variant = this.variants.find(v =>
      v.options.every((opt, i) => selectedOptions[i] === opt)
    );
    if (!variant) {
      if (this.addBtn) {
        this.addBtn.disabled = true;
        this.addBtn.textContent = this.addBtn.dataset.unavailableText || 'Unavailable';
      }
      return;
    }
    if (this.hiddenInput) this.hiddenInput.value = variant.id;

    // Update price
    if (this.priceEl) this.priceEl.textContent = formatMoney(variant.price);
    if (this.comparePriceEl) {
      if (variant.compare_at_price && variant.compare_at_price > variant.price) {
        this.comparePriceEl.innerHTML = '<s>' + formatMoney(variant.compare_at_price) + '</s>';
        this.comparePriceEl.style.display = '';
      } else {
        this.comparePriceEl.style.display = 'none';
      }
    }

    // Update availability
    if (this.addBtn) {
      this.addBtn.disabled = !variant.available;
      if (variant.available) {
        this.addBtn.textContent = this.addBtn.dataset.addText || 'AJOUTER AU PANIER';
      } else {
        this.addBtn.textContent = this.addBtn.dataset.soldoutText || 'ÉPUISÉ';
      }
    }

    // Update URL without reload
    const url = new URL(window.location);
    url.searchParams.set('variant', variant.id);
    window.history.replaceState({}, '', url);

    // Dispatch image change event if variant has featured image
    if (variant.featured_image) {
      document.dispatchEvent(new CustomEvent('variant:imageChanged', {
        detail: { src: variant.featured_image.src }
      }));
    }
  }
}

/* --- Filter Drawer --- */

class FilterDrawerElement extends HTMLElement {
  connectedCallback() {
    document.querySelectorAll('[data-filter-open]').forEach(btn => {
      btn.addEventListener('click', () => this.open());
    });
    this.querySelector('[data-filter-close]')?.addEventListener('click', () => this.close());
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.classList.contains('is-open')) this.close();
    });

    // Clear all filters
    this.querySelector('[data-filter-clear]')?.addEventListener('click', (e) => {
      e.preventDefault();
      const form = this.querySelector('form');
      if (form) {
        form.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
        form.querySelectorAll('input[type="number"]').forEach(inp => inp.value = '');
      }
      const baseUrl = window.location.pathname;
      window.location.href = baseUrl;
    });

    // Sort select
    this.querySelector('[data-sort-select]')?.addEventListener('change', (e) => {
      const url = new URL(window.location);
      url.searchParams.set('sort_by', e.target.value);
      window.location.href = url.toString();
    });
  }
  open() {
    this.classList.add('is-open');
    bodyScrollLock(true);
    showOverlay(() => this.close());
    trapFocus(this);
  }
  close() {
    this.classList.remove('is-open');
    bodyScrollLock(false);
    hideOverlay();
    removeTrapFocus(this);
  }
}

/* --- Accordion --- */

class AccordionToggle extends HTMLElement {
  connectedCallback() {
    this.trigger = this.querySelector('[data-accordion-trigger]');
    this.panel = this.querySelector('.accordion__panel');
    if (!this.trigger || !this.panel) return;
    this.trigger.addEventListener('click', () => this.toggle());
  }

  toggle() {
    const isOpen = this.classList.contains('is-open');
    if (isOpen) {
      this.panel.style.maxHeight = '0';
      this.panel.setAttribute('hidden', '');
      this.trigger.setAttribute('aria-expanded', 'false');
      this.classList.remove('is-open');
      this.panel.classList.remove('is-open');
    } else {
      this.panel.removeAttribute('hidden');
      this.panel.style.maxHeight = this.panel.scrollHeight + 'px';
      this.trigger.setAttribute('aria-expanded', 'true');
      this.classList.add('is-open');
      this.panel.classList.add('is-open');
    }
  }
}

/* --- Quantity Stepper --- */

class QuantityStepperElement extends HTMLElement {
  connectedCallback() {
    this.input = this.querySelector('[data-qty-input]');
    this.minusBtn = this.querySelector('[data-qty-minus]');
    this.plusBtn = this.querySelector('[data-qty-plus]');
    // Standalone quantity stepper (not in cart drawer)
    if (this.minusBtn) this.minusBtn.addEventListener('click', () => this.update(-1));
    if (this.plusBtn) this.plusBtn.addEventListener('click', () => this.update(1));
  }
  update(delta) {
    if (!this.input) return;
    let val = parseInt(this.input.value) || 1;
    val = Math.max(1, val + delta);
    this.input.value = val;
    this.input.dispatchEvent(new Event('change', { bubbles: true }));
  }
}

/* --- Password Reveal --- */

function initPasswordReveal() {
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-password-toggle]');
    if (!btn) return;
    const input = btn.parentElement.querySelector('input');
    if (!input) return;
    const isPassword = input.type === 'password';
    input.type = isPassword ? 'text' : 'password';
    btn.setAttribute('aria-label', isPassword ? 'Hide password' : 'Show password');
    // Toggle icon
    const eyeIcon = btn.querySelector('.icon-eye');
    const eyeOffIcon = btn.querySelector('.icon-eye-off');
    if (eyeIcon) eyeIcon.style.display = isPassword ? 'none' : '';
    if (eyeOffIcon) eyeOffIcon.style.display = isPassword ? '' : 'none';
  });
}

/* --- Newsletter Form --- */

function initNewsletterForms() {
  document.querySelectorAll('[data-newsletter-form]').forEach(form => {
    form.addEventListener('submit', (e) => {
      // Let Shopify handle the form submission naturally
      // This just adds a visual confirmation
      const btn = form.querySelector('button[type="submit"]');
      if (btn) btn.disabled = true;
    });
  });
}

/* --- Register Custom Elements --- */

document.addEventListener('DOMContentLoaded', () => {
  customElements.define('sticky-header', StickyHeader);
  customElements.define('mobile-menu', MobileMenuDrawer);
  customElements.define('search-overlay', SearchOverlayElement);
  customElements.define('cart-drawer', CartDrawerElement);
  customElements.define('hero-slider', HeroSlider);
  customElements.define('featured-products', FeaturedProductsSection);
  customElements.define('product-gallery', ProductGalleryElement);
  customElements.define('variant-selector', VariantSelectorElement);
  customElements.define('filter-drawer', FilterDrawerElement);
  customElements.define('accordion-toggle', AccordionToggle);
  customElements.define('quantity-stepper', QuantityStepperElement);

  initProductForms();
  initPasswordReveal();
  initNewsletterForms();
});
