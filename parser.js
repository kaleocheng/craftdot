const Parser = require('jison').Parser
const fs = require('fs')
const path = require('path')
const crypto = require("crypto")
const newID = () => { return crypto.randomBytes(10).toString('hex') }


String.prototype.replaceAll = function (search, replacement) {
    return this.split(search).join(replacement)
}
String.prototype.matchRule = function (rule) {
    return new RegExp('^' + rule.split('*').join('.*') + '$').test(this)
}

const grammar = {
    'lex': {
        'rules': [
            ['^//.*\\n', '/**/'],
            ['group', "return 'GROUP'"],
            ['include', "return 'INCLUDE'"],
            ['^[A-Za-z\\*][A-Za-z0-9-\\*]*', "return 'NAME'"],
            [',', "return 'COMMA'"],
            ['\\{', "return 'OP'"],
            ['\\}', "return 'CP'"],
            ['\\[', "return 'OB'"],
            ['\\]', "return 'CB'"],
            ['-', "return 'STROKE'"],
            ['>', "return 'LARROW'"],
            [':', "return 'COLON'"],
            ['^\\"([/:A-Za-z0-9-\\*].*)\\"', "return 'ITEM'"],
            ['^([/:A-Za-z0-9-].*)', "return 'STRING'"],
            ['[\\n\\s\\t\\r]+', '/**/']
        ]
    },
    'bnf': {
        'craftdot': ['nodes'],
        'nodes': [
            ['nodes node', '{$$=yy.appendOrNewArray($$, $2)}'],
            ['node', '{$$=yy.appendOrNewArray($$, $1)}']
        ],
        'node': [
            ['GROUP NAME OP nodes CP', '{$$=yy.newGroup($2, $4); yy.addGroup($$)}'],
            ['names', '{$$=yy.newCrafts($1); yy.addCrafts($$)}'],
            ['names OP attrs CP', '{$$=yy.newCrafts($1, $3);  yy.addCrafts($$) }'],
            ['names OB styleAttrs CB OP attrs CP', '{$$=yy.newCrafts($1, $6, $3); yy.addCrafts($$)}'],
            ['names OB styleAttrs CB', '{$$=yy.newCrafts($1, "", $3); yy.addCrafts($$)}'],
            ['INCLUDE OP ITEM CP', '{{$$=yy.newInclude($3); yy.addInclude($$)}}'],
            'flow'
        ],
        'names': [
            ['names COMMA name', '{$$=yy.appendOrNewArray($$, $3)}'],
            ['name', '{$$=yy.appendOrNewArray($$, $1)}']
        ],
        'name': ['NAME'],
        'attrs': [
            ['attrs attr', '{$$=yy.appendOrNewArray($$, $2)}'],
            ['attr', '{$$=yy.appendOrNewArray($$, $1)}']
        ],
        'attr': [
            ['NAME COLON items', '{$$=yy.newAttr($1, $3)}'],
            ['NAME COLON item', '{$$=yy.newAttr($$, $3)}']
        ],
        'items': [
            ['items STROKE item', '{$$=yy.appendOrNewArray($$, $3)}'],
            ['STROKE item', '{$$=yy.appendOrNewArray($$, $2)}']
        ],
        'item': [
            ['ITEM', '{$$=yy.newItem($1)}'],
            'NAME',
            'STRING'
        ],
        'flow': [
            ['NAME STROKE LARROW NAME', '{$$=yy.newFlow($1, $4); yy.addFlow($$)}'],
            ['NAME STROKE LARROW NAME OB styleAttrs CB', '{$$=yy.newFlow($1, $4, $6); yy.addFlow($$)}']
        ],
        'styleAttrs': [
            ['styleAttrs styleAttr', '{$$=yy.appendOrNewArray($$, $2)}'],
            ['styleAttrs COMMA styleAttr', '{$$=yy.appendOrNewArray($$, $3)}'],
            ['styleAttr', '{$$=yy.appendOrNewArray($$, $1)}']
        ],
        'styleAttr': [
            ['NAME COLON item', '{$$=yy.newSAttr($1, $3)}']
        ],
    }
}

