/* global ModalDialog, MozActivity */

'use strict';

(function(exports) {
  var _id = 0;
  var _ = navigator.mozL10n.get;
  var BUTTONBAR_TIMEOUT = 5000;
  var BUTTONBAR_INITIAL_OPEN_TIMEOUT = 1500;

  /**
   * The chrome UI of the AppWindow.
   *
   * @class AppChrome
   * @param {AppWindow} app The app window instance this chrome belongs to.
   * @extends BaseUI
   */
  var AppChrome = function AppChrome(app) {
    this.app = app;
    this.instanceID = _id++;
    this.containerElement = app.element;
    this._recentTitle = false;
    this._titleTimeout = null;
    this.scrollable = app.browserContainer;
    this.render();

    if (this.app.themeColor) {
      this.setThemeColor(this.app.themeColor);
    }

    if (!this.app.isBrowser() && this.app.name) {
      this._gotName = true;
      this.setFreshTitle(this.app.name);
    }

    var chrome = this.app.config.chrome;
    if (!chrome) {
      return;
    }

    if (chrome.navigation) {
      this.app.element.classList.add('navigation');
    }

    if (chrome.bar && !chrome.navigation) {
      this.app.element.classList.add('bar');
      this.bar.classList.add('visible');
    }

    if (chrome.scrollable) {
      this.app.element.classList.add('scrollable');
      this.app.element.classList.add('light');
      this.scrollable.scrollgrab = true;
      this.element.classList.add('maximized');
    }
  };

  AppChrome.prototype = Object.create(window.BaseUI.prototype);

  AppChrome.prototype.CLASS_NAME = 'AppChrome';

  AppChrome.prototype.EVENT_PREFIX = 'chrome';

  AppChrome.prototype.FRESH_TITLE = 500;

  AppChrome.prototype.LOCATION_COALESCE = 250;

  AppChrome.prototype._DEBUG = false;

  AppChrome.prototype.combinedView = function an_combinedView() {
    return '<div class="chrome" id="' +
            this.CLASS_NAME + this.instanceID + '">' +
            '<div class="progress"></div>' +
            '<div class="controls">' +
            ' <button type="button" class="back-button"' +
            '   alt="Back" data-disabled="disabled"></button>' +
            ' <button type="button" class="forward-button"' +
            '   alt="Forward" data-disabled="disabled"></button>' +
            ' <div class="urlbar">' +
            '   <div class="title"></div>' +
            '   <button type="button" class="reload-button"' +
            '     alt="Reload"></button>' +
            '   <button type="button" class="stop-button"' +
            '     alt="Stop"></button>' +
            ' </div>' +
            ' <button type="button" class="menu-button"' +
            '   alt="Menu" data-disabled="disabled"></button>' +
            '</div>';
  };

  AppChrome.prototype.view = function an_view() {
    return '<div class="chrome" id="' +
            this.CLASS_NAME + this.instanceID + '">' +
            '<div class="progress"></div>' +
            '<section role="region" class="bar skin-organic">' +
              '<header>' +
                '<button class="kill popup-close">' +
                '<span class="icon icon-close"></span></button>' +
                '<h1 class="title"></h1>' +
              '</header>' +
            '</section>' +
            '<footer class="navigation closed visible">' +
              '<div class="handler"></div>' +
              '<menu type="buttonbar">' +
                '<button type="button" class="back-button"' +
                ' alt="Back" data-disabled="disabled"></button>' +
                '<button type="button" class="forward-button"' +
                ' alt="Forward" data-disabled="disabled"></button>' +
                '<button type="button" class="reload-button"' +
                ' alt="Reload"></button>' +
                '<button type="button" class="bookmark-button"' +
                ' alt="Bookmark" data-disabled="disabled"></button>' +
                '<button type="button" class="close-button"' +
                ' alt="Close"></button>' +
              '</menu>' +
            '</footer>' +
          '</div>';
  };

  AppChrome.prototype.overflowMenuView = function an_overflowMenuView() {
    return '<div class="overflow-menu hidden">' +
           '  <div class="list">' +
           '    <div class="option" id="add-to-home">' +
           '      <div class="icon"></div>' +
           '      <div class="label" data-l10n-id="add-to-home-screen">' +
           '        Add to Home Screen' +
           '      </div>' +
           '    </div>' +
           '  </div>' +
           '</div>';
  };

  AppChrome.prototype._fetchElements = function ac__fetchElements() {
    this.element = this.containerElement.querySelector('.chrome');
    this.navigation = this.element.querySelector('.navigation');
    this.bar = this.element.querySelector('.bar');

    // We're appending new elements to DOM so to make sure headers are
    // properly resized and centered, we emmit a lazyload event.
    // This will be removed when the gaia-header web component lands.
    window.dispatchEvent(new CustomEvent('lazyload', {
      detail: this.bar
    }));

    this.progress = this.element.querySelector('.progress');
    this.openButton = this.element.querySelector('.handler');
    this.bookmarkButton = this.element.querySelector('.bookmark-button');
    this.reloadButton = this.element.querySelector('.reload-button');
    this.forwardButton = this.element.querySelector('.forward-button');
    this.stopButton = this.element.querySelector('.stop-button');
    this.backButton = this.element.querySelector('.back-button');
    this.menuButton = this.element.querySelector('.menu-button');
    this.closeButton = this.element.querySelector('.close-button');
    this.killButton = this.element.querySelector('.kill');
    this.title = this.element.querySelector('.title');
  };

  AppChrome.prototype.handleEvent = function ac_handleEvent(evt) {
    switch (evt.type) {
      case 'rocketbar-overlayopened':
        this.collapse();
        break;

      case 'click':
        this.handleClickEvent(evt);
        break;

      case 'scroll':
        this.handleScrollEvent(evt);
        break;

      case '_loading':
        this.show(this.progress);
        break;

      case '_loaded':
        this.hide(this.progress);
        break;

      case 'mozbrowserloadstart':
        this.handleLoadStart(evt);
        break;

      case 'mozbrowserloadend':
        this.handleLoadEnd(evt);
        break;

      case 'mozbrowserlocationchange':
        this.handleLocationChanged(evt);
        break;

      case 'mozbrowsertitlechange':
        this.handleTitleChanged(evt);
        break;

      case 'mozbrowsermetachange':
        this.handleMetaChange(evt);
        break;

      case '_opened':
        this.handleOpened(evt);
        break;

      case '_closing':
        this.handleClosing(evt);
        break;

      case '_withkeyboard':
        if (this.app && this.app.isActive()) {
          this.hide(this.navigation);
        }
        break;

      case '_withoutkeyboard':
        if (this.app) {
          this.show(this.navigation);
        }
        break;

      case '_homegesture-enabled':
        this.holdNavigation();
        break;

      case '_homegesture-disabled':
        this.releaseNavigation();
        break;

      case '_namechanged':
        this.handleNameChanged(evt);
        break;

      case 'transitionend':
        this.handleTransitionEnd(evt);
        break;

      case 'animationend':
        this.handleAnimationEnd(evt);
        break;
    }
  };

  AppChrome.prototype.handleClickEvent = function ac_handleClickEvent(evt) {
    switch (evt.target) {
      case this.openButton:
        if (this.closingTimer) {
          window.clearTimeout(this.closingTimer);
        }
        this.navigation.classList.remove('closed');
        this.closingTimer = setTimeout(function() {
          this.navigation.classList.add('closed');
        }.bind(this), BUTTONBAR_TIMEOUT);
        break;

      case this.reloadButton:
        this.clearButtonBarTimeout();
        this.app.reload();
        break;

      case this.stopButton:
        this.app.stop();
        break;

      case this.backButton:
        this.clearButtonBarTimeout();
        this.app.back();
        break;

      case this.forwardButton:
        this.clearButtonBarTimeout();
        this.app.forward();
        break;

      case this.bookmarkButton:
        this.onAddBookmark();
        break;

      case this.killButton:
        this.app.kill();
        break;

      case this.closeButton:
        if (this.closingTimer) {
          window.clearTimeout(this.closingTimer);
        }
        this.navigation.classList.add('closed');
        break;

      case this.title:
        window.dispatchEvent(new CustomEvent('global-search-request'));
        break;

      case this.menuButton:
        this.showOverflowMenu();
        break;

      case this._overflowMenu:
        this.hideOverflowMenu();
        break;

      case this.addToHomeButton:
        evt.stopImmediatePropagation();
        this.onAddToHome();
        break;
    }
  };

  AppChrome.prototype.handleScrollEvent = function ac_handleScrollEvent(evt) {
    // Ideally we'd animate based on scroll position, but until we have
    // the necessary spec and implementation, we'll animate completely to
    // the expanded or collapsed state depending on whether it's at the
    // top or not.
    // XXX Open a bug since I wonder if there is scrollgrab rounding issue
    // somewhere. While panning from the bottom to the top, there is often
    // a scrollTop position of scrollTopMax - 1, which triggers the transition!
    if (this.scrollable.scrollTop >= this.scrollable.scrollTopMax - 1) {
      this.element.classList.remove('maximized');
    } else {
      this.element.classList.add('maximized');
    }
  };

  AppChrome.prototype._registerEvents = function ac__registerEvents() {
    if (this.openButton) {
      this.openButton.addEventListener('click', this);
    }

    if (this.closeButton) {
      this.closeButton.addEventListener('click', this);
    }

    if (this.killButton) {
      this.killButton.addEventListener('click', this);
    }

    if (this.bookmarkButton) {
      this.bookmarkButton.addEventListener('click', this);
    }

    if (this.stopButton) {
      this.stopButton.addEventListener('click', this);
    }

    if (this.menuButton) {
      this.menuButton.addEventListener('click', this);
    }

    this.reloadButton.addEventListener('click', this);
    this.backButton.addEventListener('click', this);
    this.forwardButton.addEventListener('click', this);
    this.title.addEventListener('click', this);
    this.scrollable.addEventListener('scroll', this);

    this.app.element.addEventListener('mozbrowserloadstart', this);
    this.app.element.addEventListener('mozbrowserloadend', this);
    this.app.element.addEventListener('mozbrowserlocationchange', this);
    this.app.element.addEventListener('mozbrowsertitlechange', this);
    this.app.element.addEventListener('mozbrowsermetachange', this);
    this.app.element.addEventListener('_loading', this);
    this.app.element.addEventListener('_loaded', this);
    this.app.element.addEventListener('_namechanged', this);
    this.app.element.addEventListener('_opened', this);
    if (!this.useCombinedChrome()) {
      this.app.element.addEventListener('_closing', this);
      this.app.element.addEventListener('_withkeyboard', this);
      this.app.element.addEventListener('_withoutkeyboard', this);
      this.app.element.addEventListener('_homegesture-enabled', this);
      this.app.element.addEventListener('_homegesture-disabled', this);
    }
  };

  AppChrome.prototype._unregisterEvents = function ac__unregisterEvents() {
    if (this.openButton) {
      this.openButton.removeEventListener('click', this);
    }

    if (this.closeButton) {
      this.closeButton.removeEventListener('click', this);
    }

    if (this.killButton) {
      this.killButton.removeEventListener('click', this);
    }

    if (this.bookmarkButton) {
      this.bookmarkButton.removeEventListener('click', this);
    }

    if (this.stopButton) {
      this.stopButton.removeEventListener('click', this);
    }

    if (this.menuButton) {
      this.menuButton.removeEventListener('click', this);
    }

    if (this._overflowMenu) {
      this._overflowMenu.removeEventListener('click', this);
      this._overflowMenu.removeEventListener('animationend', this);
      this._overflowMenu.removeEventListener('transitionend', this);
    }

    if (this.addToHomeButton) {
      this.addToHomeButton.removeEventListener('click', this);
    }

    this.reloadButton.removeEventListener('click', this);
    this.backButton.removeEventListener('click', this);
    this.forwardButton.removeEventListener('click', this);
    this.title.removeEventListener('click', this);
    this.scrollable.removeEventListener('scroll', this);

    if (!this.app) {
      return;
    }

    this.app.element.removeEventListener('mozbrowserloadstart', this);
    this.app.element.removeEventListener('mozbrowserloadend', this);
    this.app.element.removeEventListener('mozbrowserlocationchange', this);
    this.app.element.removeEventListener('mozbrowsertitlechange', this);
    this.app.element.removeEventListener('mozbrowsermetachange', this);
    this.app.element.removeEventListener('_loading', this);
    this.app.element.removeEventListener('_loaded', this);
    this.app.element.removeEventListener('_namechanged', this);
    this.app.element.removeEventListener('_opened', this);
    if (!this.useCombinedChrome()) {
      this.app.element.removeEventListener('_closing', this);
      this.app.element.removeEventListener('_withkeyboard', this);
      this.app.element.removeEventListener('_withoutkeyboard', this);
      this.app.element.removeEventListener('_homegesture-enabled', this);
      this.app.element.removeEventListener('_homegesture-disabled', this);
    }
    this.app = null;
  };

  /**
   * Force the navigation to stay opened,
   * because we don't want to conflict with home gesture.
   */
  AppChrome.prototype.holdNavigation = function ac_holdNavigation() {
    if (this.closeButton.style.visibility !== 'hidden') {
      this.closeButton.style.visibility = 'hidden';
    }
    if (this.navigation.classList.contains('closed')) {
      this.navigation.classList.remove('closed');
    }
  };

  /**
   * Release the navigation opened state.
   */
  AppChrome.prototype.releaseNavigation = function ac_releaseNavigation() {
    if (this.closeButton.style.visibility !== 'visible') {
      this.closeButton.style.visibility = 'visible';
    }
    if (!this.navigation.classList.contains('closed')) {
      this.navigation.classList.add('closed');
    }
  };

  // Name has priority over the rest
  AppChrome.prototype.handleNameChanged =
    function ac_handleNameChanged(evt) {
      this.title.textContent = this.app.name;
      this._gotName = true;
    };

  AppChrome.prototype.setFreshTitle = function ac_setFreshTitle(title) {
    this.title.textContent = title;
    clearTimeout(this._titleTimeout);
    this._recentTitle = true;
    this._titleTimeout = setTimeout((function() {
      this._recentTitle = false;
    }).bind(this), this.FRESH_TITLE);
  };

  AppChrome.prototype.isButtonBarDisplayed = false;

  AppChrome.prototype.toggleButtonBar = function ac_toggleButtonBar(time) {
    clearTimeout(this.buttonBarTimeout);
    if (!window.homeGesture.enabled) {
      this.navigation.classList.toggle('closed');
    }
    this.isButtonBarDisplayed = !this.isButtonBarDisplayed;
    if (this.isButtonBarDisplayed) {
      this.buttonBarTimeout = setTimeout(this.toggleButtonBar.bind(this),
        time || BUTTONBAR_TIMEOUT);
    }
  };

  AppChrome.prototype.clearButtonBarTimeout =
    function ac_clearButtonBarTimeout() {
      if (!this.navigation) {
        return;
      }

      clearTimeout(this.buttonBarTimeout);
      this.buttonBarTimeout =
        setTimeout(this.toggleButtonBar.bind(this), BUTTONBAR_TIMEOUT);
    };

  AppChrome.prototype.handleClosing = function ac_handleClosing() {
    clearTimeout(this.buttonBarTimeout);
    if (!window.homeGesture.enabled) {
      this.navigation.classList.add('closed');
    }
    this.isButtonBarDisplayed = false;
  };

  AppChrome.prototype.handleOpened =
    function ac_handleOpened() {
      if (this.navigation) {
        this.toggleButtonBar(BUTTONBAR_INITIAL_OPEN_TIMEOUT);
      }

      var dataset = this.app.config;
      if (dataset.originURL || dataset.searchURL) {
        if (this.bookmarkButton) {
          delete this.bookmarkButton.dataset.disabled;
        }
        if (this.menuButton) {
          delete this.menuButton.dataset.disabled;
        }
        return;
      }

      if (this.bookmarkButton) {
        this.bookmarkButton.dataset.disabled = true;
      }
      if (this.menuButton) {
        this.menuButton.dataset.disabled = true;
      }
    };

  AppChrome.prototype.handleTitleChanged = function(evt) {
    if (this._gotName) {
      return;
    }

    this.setFreshTitle(evt.detail || this._currentURL);
    this._titleChanged = true;
  };

  AppChrome.prototype.handleMetaChange =
    function ac__handleMetaChange(evt) {
      var detail = evt.detail;
      if (detail.name !== 'theme-color' || !detail.type) {
        return;
      }

      // If the theme-color meta is removed, let's reset the color.
      var color = '';

      // Otherwise, set it to the color that has been asked.
      if (detail.type !== 'removed') {
        color = detail.content;
      }

      this.setThemeColor(color);
    };

  AppChrome.prototype.setThemeColor = function ac_setThemColor(color) {
    this.element.style.backgroundColor = color;

    if (!this.app.isHomescreen) {
      this.scrollable.style.backgroundColor = color;
    }

    if (color === 'transparent' || color === '') {
      this.app.element.classList.remove('light');
      return;
    }

    var self = this;
    window.requestAnimationFrame(function updateAppColor() {
      var computedColor = window.getComputedStyle(self.element).backgroundColor;
      var colorCodes = /rgb\((\d+), (\d+), (\d+)\)/.exec(computedColor);
      if (!colorCodes || colorCodes.length === 0) {
        return;
      }

      var r = parseInt(colorCodes[1]);
      var g = parseInt(colorCodes[2]);
      var b = parseInt(colorCodes[3]);
      var brightness =
        Math.sqrt((r*r) * 0.241 + (g*g) * 0.691 + (b*b) * 0.068);

      self.app.element.classList.toggle('light', brightness > 200);
    });
  };

  AppChrome.prototype.render = function() {
    this.publish('willrender');

    var view = this.useCombinedChrome() ? this.combinedView() : this.view();
    this.app.element.insertAdjacentHTML('afterbegin', view);

    this._fetchElements();
    this._registerEvents();
    this.publish('rendered');
  };

  AppChrome.prototype.useCombinedChrome = function ac_useCombinedChrome(evt) {
    var chrome = this.app.config.chrome;
    if (!chrome) {
      return;
    }

    return chrome.scrollable || (chrome.navigation && chrome.bar);
  };

  AppChrome.prototype._updateLocation =
    function ac_updateTitle(title) {
      if (this._titleChanged || this._gotName || this._recentTitle) {
        return;
      }
      this.title.textContent = title;
    };

  AppChrome.prototype.handleLocationChanged =
    function ac_handleLocationChange(evt) {
      if (!this.app) {
        return;
      }

      // We wait a small while because if we get a title/name it's even better
      // and we don't want the label to flash
      setTimeout(this._updateLocation.bind(this, evt.detail),
                 this.LOCATION_COALESCE);
      this._currentURL = evt.detail;

      this.app.canGoForward(function forwardSuccess(result) {
        if (result === true) {
          delete this.forwardButton.dataset.disabled;
        } else {
          this.forwardButton.dataset.disabled = true;
        }
      }.bind(this));

      this.app.canGoBack(function backSuccess(result) {
        if (result === true) {
          delete this.backButton.dataset.disabled;
        } else {
          this.backButton.dataset.disabled = true;
        }
      }.bind(this));
    };

  AppChrome.prototype.handleLoadStart = function ac_handleLoadStart(evt) {
    this.containerElement.classList.add('loading');
    this._titleChanged = false;
  };

  AppChrome.prototype.handleLoadEnd = function ac_handleLoadEnd(evt) {
    this.containerElement.classList.remove('loading');
  };

  AppChrome.prototype.maximize = function ac_maximize(callback) {
    var element = this.element;
    element.classList.add('maximized');
    window.addEventListener('rocketbar-overlayopened', this);

    if (!callback) {
      return;
    }

    var safetyTimeout = null;
    var finish = function(evt) {
      if (evt && evt.target !== element) {
        return;
      }

      element.removeEventListener('transitionend', finish);
      clearTimeout(safetyTimeout);
      callback();
    };
    element.addEventListener('transitionend', finish);
    safetyTimeout = setTimeout(finish, 250);
  };

  AppChrome.prototype.collapse = function ac_collapse() {
    window.removeEventListener('rocketbar-overlayopened', this);
    this.element.classList.remove('maximized');
  };

  AppChrome.prototype.isMaximized = function ac_isMaximized() {
    return this.element.classList.contains('maximized');
  };

  AppChrome.prototype.addBookmark = function ac_addBookmark() {
    var dataset = this.app.config;
    if (!dataset.originURL && !dataset.searchURL) {
      return;
    }

    var name, url;
    if (dataset.originURL) {
      name = dataset.originName;
      url = dataset.originURL;
    } else {
      name = dataset.searchName;
      url = dataset.searchURL;
    }

    var activity = new MozActivity({
      name: 'save-bookmark',
      data: {
        type: 'url',
        url: url,
        name: name,
        icon: dataset.icon,
        useAsyncPanZoom: dataset.useAsyncPanZoom,
        iconable: false
      }
    });

    activity.onsuccess = function onsuccess() {
      if (dataset.originURL) {
        delete dataset.originURL;
      } else {
        delete dataset.searchURL;
      }

      if (!dataset.originURL &&
          !dataset.searchURL) {
        if (this.menuButton) {
          this.menuButton.dataset.disabled = true;
        }
        if (this.bookmarkButton) {
          this.bookmarkButton.dataset.disabled = true;
        }
      }
    }.bind(this);
  };

  AppChrome.prototype.onAddBookmark = function ac_onAddBookmark() {
    if (this.bookmarkButton.dataset.disabled) {
      return;
    }

    this.clearButtonBarTimeout();

    var self = this;
    function selected(value) {
      if (value) {
        self.addBookmark();
      }
    }

    var data = {
      title: _('add-to-home-screen'),
      options: []
    };

    var dataset = this.app.config;

    if (dataset.originURL) {
      data.options.push({ id: 'origin', text: dataset.originName });
    }

    if (dataset.searchURL) {
      data.options.push({ id: 'search', text: dataset.searchName });
    }

    ModalDialog.selectOne(data, selected);
  };

  AppChrome.prototype.onAddToHome = function ac_onAddToHome() {
    this.addBookmark();
    this.hideOverflowMenu();
  };

  AppChrome.prototype.handleAnimationEnd =
    function ac_handleAnimationEnd(evt) {
      this.overflowMenu.classList.remove('showing');
    };

  AppChrome.prototype.handleTransitionEnd =
    function ac_handleTransitionEnd(evt) {
      if (evt.target === this.overflowMenu) {
        if (this.overflowMenu.classList.contains('hiding')) {
          this.overflowMenu.classList.remove('hiding');
          this.overflowMenu.classList.add('hidden');
        }
      }
    };

  AppChrome.prototype.__defineGetter__('overflowMenu',
    // Instantiate the overflow menu when it's needed
    function ac_getOverflowMenu() {
      if (!this._overflowMenu && this.useCombinedChrome()) {
        this.app.element.insertAdjacentHTML('afterbegin',
                                            this.overflowMenuView());
        this._overflowMenu = this.containerElement.
          querySelector('.overflow-menu');
        this.addToHomeButton = this.containerElement.
          querySelector('#add-to-home');

        this._overflowMenu.addEventListener('click', this);
        this._overflowMenu.addEventListener('animationend', this);
        this._overflowMenu.addEventListener('transitionend', this);
        this.addToHomeButton.addEventListener('click', this);
      }

      return this._overflowMenu;
    });

  AppChrome.prototype.showOverflowMenu = function ac_showOverflowMenu() {
    if (this.overflowMenu.classList.contains('hidden')) {
      this.overflowMenu.classList.remove('hidden');
      this.overflowMenu.classList.add('showing');
    }
  };

  AppChrome.prototype.hideOverflowMenu = function ac_hideOverflowMenu() {
    if (!this.overflowMenu.classList.contains('hidden') &&
        !this.overflowMenu.classList.contains('showing')) {
      this.overflowMenu.classList.add('hiding');
    }
  };

  exports.AppChrome = AppChrome;
}(window));
