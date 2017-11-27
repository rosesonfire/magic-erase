const path = require('path')
const scripts = './../app/script.js'
const outputPath = path.join(__dirname, 'public')

module.exports = {
  context: __dirname,
  entry: {
    scripts: scripts
  },
  output: {
    path: outputPath,
    filename: '[name].pack.js'
  },
  devServer: {
    inline: true,
    open: true
  }
}
