const Parser = require('jison').Parser
const fs = require('fs')
const mustache = require('mustache')

const grammar = {
    'lex': {
        'rules': [
            ['group', "return 'GROUP'"],
            ['^[A-Za-z][A-Za-z0-9-]*', "return 'NAME'"],
            ['\\{', "return 'OP'"],
            ['\\}', "return 'CP'"],
            ['\\[', "return 'OB'"],
            ['\\]', "return 'CB'"],
            ['->', "return 'ARROW'"],
            ['([":A-Za-z0-9-].*)', "return 'ITEM'"],
            ['[\\n\\s\\t\\r]+', '/**/']
        ]
    },
    'bnf': {
        'craftdot': ['exps'],
        'exps': ['exps exp', 'exp'],
        'exp': ['node', 'flow'],
        'nodes': [['nodes node', '{if (!Array.isArray($$)){$$ = []}; $$.push($2)}'], ['node', '{if (!Array.isArray($$)){$$ = []}; $$.push($1)}']],
        'node': [['GROUP NAME OP nodes CP', '{yy.addGroup($2, $4); $$={type: "group", name: $2}}'], ['NAME', '{yy.addCraft({ name: $1}); $$={type: "craft", name: $1}}'], ['NAME OP attrs CP', '{ yy.addCraft({ name: $1, attrs: $3 }); $$={type: "craft", name: $1}}']],
        'attrs': [['attrs attr', '{if (!Array.isArray($$)){$$ = []}; $$.push($2)}'], ['attr', '{if (!Array.isArray($$)){$$ = []}; $$.push($1)}']],
        'attr': [['NAME OB items CB', '{$$={name: $1, items: $3}}']],
        'items': [['items item', '{if (!Array.isArray($$)){$$ = []}; $$.push($2)}'], ['item', '{if (!Array.isArray($$)){$$ = []}; $$.push($1)}']],
        'item': [['ITEM', '{$$=$$.replace(/(^")|("$)/g, "")}'], 'NAME'],
        'flow': [['NAME ARROW NAME', '{$$=$1.replace("-", "_") + $2+ $3.replace("-", "_"), yy.addFlow($$)}']]
    }
}


const parser = new Parser(grammar)
const crafts = {}
const groups = {}
const flows = []
const yy = {
    crafts,
    groups,
    flows,
    addGroup: (group, childs) => {
        const g = { name: group, crafts: [], subgroups: [], parent: '' }
        for (c of childs) {
            if (c.type == 'group') {
                groups[c.name]['parent'] = group
                g.subgroups.push(c.name)
            } else {
                g.crafts.push(c.name)
            }
        }
        groups[g.name] = g
    },
    addCraft: (craft) => {
        crafts[craft.name] = craft
    },
    addFlow: (flow) => {
        flows.push(flow)
    }
}
parser.yy = yy
craftdot = fs.readFileSync('example/example.craftdot', 'utf8')
parser.parse(craftdot)


function redner_diagraph(d) {
    return `
        digraph {
            node [shape="box"];
            ${render_groups(d.groups, d.crafts)}
            ${render_flows(d.flows)}
        }
        `
}


function render_groups(groups, crafts) {
    const rootGroups = Object.keys(groups).filter(x => groups[x].parent == '').map(x => groups[x])
    return rootGroups.map(rg => render_group(rg, crafts, groups)).join('')
}

function render_group(group, crafts, groups) {
    let crafts_contents = group.crafts.map(craft => render_craft(crafts[craft])).join('')
    let groups_contests = group.subgroups.map(subgroup => render_group(groups[subgroup], crafts, groups)).join('')
    return `
    subgraph cluster_${group.name.replace('-', '_')} {
        label="${group.name}";
        ${crafts_contents}
        ${groups_contests}
    }
    `

}

function render_craft(craft) {
    craft['craftid'] = craft.name.replace('-', '_')
    let template = `
    {{ craftid }} [
        shape="plaintext";
        label=<
            <table border='0' cellborder='1' cellspacing='0'>
                <tr><td>{{ name }}</td></tr>
                {{#attrs}}
                <tr>
                    <td cellpadding='4'>
                    <table border='0' cellspacing='0'>
                        <tr><td>{{ name }}</td></tr>
                        {{#items}}
                        <tr><td>{{{ . }}}</td></tr>
                        {{/items}}
                    </table>
                    </td>
                </tr>}
                {{/attrs}}
            </table>
        >
    ];
    `
    return mustache.render(template, craft)
}

function render_flows(flows) {
    let template = `
    {{#.}}
    {{{ . }}}
    {{/.}}
    `
    return mustache.render(template, flows)
}

console.log(redner_diagraph(parser.yy))
