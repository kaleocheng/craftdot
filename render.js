const mustache = require('mustache')

String.prototype.replaceAll = function (search, replacement) {
    return this.split(search).join(replacement)
}

function render_diagraph(d) {
    return `
        digraph {
            node [shape="box"];
            compound=true;
            ${render_root_crafts(d.nodes, d.parsedNodes)}
            ${render_groups(d.nodes, d.parsedNodes)}
            ${render_flows(d.parsedFlows, d.nodePath2ID, d.nodes)}
        }
        `
}

function render_root_crafts(nodesDict, nodesArray) {
    const rootCrafts = nodesArray.filter(n => n.type == 'craft').filter(c => !('group' in c))
    return rootCrafts.map(craft => render_craft(craft)).join('')
}

function render_groups(nodesDict, nodesArray) {
    const rootGroups = nodesArray.filter(n => n.type == 'group').filter(g => g.parent == '')
    return rootGroups.map(rg => render_group(rg, nodesDict, nodesArray)).join('')
}

function render_group(group, nodesDict, nodesArray) {
    let crafts_contents = nodesArray.filter(n => n.type == 'craft').filter(c => c.group == group.id).map(craft => render_craft(craft)).join('')
    let groups_contests = group.subgroups.map(subgroup => render_group(nodesDict[subgroup], nodesDict, nodesArray)).join('')
    return `
    subgraph cluster_${group.path.replace(/-/g, '_')} {
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


function render_flows(flows, nodePath2ID, nodes) {
    let flowsRenderd = []
    for (f of flows) {
        let from = f.fromPath.replaceAll('-', '_')
        let to = f.toPath.replaceAll('-', '_')
        let fromGroup = ''
        let toGroup = ''
        let fromCraft = ''
        let toCraft = ''
        let attr = []

        if (f.fromPath in nodePath2ID) {
            const nid = nodePath2ID[f.fromPath]
            if (nodes[nid].type == 'group') {
                fromGroup = nodes[nid].path.replaceAll('-', '_')
                const index = Math.floor(nodes[nid].crafts.length / 2)
                fromCraft = nodes[nodes[nid].crafts[index]].path.replaceAll('-', '_')
            }
        }
        if (f.toPath in nodePath2ID) {
            const nid = nodePath2ID[f.toPath]
            if (nodes[nid].type == 'group') {
                toGroup = nodes[nid].path.replaceAll('-', '_')
                const index = Math.floor(nodes[nid].crafts.length / 2)
                toCraft = nodes[nodes[nid].crafts[index]].path.replaceAll('-', '_')
            }
        }

        if (fromGroup) {
            from = fromCraft.replaceAll('-', '_')
            attr.push(`ltail="cluster_${fromGroup}";`)
        }

        if (toGroup) {
            to = toCraft.replaceAll('-', '_')
            attr.push(`lhead="cluster_${toGroup}";`)
        }

        if ('styleAttrs' in f) {
            attr.push(...f.styleAttrs)
        }

        flowsRenderd.push(`${from}->${to}[${attr.join('')}]`)
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
