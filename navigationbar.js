/**
 * Mimics the navigation bar found in iOS
 *
 * To make links load page in the navigation bar heirarchy, give them the
 * class 'navbar-link'.
 * !! DO NOT INCLUDE # in the URL. Just a straight link to the page you want
 * to load.
 *
 * The navigation stack is an array of objects. Those objects has a few
 * properties:
 *  title:    That page's title
 *  back:     That page's backbutton, if empty title is used
 *  html:     The loaded HTML
 *  url:      The URL associated with this page
 *
 *
 * @version     0.1
 * @author      Simon Ljungberg <simon.ljungberg@goodold.se>
 * @license     Haven't figured out yet.. please use as you like.
 *              Credits are cool.
 */
var navigationbar = (function ($) {

  var navigationStack = []
    , container       = ''
    , self            = {}
    , backButton      = '';

  /**
   * Initialize the navigation bar in the given container.
   * The container should have space for both the nav bar and content.
   * Will clear the container of any content.
   *
   * @param     jQuery-object     container
   */
  self.init = function (c) {
    // Default container to body if none is specified
    container = c || 'body';
    $(container).addClass('navbar-wrapper');

    // Insert HTML
    $(container).html('' +
      '<header id="navbar">' +
        '<div class="navbar-left-placeholder" />' +
        '<h1 class="navbar-title" />' +
        '<div class="navbar-right-placeholder" />' +
      '</header>' +
      '<ul id="navbar-container" />'
    );

    // Hijack all links witht he class 'navbar-link'
    // Do not include the hash!!
    $('a.navbar-link').live('click', function () {
      self.pushPage($(this).attr('href'), true);
      return false;
    });

    // Set up a history pop handler, catches user interaction with back button
    $(window).bind('popstate', function (event) {
      // Seems to be a bit incosistent with where the state is stored..
      var e = event.state || event.originalEvent.state;

      // If the url of the popped state exists in the navigation stack it means
      // we are going backwards. In that case we need to remove all objects
      // above the popped state and move _back_ to the new one.
      // This means that this breaks the forward button...
      // The reason for not just checking the second last object is that if
      // this is used in a desktop browser, the user could theoretically have
      // held in the back button and jumped back a couple of steps. Dunno if
      // this works though.. :P
      if (e) {
        self.popPage(true, e);
      }
    });
  };

  /**
   * Push a new page onto the stack.
   * Takes url to file, loaded with AJAX.
   *
   * @param     string            url
   *  URL to page to load.
   * @param     bool              animated
   *  False to make instant switch.
   * @return    void
   */
  self.pushPage = function (url, animated) {
    // Fetch new page
    $.ajax({
      url:          url
    , timeout:      5000
    , cache:        false
    , dataType:     'html'
//    , beforeSend:   function () { self.showLoader(); }
    // Successfully loaded a new page, push it onto the stack
    , success:      function (data) {
        self.hideLoader();
        // Call our page handler, inserts the newly loaded page
        gotNewPage(data, animated, url);
      }
    // An error occured
    , error:        function (request, status, error) {
        console.log('Failed to load page: ' + url);
        console.log(error);
      }
    });
  };

  /**
   * Back on step in the navigation stack.
   * Will "release" the current state.
   * Forward button does nothing.
   *
   * @param     bool              animated
   *  False to make instant switch.
   * @param     object            toPage
   *  Object from the navigation stack to jump back to.
   * @return    bool
   *  False if there are no more pages to pop.
   */
  self.popPage = function (animated, toPage) {
    var index = false
      , popped
      , page
      , lastPage;

    // Decide what page to move to
    // Leaves the page we are moving to as the last element in the array
    if (toPage) {
      // Verify that toPage is in the stack, splice the navigation stack
      // Done backwards for performance reasons
      for (var i = navigationStack.length - 1; i >= 0; i--) {
        console.log(toPage.url + ' -- ' + navigationStack[i].url);
        if (toPage.url === navigationStack[i].url) {
          break;
        } else {
          lastPage = navigationStack.pop();
        }
      }
    } else {
      lastPage = navigationStack.pop();
    }

    if (navigationStack.length > 0) {
      popped = navigationStack[navigationStack.length - 1];

      // Create off screen page
      self.setUtilityButton(false);
      page = $('<li />').prependTo('#navbar-container').html(popped.html);

      if (animated) {
        page.addClass('navbar-animated');
        $('.navbar-active-page').addClass('navbar-animated');

        // Listen for animation finished events and remove old page
        // When this binding is done, the "old" page is still the "new" page.
        $('.navbar-active-page').bind('webkitTransitionEnd', function () {
          $(this).remove();
        });
        page.bind('webkitTransitionEnd', function () {
          $(this).removeClass('navbar-animated');
        });
      }

      backButton = popped.back;
      updateBackButton(animated);

      // Move pages to their right place
      $('.navbar-active-page').addClass('navbar-new-page');
      page.addClass('navbar-active-page');

      // Rewrite history!
      history.replaceState(popped, '', '#' + popped.url);
    }
  };

  /**
   * Set the current page's title.
   *
   * @param     string            title
   * @param     bool              animated
   * @return    void
   */
  self.setTitle = function (title, animated) {
    if (animated) {
      $('.navbar-title').clone().appendTo('#navbar').hide();
      $('.navbar-title:first').fadeOut(300, function () { $(this).remove(); });
      $('.navbar-title:last').text(title).fadeIn(200);
    } else {
      $('.navbar-title').text(title);
    }
  };

  /**
   * Set the current page's back button text, shown when it's the second
   * from the top. Overrideable from the loaded page.
   *
   * @param     string            title
   * @return    void
   */
  self.setBackButton = function (title) {
    backButton = title || false;
  };

  /**
   * Set the top-right utility button.
   * Will replace any current button.
   * Call with options = null to remove button.
   *
   * @param     object            options
   *  type: text or image
   *  value: text or url to image.
   *  class: a class name if you prefer to style it with css
   * @param     bool        animated
   *  True if new page should be animated into place.
   * @param     callback
   *  Action called when button is clicked.
   * @return    void
   */
  self.setUtilityButton = function (options, animated, callback) {
    var content
      , type      = options['type']  || 'text'
      , value     = options['value'] || 'Button'
      , aClass    = options['class'] || false;

    if (options) {
      if (type == 'image') {
        value = '<img src="' + value + '" alt="" />';
      }

      $('<button class="navbar-utility-new" />').text(value)
        .appendTo('.navbar-right-placeholder');

      if (aClass) {
        $('.navbar-utility-navbar').addClass(aClass);
      }

      if (typeof callback == 'function') {
        $('.navbar-utility-new').click(function () {
          callback();
        });
      }

      if (animated) {
        $('.navbar-utility-new').addClass('navbar-animated')
          .bind('webkitTransitionEnd', function () {
            $(this).removeClass('navbar-animated');
          });
      }

      // Move into place
      if (animated) {
        $('.navbar-utility').fadeOut(250, function () { $(this).remove(); });
      } else {
        $('.navbar-utility').hide().remove();
      }
      setTimeout(function () {
        $('.navbar-utility-new').removeClass('navbar-utility-new')
                                .addClass('navbar-utility');
      }, 120);
    } else {
      $('.navbar-right-placeholder').empty();
    }
  };

  /**
   * Show loading indicator.
   *
   * @param     string            text
   *  Optional text to replace the default "Loading...".
   * @return    void
   */
  self.showLoader = function (text) {
    text = text || 'Loading...';
    $(container).append('<div class="navbar-loader">' + text + '</div>');
    $(container).children('.navbar-loader').hide().fadeIn();
  };

  /**
   * Hide the loader.
   *
   * @return    void
   */
  self.hideLoader = function () {
    $(container).children('.navbar-loader')
                .fadeOut(function () { $(this).remove(); });
  };

  // -------------------------------------------------------------------------
  // Private functions
  // -------------------------------------------------------------------------

  /**
   * Handle a successfully loaded page, push it onto the stack, modify
   * history (pushstate) and show it. And animate the change if we should.
   *
   * @param     string      data
   *  Data returned from the AJAX-request.
   * @param     bool        animated
   *  True if new page should be animated into place.
   * @param     string      url
   *  The loaded URL.
   * @return    void
   */
  function gotNewPage(data, animated, url) {
    var page
      , object;

    backButton = false;
    page = $('<li />').addClass('navbar-new-page')
                      .appendTo('#navbar-container').html(data);

    if (!backButton) {
      backButton = $('.navbar-title').text();
    }

    if (animated) {
      page.addClass('navbar-animated');
      $('.navbar-active-page').addClass('navbar-animated');

      // Listen for animation finished events and remove old page
      // When this binding is done, the "old" page is still the "new" page.
      $('.navbar-active-page').bind('webkitTransitionEnd', function () {
        $(this).remove();
      });
      page.bind('webkitTransitionEnd', function () {
        $(this).removeClass('navbar-animated');
      });
    }

    // Move it into place
    // Need delay to make webkit register the change
    setTimeout(function () {
      $('.navbar-active-page').removeClass('navbar-active-page');
      page.addClass('navbar-active-page').removeClass('navbar-new-page');

      // Create the stored object
      // If the new page sets a back button or title, that has been done now.
      object = {
        title:  $('.navbar-title').text()
      , back:   backButton
      , url:    url
      , html:   data
      , index:  navigationStack.length
      };

      navigationStack.push(object);
      updateBackButton(animated);

      // Update browser history
      history.pushState(object, object.title, '#' + url);
    }, 1);
  };

  /**
   * Inserts the backbutton into the navbar when a new page is loaded.
   *
   * @param     bool        animated
   *  True if new button should be animated into place.
   */
  function updateBackButton(animated) {
    if (navigationStack.length > 1) {
      $('<button class="navbar-back-new" />').text(backButton)
        .click(function () {
          self.popPage(true);
        })
        .appendTo('.navbar-left-placeholder');

      if (animated) {
        $('.navbar-back-new').addClass('navbar-animated')
          .bind('webkitTransitionEnd', function () {
            $(this).removeClass('navbar-animated');
          });
      }

      // Move into place
      if (animated) {
        $('.navbar-back').fadeOut(250, function () { $(this).remove(); });
      } else {
        $('.navbar-back').hide().remove();
      }
      setTimeout(function () {
        $('.navbar-back-new').removeClass('navbar-back-new')
                             .addClass('navbar-back');
      }, 120);

    } else {
      $('.navbar-back').remove();
    }
  };

  return self;
})(jQuery);