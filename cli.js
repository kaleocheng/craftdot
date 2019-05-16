#!/usr/bin/env node

const fs = require('fs')
const render = require('./render')
const parser = require('./parser')
const util = require('util')
const commander = require('commander')
const open = require('open')
const tmp = require('tmp')
const pkg = require('./package.json')


commander
    .name('craftdot')
    .version(pkg.version)
    .option('-b, --show-in-browser', 'show diagram in default brower')
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
    process.exit()
}
const output = render.render_diagraph(crafts)

if (commander.showInBrowser) {
    let html = `
    <!DOCTYPE html>
    <meta charset="utf-8">

    <body>
        <script src="https://d3js.org/d3.v4.min.js"></script>
        <script src="https://unpkg.com/viz.js@1.8.0/viz.js" type="javascript/worker"></script>
        <script src="https://unpkg.com/d3-graphviz@1.4.0/build/d3-graphviz.min.js"></script>
        <div id="graph" style="text-align: center;"></div>
        <script>
            d3.select("#graph").graphviz()
                .fade(false)
                .renderDot(\`${output}\`);
        </script>
    </body>
    `
    let htmlFile = tmp.fileSync({
        postfix: '.html'
    })
    fs.writeFileSync(htmlFile.name, html);
    (async () => {
        await open(`file://${htmlFile.name}`);
    })();
    htmlFile.removeCallback()
    process.exit()
}

console.log(output)
