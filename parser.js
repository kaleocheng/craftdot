const Parser = require('jison').Parser

String.prototype.replaceAll = function(search, replacement) {
    return this.split(search).join(replacement)
}
String.prototype.matchRule = function(rule) {
    return new RegExp('^' + rule.split('*').join('.*') + '$').test(this)
}

const grammar = {
    'lex': {
        'rules': [
            ['group', "return 'GROUP'"],
            ['^[A-Za-z\\*][A-Za-z0-9-\\*]*', "return 'NAME'"],
            [',', "return 'COMMA'"],
            ['\\{', "return 'OP'"],
            ['\\}', "return 'CP'"],
            ['\\[', "return 'OB'"],
            ['\\]', "return 'CB'"],
            ['-', "return 'STROKE'"],
            ['>', "return 'LARROW'"],
            [':', "return 'COLON'"],
            ['^\\"([/:A-Za-z0-9-].*)\\"', "return 'ITEM'"],
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
            'ITEM',
            'NAME'
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
    crafts: {},
    parsedCrafts: [],
    parsedFlows: [],
    groups: {},
    flows: [],
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
            name: name,
            type: 'group',
            crafts: [],
            subgroups: [],
            parent: ''
        }
        for (child of childs) {
            switch (child.type) {
                case 'group':
                    g.subgroups.push(child.name)
                    break
                case 'craft':
                    g.crafts.push(child.name)
                    yy.crafts[child.name]['group'] = name
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
            name: name
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
    newAttr: (name, items) => {
        return {
            name: name,
            items: items
        }
    },
    newItem: (item) => {
        return item.replace(/(^")|("$)/g, "")
    },
    newFlow: (from, to, styleAttrs) => {
        const flow = {
            from: from,
            to: to
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
        return `${key}=${vaule};`
    },
    addGroup: (group) => {
        for (subg of group.subgroups) {
            yy.groups[subg]['parent'] = group.name
        }
        yy.groups[group.name] = group
    },
    addCrafts: (crafts) => {
        for (let craft of crafts) {
            yy.addCraft(craft)
        }
    },

    addCraft: (craft) => {
        if (craft.name in yy.crafts) {
            yy.crafts[craft.name] = mergeCraft(yy.crafts[craft.name], craft)
        } else {
            yy.crafts[craft.name] = craft
        }
    },
    addFlow: (flow) => {
        yy.flows.push(flow)
    },
    parseWildcard: () => {
        const wildcardCrafts = Object.keys(yy.crafts).map(c => yy.crafts[c]).filter(c => 'wildcard' in c && c.wildcard == true)
        const wildcardFlows = yy.flows.filter(f => 'wildcard' in f && f.wildcard == true)
        let crafts = Object.keys(yy.crafts).map(c => yy.crafts[c]).filter(c => !('wildcard' in c))
        let flows = yy.flows.filter(f => !('wildcard' in f))
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
        yy.parsedCrafts = crafts
        yy.parsedFlows = flows
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

const parse = (craftdots, craftFilter) => {
    craftFilter = craftFilter || '*'
    for (let craftdot of craftdots) {
        parser.parse(craftdot)
    }
    parser.yy.parseWildcard()
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
