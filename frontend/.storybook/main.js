/**
 * Storybook config — P2-38 (file 23/24 checklist: "Storybook + axe CI").
 *
 * Scope is deliberately narrow: the shared UI system (System.tsx) is the
 * component set every list/detail/alert surface reuses, so it is what gets a
 * story. Page-level screens depend on auth/tenancy context and belong in the
 * vitest suite instead.
 */
export default {
  stories: ['../src/components/**/*.stories.@(js|jsx|ts|tsx)'],
  addons: ['@storybook/addon-a11y'],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  docs: {
    autodocs: 'tag',
  },
};