const parser = new Parser(grammar)
const yy = {
    fileGroup: 'root',
    crafts: {},
    includes: {},
    parsedCrafts: [],
    parsedGroups: [],
    parsedFlows: [],
    groups: {},
    flows: [],
    cwd: '',
    appendOrNewArray: (nodes, node) => {
        if (!Array.isArray(nodes)) {
            nodes = []
        }
        if (Array.isArray(node)) {
            nodes = nodes.concat(node)
        } else {
            nodes.push(node)
        }
        return nodes
    },
    newGroup: (name, childs) => {
        const g = {
            id: newID(),
            path: '',
            name: name,
            type: 'group',
            crafts: [],
            includes: [],
            subgroups: [],
            parent: ''
        }
        if (yy.fileGroup !== 'root') {
            g.parent = yy.fileGroup
            yy.groups[yy.fileGroup].subgroups.push(g.id)
        }
        for (child of childs) {
            switch (child.type) {
                case 'group':
                    g.subgroups.push(child.id)
                    break
                case 'craft':
                    g.crafts.push(child.id)
                    yy.crafts[child.id]['group'] = g.id
                    break
                case 'include':
                    g.includes.push(child.path)
                    yy.includes[child.path]['group'] = g.id
                    break
            }
        }
        return g
    },
    newCrafts: (names, attrs, styleAttrs) => {
        let crafts = []
        for (let name of names) {
            crafts.push(yy.newCraft(name, attrs, styleAttrs))
        }
        return crafts
    },
    newCraft: (name, attrs, styleAttrs) => {
        const c = {
            type: 'craft',
            id: newID(),
            name: name,
            path: name,
        }
        if (yy.fileGroup !== 'root') {
            c['group'] = yy.fileGroup
            yy.groups[yy.fileGroup].crafts.push(name)
        }

        if (name.includes('*')) {
            c['wildcard'] = true
        }
        if (attrs) {
            c['attrs'] = attrs
        }
        if (styleAttrs) {
            c['styleAttrs'] = styleAttrs
        }
        return c
    },
    newInclude: (includePath) => {
        includePath = includePath.replace(/(^")|("$)/g, "")
        includePath = path.join(yy.cwd, includePath)
        if (fs.existsSync(includePath)) {
            return {
                type: 'include',
                id: newID(),
                path: includePath,
            }
        }
        return {
            type: 'include',
            id: newID(),
            path: "",
        }
    },
    newAttr: (name, value) => {
        if (Array.isArray(value)) {
            return {
                name: name,
                id: newID(),
                items: value
            }
        }
        return {
            name: name,
            id: newID(),
            value: value
        }

    },
    newItem: (item) => {
        return item.replace(/(^")|("$)/g, "")
    },
    newFlow: (from, to, styleAttrs) => {
        const flow = {
            id: newID(),
            from: from,
            fromPath: '',
            to: to,
            toPath: ''
        }
        if (from.includes('*') || to.includes('*')) {
            flow['wildcard'] = true
        }
        if (styleAttrs) {
            flow['styleAttrs'] = styleAttrs
        }
        return flow
    },
    newSAttr: (key, vaule) => {
        return `${key}="${vaule}";`
    },
    parseGroupPath: (gid, parentGroupID,  groups) => {
        if (parentGroupID) {
            yy.groups[gid].path = `${yy.groups[parentGroupID].path}-${yy.groups[gid].name}`
        } else {
            yy.groups[gid].path = yy.groups[gid].name
        }

        if (yy.groups[gid].path in groups){
            console.log(`${yy.groups[gid].path} already exist`)
            process.exit()
        }

        groups[yy.groups[gid].path] = yy.groups[gid]
        yy.groups[gid].subgroups.forEach(g => {
            yy.parseGroupPath(g, gid, groups)
        })
    },
    addGroup: (group) => {
        for (subg of group.subgroups) {
            yy.groups[subg]['parent'] = group.id
        }
        yy.groups[group.id] = group
    },
    addCrafts: (crafts) => {
        for (let craft of crafts) {
            yy.addCraft(craft)
        }
    },

    addCraft: (craft) => {
        if (craft.id in yy.crafts) {
            yy.crafts[craft.id] = mergeCraft(yy.crafts[craft.id], craft)
        } else {
            yy.crafts[craft.id] = craft
        }
    },
    addInclude: (include) => {
        if (!(include.path in yy.includes)) {
            yy.includes[include.path] = include
        }
    },
    addFlow: (flow) => {
        yy.flows.push(flow)
    },

    parseWildcard: () => {
        const wildcardCrafts = Object.keys(yy.crafts).map(c => yy.crafts[c]).filter(c => 'wildcard' in c && c.wildcard == true)
        const wildcardFlows = yy.flows.filter(f => 'wildcard' in f && f.wildcard == true)
        const rootGroups = Object.keys(yy.groups).map(g => yy.groups[g]).filter(g => !g.parent)
        let groups = {}
        rootGroups.forEach(g => {
            yy.parseGroupPath(g.id, '', groups)
        })


        let crafts = Object.keys(yy.crafts).map(c => yy.crafts[c]).filter(c => !('wildcard' in c))
        let flows = yy.flows.filter(f => !('wildcard' in f))
        crafts.forEach(c => {
            if ('group' in c) {
                c.path = `${yy.groups[c.group].path}-${c.name}`
            }
        })
        for (let wc of wildcardCrafts.reverse()) {
            crafts = crafts.map(c => {
                if (c.name.matchRule(wc.name)) {
                    c = mergeCraft(c, wc)
                    let {
                        name,
                        wildcard,
                        ...wccopy
                    } = wc
                    return {
                        ...c,
                        ...{
                            ...wccopy,
                            ...c
                        }
                    }
                }
                return c
            })
        }
        for (wf of wildcardFlows) {
            flows = flows.map(f => {
                if (f.from.matchRule(wf.from) && f.to.matchRule(wf.to)) {
                    let {
                        from,
                        to,
                        wildcard,
                        ...wfcopy
                    } = wf
                    return {
                        ...f,
                        ...{
                            ...wfcopy,
                            ...f
                        }
                    }
                }
                return f
            })
        }

        let craftsPath = {}
        let craftsName = {}
        crafts.forEach(c => {
            if (c.path in craftsPath) {
                console.log(`${c.path} already exist`)
                process.exit()
            }
            craftsPath[c.path] = c.path

            if (c.name in craftsName) {
                craftsName[c.name].push(c.path)
            } else {
                craftsName[c.name] = []
                craftsName[c.name].push(c.path)
            }
        })

        flows.forEach(f => {
            if (f.from in craftsPath) {
                f.fromPath = craftsPath[f.from]
                return
            }
            if (f.from in craftsName) {
                if (craftsName[f.from].length == 1) {
                    f.fromPath = craftsName[f.from][0]
                    return
                }
                if (craftsName[f.from].length == 0) {
                    console.log(`${f.from} didn't found`)
                    process.exit()
                }
                if (craftsName[f.from].length > 1) {
                    console.log('conflict crafts, use full path:')
                    craftsName[f.from].forEach(c => {
                        console.log(`${yy.crafts[c].path}`)
                    })
                    process.exit()
                }
            }


        })

        flows.forEach(f => {
            if (f.to in craftsPath) {
                f.toPath = craftsPath[f.to]
                return
            }
            if (f.to in craftsName) {
                if (craftsName[f.to].length == 1) {
                    f.toPath = craftsName[f.to][0]
                    return
                }
                if (craftsName[f.to].length == 0) {
                    console.log(`${f.to} didn't found`)
                    process.exit()
                }
                if (craftsName[f.to].length > 1) {
                    console.log('conflict crafts, use full path:')
                    craftsName[f.to].forEach(c => {
                        console.log(`${yy.crafts[c].path}`)
                    })
                    process.exit()
                }
            }
        })
        yy.parsedCrafts = crafts
        yy.parsedFlows = flows
        yy.parsedGroups = Object.keys(groups).map(g => groups[g])
    }

}

