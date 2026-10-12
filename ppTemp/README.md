# Standalone Modern SaaS & eCommerce Builder Landing Page Template

A clean, responsive, production-ready landing page template inspired by modern SaaS eCommerce platforms (Zatiq Easy style). Fully decoupled from any backend, built with pure semantic HTML5, Vanilla CSS, and modular Vanilla JavaScript.

---

## 📁 Folder Structure

```
ppTemp/
├── index.html            # Main standalone landing page (Complete semantic HTML5)
├── favicon.svg           # High-resolution vector favicon
├── favicon.ico           # Legacy favicon fallback
├── assets/
│   ├── css/
│   │   └── marketing.css # Complete Design System (Colors, Typography, Bento Grid, Responsive layouts)
│   └── js/
│       └── marketing.js  # Clean Vanilla JS (Mobile menu, FAQ accordion, Pricing toggles, Counters)
└── README.md             # Integration guide and documentation
```

---

## 🚀 Key Features

1. **Zero External Dependencies Required**:
   - Icons loaded via standard RemixIcon CDN.
   - Fonts loaded via Google Fonts (Inter & Noto Sans Bengali).
   - All charts, sparklines, and metric cards are rendered using pure CSS and lightweight SVG paths.
2. **Interactive Components Included**:
   - **Hero Interactive Card**: Switch between "Today" and "This Week" metrics.
   - **Live Metric Count-up**: IntersectionObserver triggers smooth counter animations when scrolled into view.
   - **Infinite Running Marquee**: Smooth CSS marquee showing partner stores.
   - **Toolkit Bento Grid**: Clean feature showcase cards.
   - **Dynamic Pricing Calculator**: Instant recalculation for Monthly, 6-Months (-10%), and Yearly (-25%) billing cycles.
   - **Smooth FAQ Accordion**: Expandable Q&A items.
   - **Mobile Drawer Menu**: Fully responsive hamburger toggle for tablets and smartphones.
   - **Sticky Glassmorphic Header**: Header automatically adds backdrop blur on scroll.

---

## 🛠️ How to Customize for Your Next Project

### 1. Change Brand Name & Accent Color
Open `assets/css/marketing.css` and modify the `:root` variables:
```css
:root {
    --blue: #155dfc;       /* Your brand primary color */
    --blue-700: #0b48c9;   /* Darker hover state */
    --blue-50: #eff6ff;    /* Soft brand background tint */
    /* ... */
}
```

### 2. Update Text, Headings & Links
Open `index.html` and customize:
- Title & meta description in the `<head>`
- Navbar brand name and action buttons
- Hero headlines, pricing tier prices (`data-price` attributes), and FAQ answers

### 3. How to Preview / Run Locally
You can open `index.html` directly in any web browser, or serve it using any simple static web server:
- **VS Code Live Server**: Right-click `index.html` -> "Open with Live Server"
- **Node/npx**: `npx serve ppTemp` or `npx http-server ppTemp`
- **Python**: `python -m http.server 3000` inside `ppTemp`
- **PHP**: `php -S localhost:3000` inside `ppTemp`
