module.exports = function (config) {
  config.set({
    browsers: ['ChromeHeadless'],
    frameworks: ['jasmine', '@angular-devkit/build-angular'],
    plugins: [
      require('karma-jasmine'),
      require('karma-chrome-launcher'),
      require('karma-jasmine-html-reporter'),
      require('karma-coverage'),
      require('@angular-devkit/build-angular/plugins/karma')
    ],
    reporters: ['progress', 'kjhtml'],
    restartOnFileChange: true
  });
};
