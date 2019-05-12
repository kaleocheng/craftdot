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
