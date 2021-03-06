#!/usr/bin/env node

const fs = require('fs')
const render = require('./render')
const parser = require('./parser')
const util = require('util')
const commander = require('commander')
const pkg = require('./package.json')
const path = require('path')
const chokidar = require('chokidar')
const fastify = require('fastify')()
const getPort = require('get-port')


commander
    .name('craftdot')
    .version(pkg.version)
    .option('--port [3200]', 'the server prot, only vaild when  --format=browser (default is 3200)')
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

const parseCrafts = (craftdotFile, filter) => {
    const craftdot = fs.readFileSync(craftdotFile, 'utf8')
    const cwd = path.dirname(craftdotFile)
    return parser.parse(craftdot, filter, cwd)
}

const crafts = parseCrafts(craftdotFile, commander.filter)

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
    (async () => {
        const defaultPort = commander.port ? Number(commander.port) : 3200
        const port = await getPort({host: '127.0.0.1', port: defaultPort})
        const html = (renderOutput) => {
            const result = `
                <!DOCTYPE html>
                <meta charset="utf-8">

                <body>
                    <script src="http://127.0.0.1:${port}/dist/d3.min.js"></script>
                    <script src="http://127.0.0.1:${port}/dist/viz.js" type="javascript/worker"></script>
                    <script src="http://127.0.0.1:${port}/dist/d3-graphviz.min.js"></script>
                    <div id="graph" style="text-align: center;"></div>
                    <script>
                        d3.select("#graph").graphviz()
                                .fade(false)
                                .renderDot(\`${renderOutput}\`)
                        const RefreshSocket = class {
                            constructor (address = \`ws://\${window.location.hostname}:${port}/live-reload\`) {
                                  this.address = address
                                  this.init()
                            }

                            init () {
                              let refreshSocket = new WebSocket(this.address, "refresh-protocol")
                              refreshSocket.addEventListener(
                                "open",
                                () => console.log(\`Refresh socket to \${this.address} opened successfully\`))

                              refreshSocket.addEventListener(
                                "message",
                                () => {
                                  refreshSocket.close()
                                  window.location.reload(true)
                                })

                              refreshSocket.addEventListener(
                                "close",
                                () => {
                                  console.log(\`Refresh socket to \${this.address} closed\`)
                                  window.setTimeout(() => this.init(), retryTime)
                                })
                            }
                        }
                        let socket = new RefreshSocket()
                        </script>
                </body>
            `
            return result
        }

        let renderdHTML = html(output)
        const wsConnections = []
        const handleChange =  (changePath) => {
            const craftdotChange = path.extname(changePath) === ".craftdot"
            if (craftdotChange) {
                console.log('rebuilding...')
                parser.reset()
                const crafts = parseCrafts(craftdotFile, commander.filter)
                renderdHTML = html(render.render_diagraph(crafts))
                wsConnections.forEach(connection => {
                    connection.socket.send('reload')
                })
            }
        }

        chokidar.watch(craftdotFile)
            .on('change', handleChange)
            .on('add', handleChange)
            .on('unlink', handleChange)
            .on('addDir', handleChange)
            .on('unlinkDir', handleChange)
            .on('error', function (err) {
                console.log('error:', err)
            })

        fastify.register((instance, opts, next) => {
          instance.register(require('fastify-static'), {
              root: path.join(__dirname, 'dist'),
              prefix: '/dist/',
          })
          next()
        })

        fastify.get('/', (request, reply) => {
            reply.type('text/html').send(renderdHTML)
        })

        fastify.register(require('fastify-websocket'))
        fastify.get('/live-reload', { websocket: true }, (connection, req) => {
            wsConnections.push(connection)
        })

        fastify.listen(port, (err, address) => {
            if (err) throw err
            console.log(`server listening on ${address}`)
        })
    })()
}
