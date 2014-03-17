'use strict';
/* global DevtoolsView */

require('/js/touch_overlay.js');

suite('touchOverlay', function() {

  var subject;

  setup(function() {
    subject = new TouchOverlay();
  });

  suite('lol', function() {

    setup(function() {
      document.body.innerHTML = '<div><iframe id=target></iframe></div>';
    });

    teardown(function() {
      document.body.innerHTML = '';
    });

    test('lol', function() {
      assert.isDefined(widget);
      assert.equal(widget.textContent, '42');
      assert.isNull(getDevtoolsView());
    });
  });

});
