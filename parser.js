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
            ['([":A-Za-z0-9-].*)', "return 'ITEM'"],
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
            ['NAME', '{$$=yy.newCraft($1); yy.addCraft($$)}'],
            ['NAME OP attrs CP', '{$$=yy.newCraft($1, $3);  yy.addCraft($$) }'],
            ['NAME OB styleAttrs CB OP attrs CP', '{$$=yy.newCraft($1, $6, $3); yy.addCraft($$)}'],
            ['NAME OB styleAttrs CB', '{$$=yy.newCraft($1, "", $3); yy.addCraft($$)}'],
            'flow'
        ],
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
            ['NAME COLON NAME', '{$$=yy.newSAttr($1, $3)}']
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
        nodes.push(node)
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

    addCraft: (craft) => {
        yy.crafts[craft.name] = craft
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
                    if ('attrs' in c && 'attrs' in wc) {
                        let cnames = c.attrs.map(x => x.name)
                        let defaultAttrs = wc.attrs.filter(x => !cnames.includes(x.name))
                        c.attrs.push(...defaultAttrs)
                    }
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

const parse = (craftdot, craftFilter) => {
    parser.parse(craftdot)
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
