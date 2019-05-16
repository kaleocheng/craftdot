const fs = require('fs')
const render = require('./render')
const parser = require('./parser')
const util = require('util')
const commander = require('commander')
const pkg = require('./package.json')


commander
    .name('craftdot')
    .version(pkg.version)
    .option('--filter [*]', 'filter crafts, support wildcard such as service* (default is *)')
    .option('--show-object', 'just show object, do not render')
    .parse(process.argv);

if (!commander.args.length) {
    commander.outputHelp()
    process.exit()
}

const craftdots = commander.args.map(f => {
    if (!fs.existsSync(f)) {
        console.log(`${f} is not exist`)
        process.exit()
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
