export function generateThemeVariables() {
  const root = document.documentElement;
  
  // Set static primary colors
  root.style.setProperty('--color-primary', '#174265');
  root.style.setProperty('--color-primary-50', '#f0f7ff');
  root.style.setProperty('--color-primary-100', '#e0f1ff');
  root.style.setProperty('--color-primary-200', '#b9e3ff');
  root.style.setProperty('--color-primary-300', '#7dcfff');
  root.style.setProperty('--color-primary-400', '#5ac1ee');
  root.style.setProperty('--color-primary-500', '#174265');
  root.style.setProperty('--color-primary-600', '#174265');
  root.style.setProperty('--color-primary-700', '#174265');
  root.style.setProperty('--color-primary-800', '#174265');
  root.style.setProperty('--color-primary-900', '#174265');

  // Set static secondary colors
  root.style.setProperty('--color-secondary', '#5ac1ee');
  root.style.setProperty('--color-secondary-50', '#f0f9ff');
  root.style.setProperty('--color-secondary-100', '#e0f7ff');
  root.style.setProperty('--color-secondary-200', '#b9efff');
  root.style.setProperty('--color-secondary-300', '#7de7ff');
  root.style.setProperty('--color-secondary-400', '#5ac1ee');
  root.style.setProperty('--color-secondary-500', '#5ac1ee');
  root.style.setProperty('--color-secondary-600', '#38a3d1');
  root.style.setProperty('--color-secondary-700', '#2b89b3');
  root.style.setProperty('--color-secondary-800', '#236f95');
  root.style.setProperty('--color-secondary-900', '#1d5a7a');
} 