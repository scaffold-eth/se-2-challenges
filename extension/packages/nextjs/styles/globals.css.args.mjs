export const postContent = `
@plugin "daisyui/theme" {
  name: "light";

  --color-primary: #c8f5ff;
  --color-primary-content: #026262;
  --color-secondary: #89d7e9;
  --color-secondary-content: #088484;
  --color-accent: #026262;
  --color-accent-content: #e9fbff;
  --color-neutral: #088484;
  --color-neutral-content: #f0fcff;
  --color-base-100: #f0fcff;
  --color-base-200: #e1faff;
  --color-base-300: #c8f5ff;
  --color-base-content: #088484;
  --color-info: #026262;
  --color-success: #34eeb6;
  --color-warning: #ffcf72;
  --color-error: #ff8863;

  /* radius / button rounding */
  --radius-field: 9999rem;
  --radius-box: 1rem;

  /* tooltip tail width */
  --tt-tailw: 6px;
}

/* —— DARK THEME —— */
@plugin "daisyui/theme" {
  name: "dark";

  --color-primary: #026262;
  --color-primary-content: #c8f5ff;
  --color-secondary: #107575;
  --color-secondary-content: #e9fbff;
  --color-accent: #c8f5ff;
  --color-accent-content: #088484;
  --color-neutral: #e9fbff;
  --color-neutral-content: #11acac;
  --color-base-100: #11acac;
  --color-base-200: #088484;
  --color-base-300: #026262;
  --color-base-content: #e9fbff;
  --color-info: #c8f5ff;
  --color-success: #34eeb6;
  --color-warning: #ffcf72;
  --color-error: #ff8863;

  --radius-field: 9999rem;
  --radius-box: 1rem;

  --tt-tailw: 6px;
  --tt-bg: var(--color-primary); /* if you need a tooltip bg override */
}

@theme inline {
  --font-space-grotesk: var(--font-space-grotesk);
}`;
