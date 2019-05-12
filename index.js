const fs = require('fs')
const render = require('./render')
const parser = require('./parser')
const util = require('util')

craftdot = fs.readFileSync('example/example.craftdot', 'utf8')
//output = render.render_diagraph(parser.parse(craftdot))
console.log(util.inspect(parser.parse(craftdot), false, null, true))
