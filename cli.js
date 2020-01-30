#!/usr/bin/env node

const fs = require('fs')
const render = require('./render')
const parser = require('./parser')
const util = require('util')
const commander = require('commander')
const open = require('open')
const tmp = require('tmp')
const pkg = require('./package.json')
const path = require('path')
const fastify = require('fastify')({
  logger: true
})


commander
    .name('craftdot')
    .version(pkg.version)
    .option('--filter [*]', 'filter crafts, support wildcard such as service* (default is *)')
    .option('--format [type]', 'output raw data with format, support [dot, json, browser], (default is open with  browser', 'browser')
    .option('--debug', 'print parsed object for debug')
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
if (commander.args.length != 1) {
    console.log(`Craftdot just use the first file and ignore all others`)
}

const craftdotFile = commander.args[0]
if (!fs.existsSync(craftdotFile)) {
    console.log(`${craftdotFile} is not exist`)
    process.exit()
}
const craftdot = fs.readFileSync(craftdotFile, 'utf8')
const cwd = path.dirname(craftdotFile)

const crafts = parser.parse(craftdot, commander.filter, cwd)

if (commander.debug) {
    console.log(util.inspect(crafts, false, null, true))
    process.exit()
}

if (commander.format == 'json') {
    console.log(JSON.stringify(crafts))
    process.exit()
}

const output = render.render_diagraph(crafts)

if (commander.format == 'dot') {
    console.log(output)
    process.exit()
}


if (commander.format == 'browser') {
    // Open with browser
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
    fastify.get('/', (request, reply) => {
        reply.type('text/html').send(html)
    })

    fastify.listen(8333, (err, address) => {
        if (err) throw err
        fastify.log.info(`server listening on ${address}`)
    })
}
