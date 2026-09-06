(function () {
  var FAVORITE_KEY = 'skip_to_favorite_mark';
  var UI_BUTTON_ID = 'skip-to-fav-btn';

  // Add button to the player bar via Litetify.ui
  Litetify.ui.addSidebarItem(UI_BUTTON_ID, 'Skip to Favorite', '★');

  // Listen for state changes to show/hide the mark button
  Litetify.player.onStateChange(function (state) {
    if (state.uri) {
      var mark = Litetify.storage.get(FAVORITE_KEY + ':' + state.uri);
      if (mark) {
        Litetify.ui.showToast(
          'Favorite section at ' + formatTime(parseInt(mark, 10)),
          'info',
        );
      }
    }
  });

  // Mark the current position as the favorite section
  Litetify.events.on('custom:markFavorite', function () {
    Litetify.player.getState().then(function (state) {
      if (state.uri && state.positionMs > 5000) {
        Litetify.storage.set(
          FAVORITE_KEY + ':' + state.uri,
          String(state.positionMs),
        );
        Litetify.ui.showToast('Favorite section marked!', 'success');
      }
    });
  });

  function formatTime(ms) {
    var total = Math.floor(ms / 1000);
    var m = Math.floor(total / 60);
    var s = total % 60;
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  return {
    unload: function () {
      Litetify.ui.removeSidebarItem(UI_BUTTON_ID);
      Litetify.storage.remove(FAVORITE_KEY);
    },
  };
})();
