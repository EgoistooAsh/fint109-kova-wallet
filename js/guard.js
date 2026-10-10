/* Kova Wallet: sign-in check for the signed-in pages.
   Runs in the <head>, before the page draws, so a signed-out visitor never sees the app.
   "Keep me signed in" is remembered on this device until Sign out.
   Without JavaScript the pages stay open, so the prototype can still be reviewed. */
(function () {
  var signedIn;
  try {
    signedIn = sessionStorage.getItem('kova.signedIn') === 'true';
    if (!signedIn && localStorage.getItem('kova.remember') === 'true') {
      sessionStorage.setItem('kova.signedIn', 'true');
      signedIn = true;
    }
  } catch (error) {
    // Storage is blocked (strict privacy settings): signing in couldn't be remembered,
    // so let the visitor in rather than sending them round in circles.
    signedIn = true;
  }

  if (!signedIn) {
    var page = window.location.pathname.split('/').pop() || 'dashboard.html';
    window.location.replace('sign-in.html?next=' + encodeURIComponent(page + window.location.search));
  }
})();
