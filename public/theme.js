// Applica subito tema e preferenza di movimento salvati, prima che l'app si carichi.
(function () {
  try {
    var user = JSON.parse(localStorage.getItem('ulpan:user') || 'null');
    var key = user && user.id ? 'ulpan:v1:' + user.id : 'ulpan:v1';
    var s = (JSON.parse(localStorage.getItem(key) || 'null') || {}).settings || {};
    var root = document.documentElement;
    var dark = s.theme === 'dark' || (s.theme !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    root.dataset.theme = dark ? 'dark' : 'light';
    if (s.motion) root.dataset.motion = s.motion;
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', dark ? '#12110F' : '#1F4E8C');
  } catch (e) { /* archiviazione non disponibile: vale il tema del sistema */ }
})();
