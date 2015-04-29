'use strict';

(function(exports) {

  exports.init = function() {
    var btn_save = document.getElementById("save");
    btn_save.addEventListener("click", exports.validate, false);

    exports.captcha();
  }

  exports.captcha = function() {
    reqwest({
      url: '/captcha',
      method: 'post',
      success: function(resp) {
        document.getElementById("captcha_ascii").innerHTML = resp;
      }
    })

  };

  exports.validate = function() {
    reqwest({
      url: '/send',
      method: 'post',
      data: {
        'name': document.getElementById("name").value,
        'email': document.getElementById("email").value,
        'text': document.getElementById("text").value,
        'captcha': document.getElementById("captcha").value
      },
      success: function(resp) {
        console.log(resp)
      },
      complete: function (resp) {
        exports.captcha();
      }
    })
  };

})(typeof exports === 'undefined' ? this['module'] = {} : exports);

document.addEventListener("DOMContentLoaded", function(event) { 
  module.init();
});