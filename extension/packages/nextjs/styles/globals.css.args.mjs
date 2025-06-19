export const globalImports =
  '@import url("https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap");';

export const postContent = `
@plugin "daisyui/theme" {
  name: "light";
  --color-primary: #C8F5FF;
  --color-primary-content: #026262;
  --color-secondary: #89d7e9;
  --color-secondary-content: #088484;
  --color-accent: #026262;
  --color-accent-content: #E9FBFF;
  --color-neutral: #088484;
  --color-neutral-content: #F0FCFF;
  --color-base-100: #F0FCFF;
  --color-base-200: #E1FAFF;
  --color-base-300: #C8F5FF;
  --color-base-content: #088484;
  --color-info: #026262;
  --color-success: #34eeb6;
  --color-warning: #ffcf72;
  --color-error: #ff8863;
  --radius-field: 9999rem;
  --tt-tailw: 6px;
}
@plugin "daisyui/theme" {
  name: "dark";
  --color-primary: #026262;
  --color-primary-content: #C8F5FF;
  --color-secondary: #107575;
  --color-secondary-content: #E9FBFF;
  --color-accent: #C8F5FF;
  --color-accent-content: #088484;
  --color-neutral: #E9FBFF;
  --color-neutral-content: #11ACAC;
  --color-base-100: #11ACAC;
  --color-base-200: #088484;
  --color-base-300: #026262;
  --color-base-content: #E9FBFF;
  --color-info: #C8F5FF;
  --color-success: #34eeb6;
  --color-warning: #ffcf72;
  --color-error: #ff8863;
  --radius-field: 9999rem;
  --tt-tailw: 6px;
  --tt-bg: var(--color-primary);
}
@theme inline: {
  --font-space-grotesk: var(--font-space-grotesk);
}`;
