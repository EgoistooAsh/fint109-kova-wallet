/* Sets light or dark mode before the page draws, so it never flashes.
   Uses the person's earlier choice if there is one, otherwise the device setting. */
(function () {
  var theme = null;
  try { theme = localStorage.getItem('kova.theme'); } catch (error) { /* storage blocked */ }
  if (theme !== 'dark' && theme !== 'light') {
    theme = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  document.documentElement.setAttribute('data-theme', theme);
})();
