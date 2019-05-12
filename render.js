const mustache = require('mustache')

String.prototype.replaceAll = function (search, replacement) {
    return this.split(search).join(replacement)
}

function render_diagraph(d) {
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
    craft['craftid'] = craft.name.replaceAll('-', '_')
    let template = `
    {{ craftid }} [
        shape="plaintext";
        {{#styles}}
        {{{.}}}
        {{/styles}}
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
    let flowsRenderd = []
    for (f of flows) {
        if ('styles' in f) {
            flowsRenderd.push(`${f.from.replaceAll('-', '_')}->${f.to.replaceAll('-', '_')}[${f.styles.join('')}]`)
        } else {
            flowsRenderd.push(`${f.from.replaceAll('-', '_')}->${f.to.replaceAll('-', '_')}`)
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
