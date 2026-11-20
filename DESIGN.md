---
name: Pretty Corner Design System
description: Warm, editorial beauty boutique and administrative design system for Myanmar retail
colors:
  primary: "#B73D67"
  primary-hover: "#982F53"
  primary-subtle: "#FCEEF2"
  primary-border: "#F1D3DF"
  neutral-dark: "#38262E"
  neutral-muted: "#7A6870"
  neutral-subtle: "#514149"
  neutral-bg: "#FAF7F8"
  neutral-surface: "#FFFFFF"
  neutral-card-subtle: "#F7F4F5"
  neutral-card-hover: "#F9F5F7"
  border-default: "#EEDFE5"
  border-subtle: "#F5EDF0"
  status-success: "#3B775D"
  status-success-bg: "#EDF5EF"
  status-warning: "#91631D"
  status-warning-bg: "#FFF6E7"
  status-error: "#B73D67"
  status-error-bg: "#FCEEF2"
  map-canvas: "#EEEAE3"
typography:
  display-large:
    fontFamily: "Cormorant Garamond, Georgia, serif"
    fontSize: "2.125rem"
    fontWeight: 500
    lineHeight: 1.25
    letterSpacing: "0em"
  display-medium:
    fontFamily: "Cormorant Garamond, Georgia, serif"
    fontSize: "1.8125rem"
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: "0em"
  headline:
    fontFamily: "Cormorant Garamond, Georgia, serif"
    fontSize: "1.375rem"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "0em"
  title:
    fontFamily: "DM Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 700
    lineHeight: 1.45
    letterSpacing: "0em"
  body-large:
    fontFamily: "DM Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.45
    letterSpacing: "0em"
  body:
    fontFamily: "DM Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: 1.45
    letterSpacing: "0em"
  label:
    fontFamily: "DM Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 700
    lineHeight: 1.4
    letterSpacing: "0em"
  caption:
    fontFamily: "DM Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: "0em"
  overline:
    fontFamily: "DM Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.625rem"
    fontWeight: 700
    lineHeight: 1.4
    letterSpacing: "0.1em"
rounded:
  xs: "4px"
  sm: "6px"
  md: "8px"
  lg: "10px"
  xl: "12px"
  pill: "13px"
  full: "9999px"
spacing:
  xs: "6px"
  sm: "8px"
  md: "12px"
  base: "14px"
  lg: "16px"
  xl: "20px"
  2xl: "24px"
  3xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.neutral-surface}"
    rounded: "{rounded.lg}"
    padding: "12px 24px"
    height: "46px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
    textColor: "{colors.neutral-surface}"
  button-secondary:
    backgroundColor: "{colors.neutral-surface}"
    textColor: "{colors.neutral-dark}"
    rounded: "{rounded.md}"
    padding: "10px 18px"
    height: "42px"
  button-subtle:
    backgroundColor: "{colors.primary-subtle}"
    textColor: "{colors.primary}"
    rounded: "{rounded.md}"
    padding: "10px 18px"
  input:
    backgroundColor: "{colors.neutral-surface}"
    textColor: "{colors.neutral-subtle}"
    rounded: "{rounded.md}"
    padding: "12px 14px"
    height: "46px"
  card:
    backgroundColor: "{colors.neutral-surface}"
    textColor: "{colors.neutral-dark}"
    rounded: "{rounded.xl}"
    padding: "20px 20px"
  badge-success:
    backgroundColor: "{colors.status-success-bg}"
    textColor: "{colors.status-success}"
    rounded: "{rounded.pill}"
    padding: "4px 10px"
    height: "25px"
  badge-pending:
    backgroundColor: "{colors.primary-subtle}"
    textColor: "{colors.primary}"
    rounded: "{rounded.pill}"
    padding: "4px 10px"
    height: "25px"
  badge-warning:
    backgroundColor: "{colors.status-warning-bg}"
    textColor: "{colors.status-warning}"
    rounded: "{rounded.pill}"
    padding: "4px 10px"
    height: "25px"
  badge-neutral:
    backgroundColor: "{colors.neutral-card-subtle}"
    textColor: "{colors.neutral-muted}"
    rounded: "{rounded.pill}"
    padding: "4px 10px"
    height: "25px"
---

# Pretty Corner Design System

## Overview

