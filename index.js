const fs = require('fs')
const render = require('./render')
const parser = require('./parser')
const util = require('util')
const commander = require('commander')


commander
    .option('--filter [filter]', 'Filter crafts')
    .parse(process.argv);

craftdot = fs.readFileSync(commander.args[0], 'utf8')
p = parser.parse(craftdot, commander.filter)
//console.log(util.inspect(p, false, null, true))
output = render.render_diagraph(p)
console.log(output)
