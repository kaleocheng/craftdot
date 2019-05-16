const fs = require('fs')
const render = require('./render')
const parser = require('./parser')
const util = require('util')
const commander = require('commander')


commander
    .option('--filter [filter]', 'Filter crafts')
    .option('--show-object', 'Just show object, do not render')
    .parse(process.argv);

const craftdots = commander.args.map(f => {
    if (!fs.existsSync(f)) {
        console.log(`${f} is not exist`)
        exit()
    }
    return fs.readFileSync(f, 'utf8')
})

const crafts = parser.parse(craftdots, commander.filter)
if (commander.showObject) {
    console.log(util.inspect(crafts, false, null, true))
} else {
    output = render.render_diagraph(crafts)
    console.log(output)
}