The **Pretty Corner Design System** powers both the customer-facing mobile shopping experience and the administrative back-office management portal for Pretty Corner, a boutique beauty, skincare, and contact lens retailer based in Myanmar.

The visual direction balances **editorial warmth** and **administrative clarity**:
- **Editorial Elegance:** Evoked through serif display typography (*Cormorant Garamond*), soft rose and petal tints (`#FCEEF2`, `#F1D3DF`), and delicate hairlines (`#EEDFE5`).
- **Operational Precision:** Grounded in a highly legible sans-serif (*DM Sans*), high-contrast plum text (`#38262E`), distinct semantic status badges (sage green, warm amber, berry rose), and structured 12px rounded cards.
- **Myanmar Localization:** Form elements, order summaries, and delivery checkout flows are built specifically around Myanmar retail patterns, including MMK currency formatting, township/city address selection, GPS pin capture, nearby landmarks, and local mobile wallet options (KBZPay, WavePay, CB Pay, AYA Pay, COD).

---

## Colors

The palette uses warm plum-infused neutrals paired with a rich berry rose accent, avoiding clinical cold grays in favor of an inviting cosmetic boutique feel.

### Palette Architecture

| Token Name | Hex Value | Role & Usage |
| :--- | :--- | :--- |
| `primary` | `#B73D67` | Core brand identity, primary call-to-action buttons, active navigation state, active tab indicators, and focal text links. |
| `primary-hover` | `#982F53` | Hover / pressed state for primary buttons and dark interactive elements. |
| `primary-subtle` | `#FCEEF2` | Soft rose background for active navigation pills, pending badges, notification counters, and promotional banners. |
| `primary-border` | `#F1D3DF` | Delicate rose border used for subtle container dividers and hover boundaries. |
| `neutral-dark` | `#38262E` | High-contrast espresso plum used for headings, primary text, prominent metric values, and table data. |
| `neutral-muted` | `#7A6870` | Muted plum-gray used for body subheadings, breadcrumbs, table headers, helper text, and inactive icons. |
| `neutral-subtle` | `#514149` | Medium plum used for filled form values, descriptions, and secondary paragraphs. |
| `neutral-bg` | `#FAF7F8` | Warm porcelain page background providing subtle contrast against pure white cards. |
| `neutral-surface` | `#FFFFFF` | Pure white background for cards, tables, modals, flyouts, and inputs. |
| `neutral-card-subtle` | `#F7F4F5` | Muted container fill for secondary metric pills, inactive tab counters, and subtle cards. |
| `neutral-card-hover` | `#F9F5F7` | Hover tint for table rows and secondary interactive list items. |
| `border-default` | `#EEDFE5` | Standard structural border for cards, form inputs, header dividers, and sidebar boundary. |
| `border-subtle` | `#F5EDF0` | Hairline divider for table rows, itemized invoices, and nested option cards. |

### Semantic & Status Colors

| State | Text Token | Background Token | Usage Examples |
| :--- | :--- | :--- | :--- |
| **Success / Paid / Delivered** | `#3B775D` (`status-success`) | `#EDF5EF` (`status-success-bg`) | "Paid", "Delivered", "In Stock", positive percentage trends (`↑ 12.8%`). |
| **Pending / Under Review** | `#B73D67` (`status-error` / `primary`) | `#FCEEF2` (`status-error-bg` / `primary-subtle`) | "Pending", "Pending review", unread badge counters. |
| **Warning / Low Stock** | `#91631D` (`status-warning`) | `#FFF6E7` (`status-warning-bg`) | "LOW STOCK", stock adjustment warnings, threshold alerts. |
| **Neutral / Processing** | `#7A6870` (`neutral-muted`) | `#F7F4F5` (`neutral-card-subtle`) | "Processing", "Archived", secondary count badges. |
| **Map & Dispatch Canvas** | `#EEEAE3` (`map-canvas`) | `#FFFFFF` (roads) | Delivery map preview container for Myanmar street pins and landmarks. |

---

## Typography

The typography system pairs **Cormorant Garamond** for editorial poise with **DM Sans** for utilitarian scanning speed and data density.

### Font Families
- **Display / Editorial Serifs:** `Cormorant Garamond, Georgia, serif`
- **Interface / Body / Sans:** `DM Sans, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`

