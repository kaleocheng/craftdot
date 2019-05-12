const Parser = require('jison').Parser

String.prototype.replaceAll = function (search, replacement) {
    return this.split(search).join(replacement)
}
String.prototype.matchRule = function (rule) {
    return new RegExp('^' + rule.split('*').join('.*') + '$').test(this)
}

const grammar = {
    'lex': {
        'rules': [
            ['group', "return 'GROUP'"],
            ['craft_style', "return 'STYLE'"],
            ['in', "return 'IN'"],
            ['out', "return 'OUT'"],
            ['flow', "return 'FLOW'"],
            ['^[A-Za-z][A-Za-z0-9-\\*]*', "return 'NAME'"],
            [',', "return 'COMMA'"],
            ['\\{', "return 'OP'"],
            ['\\}', "return 'CP'"],
            ['\\[', "return 'OB'"],
            ['\\]', "return 'CB'"],
            ['->', "return 'ARROW'"],
            [':', "return 'COLON'"],
            ['([":A-Za-z0-9-].*)', "return 'ITEM'"],
            ['[\\n\\s\\t\\r]+', '/**/']
        ]
    },
    'bnf': {
        'craftdot': ['exps'],
        'exps': ['exps exp', 'exp'],
        'exp': ['node', 'flow', 'style', 'flowstyle'],
        'nodes': [
            ['nodes node', '{$$=yy.appendOrNewArray($$, $2)}'],
            ['node', '{$$=yy.appendOrNewArray($$, $1)}']
        ],
        'node': [
            ['GROUP NAME OP nodes CP', '{$$=yy.newGroup($2, $4); yy.addGroup($$)}'],
            ['NAME', '{$$=yy.newCraft($1); yy.addCraft($$)}'],
            ['NAME OP attrs CP', '{$$=yy.newCraft($1, $3);  yy.addCraft($$) }']
        ],
        'attrs': [
            ['attrs attr', '{$$=yy.appendOrNewArray($$, $2)}'],
            ['attr', '{$$=yy.appendOrNewArray($$, $1)}']
        ],
        'attr': [
            ['NAME OB items CB', '{$$=yy.newAttr($1, $3)}']
        ],
        'items': [
            ['items item', '{$$=yy.appendOrNewArray($$, $2)}'],
            ['item', '{$$=yy.appendOrNewArray($$, $1)}']
        ],
        'item': [
            ['ITEM', '{$$=yy.newItem($$)}'],
            'NAME'
        ],
        'flow': [
            ['NAME ARROW NAME', '{$$=yy.newFlow($1, $3); yy.addFlow($$)}']
        ],
        'style': [
            ['STYLE selectors OP sattrs CP', '{yy.addStyle($2, $4)}']
        ],
        'selectors': [
            ['selectors COMMA NAME', '{$$=yy.appendOrNewArray($$, $3)}'],
            ['NAME', '{$$=yy.appendOrNewArray($$, $1)}']
        ],
        'sattrs': [
            ['sattrs sattr', '{$$=yy.appendOrNewArray($$, $2)}'],
            ['sattr', '{$$=yy.appendOrNewArray($$, $1)}']
        ],
        'sattr': [
            ['NAME COLON NAME', '{$$=yy.newSAttr($1, $3)}']
        ],
        'flowstyle': [
            ['FLOW selectors IN OP sattrs CP', '{yy.addFLowStyle($2, $5, "in")}'],
            ['FLOW selectors OUT OP sattrs CP', '{yy.addFLowStyle($2, $5, "out")}'],
            ['FLOW selectors OP sattrs CP', '{yy.addFLowStyle($2, $4)}']
        ]
    }
}

const parser = new Parser(grammar)
const yy = {
    crafts: {},
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
        const g = { name: name, type: 'group', crafts: [], subgroups: [], parent: '' }
        for (child of childs) {
            switch (child.type) {
                case 'group':
                    g.subgroups.push(child.name)
                    break
                case 'craft':
                    g.crafts.push(child.name)
                    break
            }
        }
        return g
    },
    newCraft: (name, attrs) => {
        const c = { type: 'craft', name: name }
        if (attrs) {
            c['attrs'] = attrs
        }
        return c
    },
    newAttr: (name, items) => {
        return { name: name, items: items }
    },
    newItem: (item) => {
        return item.replace(/(^")|("$)/g, "")
    },
    newFlow: (from, to) => {
        return { from: from, to: to }
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
    addStyle: (nodes, styles) => {

        for (node of nodes) {
            if (node.includes('*')) {
                for (craft of Object.keys(yy.crafts)) {
                    if (craft.matchRule(node)) {
                        yy.crafts[craft]['styles'] = styles
                    }
                }

            } else if (node in crafts) {
                crafts[node]['styles'] = styles
            }
        }

    },
    addFLowStyle: (nodes, styles, option) => {
        for (node of nodes) {
            for (f of yy.flows) {
                if (option == 'in') {

                    if (f.to.matchRule(node)) {
                        f['styles'] = styles
                    }
                } else if (option == 'out') {
                    if (f.from.matchRule(node)) {
                        f['styles'] = styles
                    }
                } else {
                    if (f.from.matchRule(node) || f.to.matchRule(node)) {
                        f['styles'] = styles
                    }
                }
            }
        }
    }
}

parser.yy = yy

const parse = (craftdot) => {
    parser.parse(craftdot)
    return parser.yy
}

module.exports = {
    parse
}
