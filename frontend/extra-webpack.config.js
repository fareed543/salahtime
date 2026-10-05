// Extra webpack config merged into the Angular build by @angular-builders/custom-webpack.
const webpack = require('webpack');

module.exports = {
  plugins: [
    // moment-hijri loads moment.js, whose `require('./locale/' + name)` makes webpack bundle all
    // ~140 moment locales (~430 KB). The app only uses moment's built-in English locale.
    new webpack.IgnorePlugin({
      resourceRegExp: /^\.\/locale$/,
      contextRegExp: /moment$/
    })
  ]
};