### Type Scale

| Role | Font Family | Size | Weight | Line Height | Tracking | Usage |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Display Large** | Cormorant Garamond | `34px` (`2.125rem`) | Medium (500) | `1.25` | `0` | Major storefront hero headlines, editorial banners, page statements ("A beautiful day for business."). |
| **Display Medium** | Cormorant Garamond | `29px` (`1.8125rem`) | Medium (500) | `1.30` | `0` | Drawer titles, modal titles, storefront screen headers ("Your beauty bag", "Checkout"). |
| **Headline** | Cormorant Garamond | `22px` (`1.375rem`) | Medium (500) | `1.40` | `0` | Section headings, card group titles, catalog collections ("The skincare corner"). |
| **Title** | DM Sans | `18px` (`1.125rem`) | Bold (700) | `1.45` | `0` | Page section titles, admin screen headings ("Products", "Inventory ledger"). |
| **Body Large** | DM Sans | `14px` (`0.875rem`) | Regular (400) | `1.45` | `0` | Primary product descriptions, intro paragraphs, input values, order item titles. |
| **Body Medium** | DM Sans | `13px` (`0.8125rem`) | Regular (400) | `1.45` | `0` | Secondary item descriptions, customer details, table cell body text. |
| **Label Bold** | DM Sans | `13px` / `14px` | Bold (700) | `1.40` | `0` | Primary button labels, table bold cells, price tags ("28,000 MMK"), tab labels. |
| **Caption** | DM Sans | `12px` (`0.75rem`) | Regular (400) | `1.40` | `0` | Helper text, timestamps, subtitle metadata, input hints. |
| **Micro Caption** | DM Sans | `11px` (`0.6875rem`) | Regular (400) | `1.40` | `0` | Navigation sub-labels, delivery coordinates, audit timestamps. |
| **Overline / Tag** | DM Sans | `10px` (`0.625rem`) | Bold (700) | `1.40` | `0.1em` | Uppercase category eyebrows ("STORE WORKSPACE", "PRETTY ESSENTIALS / SKINCARE"). |
| **Pill Badge** | DM Sans | `10px` / `11px` | Bold (700) | `1.40` | `0` | Status capsules ("BESTSELLER", "PAID", "LOW STOCK", "DELIVERED"). |

---

## Layout

The Pretty Corner experience encompasses two responsive form factors: a **1360px Desktop Workspace** for operations and a **393px Mobile Shell** for customer checkout and handheld audits.

### Desktop Admin Layout (1360px Canvas)
- **Fixed Sidebar Navigation:**
  - Width: `222px`
  - Fill: `#FFFFFF`
  - Right Border: `1px solid #EEDFE5`
  - Vertical Padding: `24px`
  - Item Height: `41px` with `8px` corner radius and `10px` gap.
- **Top Header Bar:**
  - Height: `88px`
  - Fill: `#FFFFFF`
  - Bottom Border: `1px solid #EEDFE5`
  - Horizontal Padding: `24px`
  - Contains: Breadcrumb trail (`#7A6870`), notification bell with unread dot (`#B73D67`), and "View storefront ↗" link.
- **Main Canvas:**
  - Width: `1138px`
  - Fill: `#FAF7F8`
  - Internal Padding: `24px` (or `20px` compact)
  - Grid Systems:
    - 4-Column KPI row: `repeat(4, 1fr)` with `20px` gap (each card ~249px width).
    - Asymmetric 2-Column row: `700px` (charts/tables) + `350px` (sidebar cards/rankings) with `20px` gap.

### Mobile Consumer Layout (393px Canvas)
- **Viewport Width:** `393px`
- **Horizontal Margins:** `20px` gutter on all screens.
- **Header:** `76px` to `158px` depending on search/editorial banner density.
- **Sticky Bottom Action / Navigation Bar:** `86px` to `92px` height with bottom home indicator (`129px × 4px`, radius `2px`).

### Spacing Scale
- `xs` (`6px`): Micro badge padding, icon-to-label separation.
- `sm` (`8px`): Form label margin-bottom, small button vertical padding, pill counter inset.
- `md` (`12px`): Input field internal padding, row spacing, card child separation.
- `base` (`14px`): Standard auto-layout gap for lists and grouped items.
- `lg` (`16px`): Standard card padding on mobile, modal gutter.
- `xl` (`20px`): Desktop card internal padding, layout column gaps, page edge gutters.
- `2xl` (`24px`): Admin workspace container margins, section spacing.
- `3xl` (`32px`): Section separators, editorial headline margins.

