class PageView {
  constructor(container) {
    this.container = container;
    this.wrapper = container.querySelector('.slides-wrapper');
    this.slides = container.querySelectorAll('.slide');
    this.dots = container.querySelectorAll('.dot');
    this.currentIndex = 0;
    this.totalSlides = this.slides.length;
    this.isDragging = false;
    this.startX = 0;
    this.currentX = 0;
    this.diffX = 0;
    this.locked = false; // Prevent swipe on certain pages

    this.init();
  }

  init() {
    // Touch events
    this.wrapper.addEventListener('touchstart', (e) => this.onTouchStart(e), { passive: true });
    this.wrapper.addEventListener('touchmove', (e) => this.onTouchMove(e), { passive: false });
    this.wrapper.addEventListener('touchend', (e) => this.onTouchEnd(e));

    // Mouse events (for desktop testing)
    this.wrapper.addEventListener('mousedown', (e) => this.onMouseDown(e));
    this.wrapper.addEventListener('mousemove', (e) => this.onMouseMove(e));
    this.wrapper.addEventListener('mouseup', (e) => this.onMouseUp(e));
    this.wrapper.addEventListener('mouseleave', (e) => this.onMouseUp(e));

    this.updateDots();
    this.updateSlide();
  }

  onTouchStart(e) {
    if (this.locked) return;
    this.isDragging = true;
    this.startX = e.touches[0].clientX;
    this.wrapper.classList.add('no-transition');
  }

  onTouchMove(e) {
    if (!this.isDragging || this.locked) return;
    this.currentX = e.touches[0].clientX;
    this.diffX = this.currentX - this.startX;

    // Prevent page scroll while swiping
    if (Math.abs(this.diffX) > 10) {
      e.preventDefault();
    }

    const offset = -(this.currentIndex * 100) + (this.diffX / this.container.offsetWidth) * 100;
    this.wrapper.style.transform = `translateX(${offset}%)`;
  }

  onTouchEnd() {
    if (!this.isDragging || this.locked) return;
    this.isDragging = false;
    this.wrapper.classList.remove('no-transition');
    this.handleSwipeEnd();
  }

  onMouseDown(e) {
    if (this.locked) return;
    const tag = e.target.tagName.toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select' || tag === 'button' || e.target.closest('button')) return;
    this.isDragging = true;
    this.startX = e.clientX;
    this.wrapper.classList.add('no-transition');
    e.preventDefault();
  }

  onMouseMove(e) {
    if (!this.isDragging || this.locked) return;
    this.currentX = e.clientX;
    this.diffX = this.currentX - this.startX;
    const offset = -(this.currentIndex * 100) + (this.diffX / this.container.offsetWidth) * 100;
    this.wrapper.style.transform = `translateX(${offset}%)`;
  }

  onMouseUp() {
    if (!this.isDragging || this.locked) return;
    this.isDragging = false;
    this.wrapper.classList.remove('no-transition');
    this.handleSwipeEnd();
  }

  handleSwipeEnd() {
    const threshold = this.container.offsetWidth * 0.2;

    if (this.diffX > threshold && this.currentIndex > 0) {
      this.currentIndex--;
    } else if (this.diffX < -threshold && this.currentIndex < this.totalSlides - 1) {
      this.currentIndex++;
    }

    this.diffX = 0;
    this.updateSlide();
    this.updateDots();
  }

  goTo(index) {
    if (index >= 0 && index < this.totalSlides) {
      this.currentIndex = index;
      this.updateSlide();
      this.updateDots();
    }
  }

  next() {
    if (this.currentIndex < this.totalSlides - 1) {
      this.currentIndex++;
      this.updateSlide();
      this.updateDots();
    }
  }

  prev() {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      this.updateSlide();
      this.updateDots();
    }
  }

  updateSlide() {
    this.wrapper.style.transform = `translateX(-${this.currentIndex * 100}%)`;
  }

  updateDots() {
    const dotsContainer = this.container.querySelector('.dots-indicator');
    if (this.currentIndex === 0) {
      // Hide dots on landing page
      dotsContainer.classList.remove('visible');
    } else {
      // Show dots on pages 2-6, active dot offset by 1
      dotsContainer.classList.add('visible');
      this.dots.forEach((dot, i) => {
        dot.classList.toggle('active', i === this.currentIndex - 1);
      });
    }
  }

  lock() {
    this.locked = true;
  }

  unlock() {
    this.locked = false;
  }
}
