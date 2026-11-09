# Bro Chicken CRM Design Direction

## Product

Bro Chicken CRM is an internal operations tool for outlet staff. The primary jobs are:

- Answer and resolve customer complaints before the 60-minute SLA.
- Keep customer records consistent.
- Run membership, QR promo, and end-month coupon operations.
- Simulate WhatsApp communication without claiming a real WhatsApp integration.

## Design Read

Internal F&B operations CRM for outlet staff, in a warm utilitarian enterprise style.

Dial: **ENERGY 1 / RHYTHM 2 / MOTION 1**

- ENERGY 1: calm, dense, work-focused. No decorative hero surfaces.
- RHYTHM 2: list views stay predictable; detail and simulation views use split layouts because the content requires it.
- MOTION 1: hover and focus transitions only. No page animations, pulses, parallax, or looping decoration.

## Identity

The interface should read as a working ledger for a food business: warm paper, dark ink, burnt-orange brand surface, and precise rules.

The sidebar is the single large brand field. The content area stays neutral so data remains the focus. Orange is used for the primary action, links, focus, and the sidebar. It is not used for status.

## Palette

| Token | Value | Use |
|---|---|---|
| `--ink-900` | `#1C1917` | Primary text |
| `--ink-700` | `#44403C` | Body text |
| `--ink-600` | `#57534E` | Muted text |
| `--paper` | `#FAF9F7` | Page background |
| `--surface` | `#FFFFFF` | Panels, tables, modals |
| `--surface-2` | `#F5F4F1` | Table head, secondary surfaces |
| `--line` | `#E7E5E4` | Standard dividers |
| `--line-strong` | `#D6D3D1` | Control borders |
| `--brand-900` | `#7C2D12` | Sidebar footer |
| `--brand-800` | `#9A3412` | Sidebar surface, primary hover |
| `--brand-700` | `#C2410C` | Primary button, links, focus |
| `--brand-600` | `#EA580C` | Large brand accents only |
| `--brand-100` | `#FFEDD5` | Brand-tinted surface |
| `--success` | `#15803D` | Success text |
| `--warning` | `#92400E` | Warning text |
| `--danger` | `#B91C1C` | Danger text |
| `--info` | `#0369A1` | Informational text |

Status colors appear only on status labels, notices, and destructive actions. They are not part of the brand palette.

White text on `--brand-700` and `--brand-800` meets WCAG AA. White text is not used on `--brand-600`.

## Typography

- Family: Inter. Reason: high x-height, clear numerals, and strong legibility in dense operational tables.
- Base: 14px / 1.5.
- Table: 13px. Metadata: 12px. Section title: 15px. Page title: 24px.
- Numbers in metrics, tables, and money use tabular numerals.
- No uppercase tracking as decoration. Group labels in the sidebar use sentence case.

## Shape and elevation

- Radius: 4px status label, 6px control, 8px panel and modal.
- No pill buttons, pill cards, or pill inputs.
- Shadow is reserved for the modal and toast, which genuinely float above the page.
- Tables are flat. Row dividers carry structure.

## Layout

- Sidebar: 248px, burnt orange, light-on-dark.
- Content max width: 1320px.
- Page padding: 32px desktop, 20px tablet, 16px mobile.
- Page header owns the page title. The utility bar owns outlet context and date.
- Sections use whitespace and a single horizontal rule. Cards are reserved for form panels, modals, and grouped control surfaces.
- Two-column layouts appear only where content supports comparison: detail pages, template studio, reports, and simulation.

## Components

- Page header: title, optional description, primary and secondary actions.
- Record header: back action, initials, title, metadata, actions.
- Section: title, optional description, optional actions, body.
- Metric strip: one row divided by rules, not four floating cards.
- Table: no outer border, sticky header optional, row actions aligned right.
- Status label: tinted background, no border, no glow.
- Notice: semantic tint plus one border, no colored left stripe.
- Modal: one surface, 8px radius, single shadow, Escape to close, focus trapped.
- Toast: bottom right, `role="status"`, semantic background.
- Empty, loading, and error states name the cause and the next action.

## Copy

- Indonesian UI copy.
- No emoji in interface text.
- No fabricated claims. The WhatsApp screens are labelled simulation.
- Buttons use specific verbs: "Catat keluhan", "Simpan transaksi", "Jalankan promo", not "Submit" or "Get started".