---

## Elevation & Depth

Pretty Corner prioritizes **tonal layering and crisp hairline borders** over heavy drop shadows. Depth is communicated cleanly and subtly:

- **Border-First Architecture:** Rather than floating elements with dramatic blurs, cards and inputs feature a refined `1px solid #EEDFE5` stroke.
- **Canvas Tonal Separation:** Pure white `#FFFFFF` cards rest against the slightly tinted `#FAF7F8` warm porcelain canvas, establishing natural contrast without visual clutter.
- **Subtle Layered Containers:** Nested containers (such as summary boxes, search bars, and table header rows) utilize soft tint fills (`#F7F4F5`, `#FAF7F8`, or `#FCEEF2`).
- **Overlays & Dialogs:**
  - Backdrop: `rgba(56, 38, 46, 0.4)` (deep plum with 40% opacity).
  - Modal Container: `#FFFFFF` fill, `12px` corner radius, `1px solid #EEDFE5`, with subtle diffuse elevation: `0 8px 30px rgba(56, 38, 46, 0.08)`.

---

## Shapes

Shapes across the interface are soft, friendly, and approachable, avoiding aggressive sharp corners while preserving structural clarity.

| Shape Role | Radius Token | Value | Applied Components |
| :--- | :--- | :--- | :--- |
| **Base Radius** | `md` | `8px` | Text inputs, dropdown select triggers, secondary outline buttons, search fields. |
| **Interactive Buttons** | `lg` | `10px` | Primary action buttons ("Find your glow →", "Guest checkout →", "Add to bag"). |
| **Containers & Cards** | `xl` | `12px` | KPI cards, order tables, bestsellers containers, product gallery frames, dialog sheets. |
| **Status Pills & Counters** | `pill` | `13px`–`15px` | Order status badges, filter chips, counter badges ("12", "86"), checkout step pills. |
| **Micro Shapes** | `xs` / `sm` | `4px`–`6px` | Product thumbnail preview corners, checkboxes, delivery pin tags. |
| **Full Circular** | `full` | `9999px` | Notification alert dots, user avatars, color swatch selectors. |

---

## Components

### 1. Primary Action Button
- **Height:** `46px` (mobile checkout/action: `48px`–`50px`).
- **Padding:** `12px 24px`.
- **Background:** `#B73D67` (`primary`).
- **Hover Background:** `#982F53` (`primary-hover`).
- **Corner Radius:** `10px` (`rounded.lg`).
- **Typography:** `DM Sans Bold 13px` / `14px`, text color `#FFFFFF`.
- **Icon Alignment:** Trailing arrow `→` with `8px` gap.

### 2. Secondary Outline Button
- **Height:** `42px`.
- **Padding:** `10px 18px`.
- **Background:** `#FFFFFF` (`neutral-surface`).
- **Border:** `1px solid #EEDFE5` (`border-default`).
- **Corner Radius:** `8px` (`rounded.md`).
- **Typography:** `DM Sans Bold 13px`, text color `#38262E`.
- **Usage:** "Export orders ↓", "Date filter", "Reset Demo Data".

### 3. Soft Accent / Tertiary Button
- **Height:** `34px` to `42px`.
- **Background:** `#FCEEF2` (`primary-subtle`).
- **Border:** None (or `1px solid #F1D3DF`).
- **Corner Radius:** `8px` or `13px` (pill).
- **Typography:** `DM Sans Bold 13px`, text color `#B73D67`.
- **Usage:** Category filter pills, "+ Add variant", "Return to storefront".

### 4. Form Text Field
- **Height:** `46px` (compact: `42px`, touch: `48px`).
- **Padding:** `12px 14px`.
- **Background:** `#FFFFFF`.
- **Border:** `1px solid #EEDFE5`.
- **Focus Border:** `1.5px solid #B73D67` with subtle ring `rgba(183, 61, 103, 0.15)`.
- **Corner Radius:** `8px` (`rounded.md`).
- **Typography:** `DM Sans Regular 14px`, text color `#514149`, placeholder color `#7A6870`.
- **Label:** `DM Sans Bold 12px`, `#38262E`, bottom margin `6px`.