parser.yy = yy

function mergeCrafts(craftsA, craftsB) {
    const craftsANames = Object.keys(craftA)
    const craftsBNames = Object.keys(craftB)
    const intersection = craftsANames.filter(v => craftsBNames.includes(v))
    const missing = craftsANames
        .concat(craftsBNames)
        .filter(v => !craftsANames.includes(v) || !craftsBNames.includes(v))
        .filter(v => craftsBNames.includes(v))
    for (let m of missing) {
        craftsA[m] = craftsB
    }

    for (let i of intersection) {
        craftsA[i] = mergeCraft(craftsA[i], craftsB[i])
    }
    return craftsA
}

function mergeCraft(craftA, craftB) {
    if ('attrs' in craftB) {
        craftA['attrs'] = craftA.attrs || []
        let attrs = craftA.attrs.map(x => x.name)
        let missingAttrs = craftB.attrs.filter(x => !attrs.includes(x.name))
        craftA.attrs.push(...missingAttrs)
    }
    return craftA
}

const parse = (craftdot, craftFilter, cwd, group) => {
    craftFilter = craftFilter || '*'
    parser.yy.cwd = cwd
    if (group) {
        parser.yy.fileGroup = group
    }
    parser.parse(craftdot)
    parser.yy.parseWildcard()
    if (Object.entries(parser.yy.includes).length !== 0 && parser.yy.includes.constructor === Object) {
        for (let index in parser.yy.includes) {
            const include = parser.yy.includes[index]
            const includeCraftdot = fs.readFileSync(include.path, 'utf8')
            delete parser.yy.includes[index]
            const includeCwd = path.dirname(include.path)
            parse(includeCraftdot, craftFilter, includeCwd, include.group)
        }
    }

    const filteredCrafts = []
    for (let flow of parser.yy.parsedFlows) {
        if (flow.from.matchRule(craftFilter) || flow.to.matchRule(craftFilter)) {
            filteredCrafts.push(flow.from)
            filteredCrafts.push(flow.to)
        }
    }
    parser.yy.parsedCrafts = parser.yy.parsedCrafts.filter(craft => craft.name.matchRule(craftFilter) || filteredCrafts.includes(craft.name))
    parser.yy.parsedFlows = parser.yy.parsedFlows.filter(flow => flow.from.matchRule(craftFilter) || flow.to.matchRule(craftFilter))
    return parser.yy
}

module.exports = {
    parse
}
