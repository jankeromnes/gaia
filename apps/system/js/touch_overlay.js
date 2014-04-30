'use strict';

(function(exports) {

  const SETTING = 'debug.show-touches.enabled';

  /**
   * TouchOverlay gives visual touch feedback.
   * @class TouchOverlay
   */
  function TouchOverlay() {
    this.draw = this.draw.bind(this);

    var self = this;
    self.reset();

    SettingsListener.observe(SETTING, false, function(show) {
      if (show) {
        self.install();
      } else {
        self.remove();
      }
    });

    ['touchstart', 'touchmove', 'touchend', 'touchcancel']
      .forEach(function(type) {
        window.addEventListener(type, self, true, true);
      });
  }

  TouchOverlay.prototype = {

    reset: function() {
      this._div = null;
      this._touches = {};
    },

    install: function() {
      var div = document.createElement('div');
      div.id = 'touch-overlay';
      div.dataset.zIndexLevel = 'touch-overlay';
      document.querySelector('#screen').appendChild(div);

      this._div = div;
      this.resize();
    },

    remove: function() {
      this._div.remove();
      this.reset();
    },

    showTouch: function(touch) {
      var touches = this._touches;
      if (!touches[touch.identifier]) {
        var div = document.createElement('div');
        // TODO create touch element
        touches[touch.identifier] = {
          touch: touch,
          div: div
        };
      }
      // TODO CSS transition translate
    },

    killTouch: function(touch) {
      var touches = this._touches;
      touches[touch.identifier].div.remove();
      delete this._touches[touch.identifier];
    },

    handleEvent: function(e) {
      if (!this._div) {
        return;
      }

      var touches = this._touches;

      switch (e.type) {
        case 'touchstart':
        case 'touchmove':
          Array.prototype.forEach.call(e.changedTouches, function(touch) {
            // TODO showTouch(touch)
          });
          break;

        case 'touchend':
        case 'touchcancel':
          Array.prototype.forEach.call(e.changedTouches, function(touch) {
            // TODO killTouch(touch)
          });
          break;

        default:
          return;
      }

      this.draw();
    }
  };

  exports.TouchOverlay = TouchOverlay;

}(window));