### 5. Metric KPI Card
- **Dimensions:** Width ~`249px`, Height ~`153px`.
- **Background:** `#FFFFFF`, corner radius `12px`, padding `18px 20px`.
- **Structure:**
  - Header: Label (`DM Sans Regular 13px`, `#7A6870`).
  - Value: Metric number (`DM Sans Bold 32px` or `Cormorant Garamond 34px`, `#38262E`).
  - Subtitle: Currency/context note (`DM Sans Regular 12px`, `#7A6870`).
  - Trend Indicator: Growth tag (`DM Sans Bold 12px`, `#3B775D` with `↑` glyph).

### 6. Status Pills & Badges
- **Height:** `25px`.
- **Padding:** `4px 10px`.
- **Corner Radius:** `13px` (`rounded.pill`).
- **Variants:**
  - **Paid / Confirmed / In Stock:** Fill `#EDF5EF`, Text `#3B775D` (`DM Sans Bold 11px`).
  - **Pending / Pending Review:** Fill `#FCEEF2`, Text `#B73D67` (`DM Sans Bold 11px`).
  - **Low Stock:** Fill `#FFF6E7`, Text `#91631D` (`DM Sans Bold 11px`).
  - **Processing / Shipped:** Fill `#F7F4F5`, Text `#7A6870` (`DM Sans Bold 11px`).

### 7. Tables & Data Lists
- **Container:** Fill `#FFFFFF`, border `1px solid #EEDFE5`, radius `12px`, overflow hidden.
- **Header Row:** Height `36px`, fill `#FAF7F8`, text `DM Sans Bold 11px`, `#7A6870`, uppercase.
- **Data Rows:** Height `48px`–`54px`, border-bottom `1px solid #F5EDF0`.
- **Hover State:** Fill `#F9F5F7`.
- **Text Cells:** `DM Sans Regular 13px`, `#38262E`.

### 8. Stepper Indicator (Checkout & Multi-Step Workflows)
- **Container:** Height `30px`, step pill `103px × 30px`, radius `15px`.
- **Active Step:** Fill `#FCEEF2`, text `#B73D67` (`DM Sans Bold 11px`).
- **Inactive Step:** Fill `#FFFFFF`, text `#7A6870` (`DM Sans Regular 11px`).
- **Connecting Line:** `1px solid #EEDFE5`.

---

## Do's and Don'ts

### Do's
- **DO use Cormorant Garamond for editorial moments:** Reserve serif typography for screen titles, high-level marketing statements, and section intros.
- **DO use DM Sans for operational data:** Use sans-serif for numbers, prices, order references, SKUs, inventory tables, and form inputs to ensure quick scanning.
- **DO use MMK formatting consistently:** Format prices with commas and the trailing code (e.g., `28,000 MMK`).
- **DO preserve warm neutrals:** Pair `#38262E` text with `#FAF7F8` backgrounds and `#EEDFE5` borders; avoid pure cold black (`#000000`) and sterile gray borders (`#D1D5DB`).
- **DO distinguish payment status from fulfillment status:** Track payment states (`Paid`, `Pending`, `Refunded`) independently from delivery states (`Processing`, `Shipped`, `Delivered`).
- **DO support Myanmar delivery context:** Include fields and previews for township selection, GPS coordinate capture, and street landmarks (e.g., "Near Hledan Centre").

### Don'ts
- **DON'T introduce heavy black drop shadows:** Avoid `box-shadow: 0 10px 25px rgba(0,0,0,0.2)`. Rely on tonal surfaces and delicate rose hairlines instead.
- **DON'T mix cold blue accents with the boutique palette:** Keep primary interactions anchored in `#B73D67` (Berry Rose) and secondary highlights in `#FCEEF2`.
- **DON'T use sharp `0px` rectangular corners for cards or buttons:** Maintain the established `8px`–`12px` radius hierarchy across components.
- **DON'T truncate order numbers or addresses without tooltip reveal:** Ensure critical dispatch information remains accessible to operations staff.
- **DON'T hardcode generic dollar symbols (`$`):** Pretty Corner operates exclusively on Myanmar Kyat (`MMK`).
