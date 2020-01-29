const mustache = require('mustache')

String.prototype.replaceAll = function (search, replacement) {
    return this.split(search).join(replacement)
}

function render_diagraph(d) {
    return `
        digraph {
            node [shape="box"];
            ${render_root_crafts(d.parsedCrafts)}
            ${render_groups(d.groups, d.parsedCrafts)}
            ${render_flows(d.parsedFlows)}
        }
        `
}

function render_root_crafts(crafts) {
    const rootCrafts = crafts.filter(c => !('group' in c))
    return rootCrafts.map(craft => render_craft(craft)).join('')
}

function render_groups(groups, crafts) {
    const rootGroups = Object.keys(groups).filter(x => groups[x].parent == '').map(x => groups[x])
    return rootGroups.map(rg => render_group(rg, crafts, groups)).join('')
}

function render_group(group, crafts, groups) {
    let crafts_contents = crafts.filter(c => c.group == group.id).map(craft => render_craft(craft)).join('')
    let groups_contests = group.subgroups.map(subgroup => render_group(groups[subgroup], crafts, groups)).join('')
    return `
    subgraph cluster_${group.name.replace(/-/g, '_')} {
        label="${group.name}";
        ${crafts_contents}
        ${groups_contests}
    }
    `

}

function render_craft(craft) {
    craft.path = craft.path.replaceAll('-', '_')
    let template = `
    {{ path }} [
        shape="plaintext";
        {{#styleAttrs}}
        {{{.}}}
        {{/styleAttrs}}
        label=<
            <table border='0' cellborder='1' cellspacing='0'>
                <tr><td>{{ name }}</td></tr>
                {{#attrs}}
                <tr>
                    <td cellpadding='4'>
                    <table border='0' cellspacing='0'>
                    {{#value}}
                        <tr><td align="left" >{{ name }}: </td><td align="left">{{ value }}</td></tr>
                    {{/value}}
                    {{^value}}
                        <tr><td align="left" bgcolor="#c4c4c4">{{ name }}:</td></tr>
                        {{#items}}
                        <tr><td align="left">- {{{ . }}}</td></tr>
                        {{/items}}
                    {{/value}}

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
    let flowsRenderd = []
    for (f of flows) {
        if ('styleAttrs' in f) {
            flowsRenderd.push(`${f.fromPath.replaceAll('-', '_')}->${f.toPath.replaceAll('-', '_')}[${f.styleAttrs.join('')}]`)
        } else {
            flowsRenderd.push(`${f.fromPath.replaceAll('-', '_')}->${f.toPath.replaceAll('-', '_')}`)
        }
    }
    let template = `
    {{#.}}
    {{{ . }}}
    {{/.}}
    `
    return mustache.render(template, flowsRenderd)
}

module.exports = {
    render_diagraph
}
