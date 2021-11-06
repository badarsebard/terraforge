<!-- This Source Code Form is subject to the terms of the Mozilla Public
   - License, v. 2.0. If a copy of the MPL was not distributed with this
   - file, You can obtain one at https://mozilla.org/MPL/2.0/. -->
<script>
    import Editor from "./Editor.svelte";
    import {providers} from "./store";
    import {resources} from "./store";
    import {onDestroy} from 'svelte';

    import cytoscape from 'cytoscape';
    import klay from 'cytoscape-klay';
    import {options} from "./klay"

    cytoscape.use(klay);
    let cy;

    let design;
    let files;
    function readFile(f) {
        if (!f) {
            return
        }
        let fr = new FileReader();

        fr.onload = function (e) {
            $providers = {};
            let data = JSON.parse(e.target.result);
            for (const pr in data.provider_schemas) {
                let p = pr.split("/");
                p = p[p.length - 1];
                $providers[p] = {};
                $providers[p]["resource_schemas"] = data.provider_schemas[pr].resource_schemas;
                $providers[p]["data_source_schemas"] = data.provider_schemas[pr].data_source_schemas;

            }
            upload = false;
        }

        fr.readAsText(files.item(0));
    }
    $: readFile(files);
    function reupload(e) {
        upload = true;
    }

    let upload = true;
    let editorOn = false;
    let editNode;
    let filter = "";
    let selected;
    let stanzaType

    function saveDesign() {
        let data = JSON.stringify(cy.json());
        let file = new File([data], "terraforge.json", {
            type: "application/json",
        });
        const link = document.createElement("a");
        link.style.display = "none";
        link.href = URL.createObjectURL(file);
        link.download = file.name;
        location.href = "data:application/json" + data;
        document.body.appendChild(link);
        link.click();
        setTimeout(() => {
            URL.revokeObjectURL(link.href);
            link.parentNode.removeChild(link);
        }, 0);
    }
    function loadDesign() {
        let inp = document.getElementById("file-input");
        inp.click();
    }
    function parseDesignFile(f) {
        if (!f) {
            return
        }
        let fr = new FileReader();

        fr.onload = function (e) {
            let data = JSON.parse(e.target.result);
            for (let i = 0; i < data.style.length; i++) {
                if (data.style[i].selector === "node") {
                    data.style[i].style.label = tfName;
                    break
                }
            }
            cy.json(data);
            for (const node of data.elements.nodes) {
                let n = cy.$id(node.id)
                $resources.push(n);
            }
        }

        fr.readAsText(design.item(0));
    }
    function importHCL() {

    }
    function exportHCL() {
        let hcl = ''
        for (const r of $resources) {
            let d = r.data()
            let st = d.tf.stanzaType === "resource" ? "resource" : "data"
            hcl +=
`${st} "${d.tf.type}" "${d.tf.stanza_name}" {${Object.keys(d.tf.config).map((key) => {
    if (typeof d.tf.config[key] === "string") {
        if (d.tf.config[key].startsWith("$")) {
            return `
  ${key} = ${d.tf.config[key].slice(1)}`
        } else {
            return `
  ${key} = "${d.tf.config[key]}"`
        }
    } else {
        return `
  ${key} = ${d.tf.config[key]}`
    }
}).join('')}
}

`
        }
        console.log(hcl);
        let file = new File([hcl], "terraforge.tf", {
            type: "text/plain",
        });
        const link = document.createElement("a");
        link.style.display = "none";
        link.href = URL.createObjectURL(file);
        link.download = file.name;
        document.body.appendChild(link);
        link.click();
        setTimeout(() => {
            URL.revokeObjectURL(link.href);
            link.parentNode.removeChild(link);
        }, 0);
    }
    $: parseDesignFile(design);

    async function computeEdges(r) {
        let edges = [];
        let edgeIds = [];
        let nodeIdMap = {};
        for (const node of r) {
            let data = node.data();
            nodeIdMap[data.tf.type + "." + data.tf.stanza_name] = node.id();
        }
        for (const node of r) {
            let data = node.data();
            let config = data.tf.config
            for (const attr in config) {
                if (typeof config[attr] !== 'boolean' && config[attr].startsWith("$")) {
                    let ref;
                    if (config[attr].startsWith("$data.")) {
                        ref = config[attr].slice(6).split(".");
                    } else {
                        ref = config[attr].slice(1).split(".");
                    }
                    let s = nodeIdMap[ref[0] + "." + ref[1]];
                    if (s) {
                        let st = s+"|"+node.id()
                        let e = {
                            group: 'edges',
                            data: {
                                source: s,
                                target: node.id()
                            }
                        };
                        if (!edgeIds.includes(st)){
                            edgeIds.push(st);
                            edges.push(e);
                        }
                    }
                }
            }
        }
        cy.remove("edge");
        cy.add(edges);
    }

    function createResource(event) {
        let r = {
            tf: {
                provider: selected,
                stanzaType: stanzaType,
                type: event.target.innerText,
                config: {},
                stanza_name: ""
            }
        }
        let n = cy.add({
            group: "nodes",
            data: r,
        });
        $resources.push(n[0]);
        cy.layout(options).run();
    }

    function tfName(ele) {
        let d = ele.data();
        let t = d.tf.type;
        let n = d.tf.stanza_name
        if (n === "") {
            return t
        } else {
            return t + "." + n
        }
    }

    const startCy = function () {
        cy = cytoscape({
            container: document.getElementById('cy'),
            layout: {name: 'klay'},
            style: [
                {
                    selector: 'node',
                    style: {
                        label: tfName,
                        "text-halign": 'center',
                        "text-valign": 'bottom',
                    }
                },
                {
                    selector: 'edge',
                    style: {
                        'target-arrow-shape': 'triangle',
                        'curve-style': 'bezier'
                    }
                }
            ]
        });
        cy.on('tap', 'node', function (evt) {
            editNode = evt.target;
            editorOn = true;
            computeEdges($resources);
        });
        cy.on('data', 'node', function (evt) {
            computeEdges($resources);
        });
        cy.on('tap', function (event) {
            let evtTarget = event.target;
            if (evtTarget === cy) {
                editorOn = false;
                editNode = null;
            }
        });
    }
    let domLoaded = false;
    let cyStarted = false;
    document.addEventListener('DOMContentLoaded', () => domLoaded = true);

    let unsubscribe;
    $: if (domLoaded && !cyStarted) {
        startCy();
        cyStarted = true;
        cy.layout(options).run();
        unsubscribe = resources.subscribe(value => {
            cy.layout(options).run();
        });
    }

    onDestroy(unsubscribe);
