
const fs = require('fs')
const render = require('./render')
const parser = require('./parser')

craftdot = fs.readFileSync('example/starbucks.craftdot', 'utf8')
output = render.render_diagraph(parser.parse(craftdot))
console.log(output)
