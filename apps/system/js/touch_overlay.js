'use strict';

(function(exports) {

  const SETTING = 'debug.show-touches.enabled';
  const FADEOUT_MS = 150;
  const REDRAW_MS = 30;

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

    ['touchstart', 'touchmove', 'touchend', 'touchcancel', 'resize']
      .forEach(function(type) {
        window.addEventListener(type, self, true, true);
      });
  }

  TouchOverlay.prototype = {

    reset: function() {
      this._canvas = null;
      this._context = null;
      this._nextdraw = null;
      this._touches = {};
      this._zombies = {};
    },

    install: function() {
      var div = document.createElement('div');
      div.id = 'touch-overlay';
      div.dataset.zIndexLevel = 'touch-overlay';

      var canvas = this._canvas = document.createElement('canvas');
      canvas.id = 'touch-canvas';
      div.appendChild(this._canvas);

      this._context = canvas.getContext('2d');
      this._installed = true;

      document.querySelector('#screen').appendChild(div);
      this.resize();
    },

    remove: function() {
      window.cancelAnimationFrame(this._animation);
      this._canvas.parentElement.remove();
      this.reset();
    },

    resize: function() {
      var canvas = this._canvas;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      this.draw();
    },

    draw: function() {
      this._nextdraw = null;

      var canvas = this._canvas;
      var context = this._context;

      if (!context) {
        return;
      }

      context.clearRect(0, 0, canvas.width, canvas.height);

      var touches = this._touches;
      var zombies = this._zombies;

      for (var t in touches) {
        this.drawTouch(touches[t]);
      }

      for (var z in zombies) {
        this.drawZombie(zombies[z]);
      }
    },

    drawTouch: function(touch) {
      var context = this._context;
      context.beginPath();
      // TODO Use Math.TAU if it becomes available one day.
      context.arc(touch.screenX, touch.screenY, 12, 0, 2 * Math.PI, false);
      context.fillStyle = 'white';
      context.fill();
      context.lineWidth = 2;
      context.strokeStyle = 'whitesmoke';
      context.stroke();
    },

    drawZombie: function(zombie) {
      var life = zombie.death + FADEOUT_MS - new Date().getTime();
      if (life <= 0) {
        delete this._zombies[zombie.identifier];
        return;
      }

      var context = this._context;
      context.globalAlpha = life / FADEOUT_MS;
      this.drawTouch(zombie);
      context.globalAlpha = 1;

      if (!this._nextdraw) {
        this._nextdraw = window.setTimeout(this.draw, REDRAW_MS);
      }
    },

    handleEvent: function(e) {
      if (!this._canvas) {
        return;
      }

      var touches = this._touches;
      var zombies = this._zombies;

      switch (e.type) {
        case 'resize':
          this.resize();
          break;

        case 'touchstart':
        case 'touchmove':
          Array.prototype.forEach.call(e.changedTouches, function(touch) {
            touches[touch.identifier] = touch;
          });
          break;

        case 'touchend':
        case 'touchcancel':
          Array.prototype.forEach.call(e.changedTouches, function(touch) {
            delete touches[touch.identifier];
            touch.death = new Date().getTime();
            zombies[touch.identifier] = touch;
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
