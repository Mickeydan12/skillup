import { ngn, esc } from './format.js';
import { catIcon } from './icons.js';
// Course card with thumbnail; falls back to a gradient tile with the category icon when no image is set.
export const courseCard = c => `<a class="card course" href="/courses/${esc(c.slug)}" data-link>
  ${c.thumbnail_url ? `<img class="thumb" loading="lazy" alt="" src="${esc(c.thumbnail_url)}"/>` : `<div class="thumb ph">${catIcon(c.categories?.slug || '')}</div>`}
  <span class="badge">${esc(c.level)}</span><h3>${esc(c.title)}</h3><p class="muted">${esc(c.profiles?.full_name)}</p><strong>${c.is_free ? 'Free' : ngn(c.price)}</strong></a>`;