</script>
<style>
    #cy {
        width: 100%;
        height: 100%;
        top: 0px;
        left: 0px;
    }
    .columns {
        max-height: 85vh;
        overflow: hidden;
    }
    .column {
        overflow: auto;
    }
    .navbar-item img {
        max-height: 4rem;
    }
</style>

<nav class="navbar" role="navigation" aria-label="main navigation">
    <div class="navbar-brand">
        <a class="navbar-item" href="/">
            <img src="/fulllogo_transparent_nobuffer.png" alt="Terraforge Logo">
        </a>
        <a role="button" class="navbar-burger" aria-label="menu" aria-expanded="false">
            <span aria-hidden="true"></span>
            <span aria-hidden="true"></span>
            <span aria-hidden="true"></span>
        </a>
    </div>

    <div id="navbar" class="navbar-menu">
        <div class="navbar-start">
            <a class="navbar-item" on:click={reupload}>
                Upload Providers Schema
            </a>
            <div class="navbar-item has-dropdown is-hoverable">
                <a class="navbar-link">
                    Design
                </a>
                <div class="navbar-dropdown">
                    <a class="navbar-item" on:click={loadDesign}>
                        Load
                    </a>
                    <a class="navbar-item" on:click={saveDesign}>
                        Save
                    </a>
                </div>
            </div>
            <div class="navbar-item has-dropdown is-hoverable">
                <a class="navbar-link">
                    HCL
                </a>
                <div class="navbar-dropdown">
                    <a class="navbar-item" on:click={importHCL}>
                        Import
                    </a>
                    <a class="navbar-item" on:click={exportHCL}>
                        Export
                    </a>
                </div>
            </div>
        </div>
    </div>
</nav>

<div class="columns m-4">
    {#if editorOn}
        <div class="column is-narrow">
            <Editor stanzaType={stanzaType} resource={editNode}/>
        </div>
    {/if}
    <div class="column">
        <div id="cy"></div>
    </div>
    <div class="column is-narrow">
        {#if (!files || upload)}
            <div class="file">
                <label class="file-label">
                    <input class="file-input" type="file" bind:files>
                    <span class="file-cta">
                        <span class="file-label">
                            Upload provider schemas
                        </span>
                    </span>
                </label>
            </div>
        {/if}
        {#if files}
            <div class="table-container">
                <table class="table is-hoverable">
                    <thead>
                    <tr>
                        <th>
                            <div class="is-inline pr-4 is-size-4">
                                Provider
                            </div>
                            <div class="select is-inline is-pulled-right is-rounded">
                                <select bind:value={selected}>
                                    {#each Object.keys($providers) as provider, i}
                                        <option value={provider}>{provider}</option>
                                    {/each}
                                </select>
                            </div>
                        </th>
                    </tr>
                    <tr>
                        <th>
                            <div class="control">
                                <label class="radio">
                                    <input type="radio" bind:group={stanzaType} name="stanzaType" value="resource">
                                    Resource
                                </label>
                                <label class="radio">
                                    <input type="radio" bind:group={stanzaType} name="stanzaType" value="data_source">
                                    Data Source
                                </label>
                            </div>
                            <input bind:value={filter} class="input is-rounded" type="text">
                        </th>
                    </tr>
                    </thead>
                    <tbody>
                    {#if (selected && stanzaType)}
                        {#each Object.keys($providers[selected][stanzaType+"_schemas"]) as rt}
                            {#if (rt.includes(filter))}
                                <tr on:dblclick={createResource}>
                                    <td>{rt}</td>
                                </tr>
                            {/if}
                        {/each}
                    {/if}
                    </tbody>
                </table>
            </div>
        {/if}
    </div>
</div>
<input id="file-input" type="file" style="display: none;" bind:files={design} />