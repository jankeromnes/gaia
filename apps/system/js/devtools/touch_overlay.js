'use strict';

(function(exports) {

  const SETTING = 'debug.show-touches.enabled';

  /**
   * TouchOverlay gives visual touch feedback.
   * @class TouchOverlay
   */
  function TouchOverlay() {
    this.touch = this.touch.bind(this);
    this.untouch = this.untouch.bind(this);

    var self = this;
    self.reset();

    SettingsListener.observe(SETTING, false, function(enable) {
      enable ? self.install() : self.remove();
    });

    var fluffing = this._fluffing;
    for (var key in fluffing) {
      var mm = key, setting = 'ui.touch.radius.' + mm;

      SettingsListener.observe(setting, fluffing[mm], function(value) {
        fluffing[mm] = value;
      });
    }

    ['touchstart','touchmove','touchend','touchcancel'].forEach(function(type) {
      window.addEventListener(type, self, true, true);
    });
  }

  TouchOverlay.prototype = {

    reset: function() {
      this._div = null;
      this._touches = {};
      this._fluffing = {
        leftmm: 3,
        topmm: 5,
        rightmm: 3,
        bottommm: 2
      };
    },

    install: function() {
      var div = document.createElement('div');
      div.id = 'touch-overlay';
      div.dataset.zIndexLevel = 'touch-overlay';
      document.getElementById('screen').appendChild(div);

      this._div = div;
    },

    remove: function() {
      this._div.remove();
      this.reset();
    },

    _getdiv: function(identifier) {
      var div = this._touches[identifier];
      if (!div) {
        div = document.createElement('div');
        div.classList.add('touch');

        var f = this._fluffing;
        div.style.height = f.topmm + f.bottommm + 'mm';
        div.style.width = f.leftmm + f.rightmm + 'mm';
        div.style.transformOrigin = f.leftmm + 'mm ' + f.topmm + 'mm';

        this._touches[identifier] = div;
        this._div.appendChild(div);
      }

      return div;
    },

    touch: function(touch) {
      var div = this._getdiv(touch.identifier);
      div.style.transform =
        'translate(' + touch.screenX + 'px,' + touch.screenY + 'px)';
      div.style.visibility = 'visible';
    },

    untouch: function(touch) {
      this._touches[touch.identifier].style.visibility = 'hidden';
    },

    handleEvent: function(e) {
      if (!this._div) {
        return;
      }

      switch (e.type) {
        case 'touchstart':
        case 'touchmove':
          Array.prototype.forEach.call(e.changedTouches, this.touch);
          break;

        case 'touchend':
        case 'touchcancel':
          Array.prototype.forEach.call(e.changedTouches, this.untouch);
          break;

        default:
          return;
      }
    }
  };

  exports.TouchOverlay = TouchOverlay;

}(window));
