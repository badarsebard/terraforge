<!-- This Source Code Form is subject to the terms of the Mozilla Public
   - License, v. 2.0. If a copy of the MPL was not distributed with this
   - file, You can obtain one at https://mozilla.org/MPL/2.0/. -->

<script>
    import Editor from "./Editor.svelte";
    import { providers } from "./store";
    import { resources } from "./store";
    import { onDestroy } from 'svelte';

    import cytoscape from 'cytoscape';
    import klay from 'cytoscape-klay';
    import { options } from "./klay"

    import unsavedInputPreventNavigation from "./prevent_navigation";
    const { unsaved, action } = unsavedInputPreventNavigation();

    cytoscape.use(klay);
    let cy;

    function generateUID() {
        let firstPart = (Math.random() * 46656) | 0;
        let secondPart = (Math.random() * 46656) | 0;
        firstPart = ("000" + firstPart.toString(36)).slice(-3);
        secondPart = ("000" + secondPart.toString(36)).slice(-3);
        return firstPart + secondPart;
    }
    async function response2array(r) {
        let ret = await r.blob();
        ret = await ret.text();
        ret = await ret.trim();
        ret = await ret.split("\n")
        return ret
    }
    let providerChoices = {};
    (async function getProviders() {
        let official = await fetch("https://raw.githubusercontent.com/badarsebard/terraform-schemas/main/schemas/manifest.official.txt").then(r => response2array(r));
        let partner = await fetch("https://raw.githubusercontent.com/badarsebard/terraform-schemas/main/schemas/manifest.partner.txt").then(r => response2array(r));
        let community = await fetch("https://raw.githubusercontent.com/badarsebard/terraform-schemas/main/schemas/manifest.community.txt").then(r => response2array(r));
        for (const p of official) {
            let pId = generateUID();
            let gitName = p.replace("/", "_")
            let name = p.split("/")[1]
            providerChoices[pId] = {gitname: gitName, type: "official", fullname: p, name: name};
        }
        for (const p of partner) {
            let pId = generateUID();
            let gitName = p.replace("/", "_")
            let name = p.split("/")[1]
            providerChoices[pId] = {gitname: gitName, type: "partner", fullname: p, name: name};
        }
        for (const p of community) {
            let pId = generateUID();
            let gitName = p.replace("/", "_")
            let name = p.split("/")[1]
            providerChoices[pId] = {gitname: gitName, type: "community", fullname: p, name: name};
        }
        // providerChoices.sort((f, s) => {if (f.name < s.name){return -1} else {return 1}})
    })();

    let selectedProviders = [];
    let design;
    let files;
    function readSchema(f) {
        if (!f) {
            return
        }
        let fr = new FileReader();

        fr.onload = function (e) {
            $providers = {};
            selected = undefined;
            let data = JSON.parse(e.target.result);
            parseProviderSchema(data);
            upload = false;
        }

        fr.readAsText(files.item(0));
    }
    $: readSchema(files);

    function parseProviderSchema(data) {
        for (const pr in data.provider_schemas) {
            let p = pr.replace("registry.terraform.io/", "");
            $providers[p] = {};
            $providers[p]["resource_schemas"] = data.provider_schemas[pr].resource_schemas;
            $providers[p]["data_source_schemas"] = data.provider_schemas[pr].data_source_schemas;
        }
    }
    function reupload(e) {
        upload = true;
    }

    let upload = true;

    async function runWizard(e) {
        wizard = "is-active"
    }

    let editorOn = false;
    let editNode;
    let filter = "";
    let pfilter = "";
    let ptypes = [];
    let selected;
    let stanzaType
    let wizard = "";

    async function setProviders() {
        $providers = {};
        selected = undefined;
        // create json frame
        let data = {
            format_version: "0.2",
            provider_schemas: {}
        }
        // iterate through selected providers
        for (const p of selectedProviders) {
            // grab the schema from github
            let pChoice = providerChoices[p]
            let schema = await fetch(`https://raw.githubusercontent.com/badarsebard/terraform-schemas/main/schemas/${pChoice.type}/${pChoice.gitname}.json`).then(r => r.json())
            // attach to frame
            data.provider_schemas[`registry.terraform.io/${pChoice.fullname}`] = schema.provider_schemas[`registry.terraform.io/${pChoice.fullname}`];
        }
        parseProviderSchema(data);
        wizard = "";
    }
    function uploadProvider() {
        let inp = document.getElementById("provider-input");
        inp.click();
    }
    function saveDesign() {
        let data = JSON.stringify(cy.json());
        let file = new File([data], "terraforge.json", {
            type: "application/json",
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
        $unsaved = false;
    }
    function loadDesign() {
        let inp = document.getElementById("design-input");
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
                let n = cy.$id(node.data.id)
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
            let data = r.data()
            let stanzaType = data.tf.stanzaType === "resource" ? "resource" : "data"
            hcl +=
`${stanzaType} "${data.tf.type}" "${data.tf.stanza_name}" {${Object.keys(data.tf.config.attributes).map((key) => {
    if (typeof data.tf.config.attributes[key] === "string") {
        if (data.tf.config.attributes[key].startsWith("$")) {
            return `
  ${key} = ${data.tf.config.attributes[key].slice(1)}`
        } else {
            return `
  ${key} = "${data.tf.config.attributes[key]}"`
        }
    } else {
        return `
  ${key} = ${data.tf.config.attributes[key]}`
    }
}).join('')}${Object.keys(data.tf.config.blocks).map((key) => {
    if (typeof data.tf.config.blocks[key] === "string") {
        return `
  ${key} ${data.tf.config.blocks[key].replace("$", "")}`
    } else {
        let retVar = ``;
        for (const block of data.tf.config.blocks[key]) {
            retVar += `

  ${key} ${block.replace("$", "")}`
        }
        return retVar
    }
}).join('')}
}

`
        }
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

    function pushMatches(matches, nodeIdMap, node, edgeIds, edges) {
        for (const match of matches) {
            let source = nodeIdMap[match[1]];
            let edgeId = source+"|"+node.id();
            let edge = {
                group: 'edges',
                data: {
                    source: source,
                    target: node.id()
                }
            };
            if (!edgeIds.includes(edgeId)){
                edgeIds.push(edgeId);
                edges.push(edge);
            }
        }
    }

    async function computeEdges(r) {
        let edges = [];
        let edgeIds = [];
        let nodeIdMap = {};
        const regexp = /\$(\w+\.\w+)/g;
        for (const node of r) {
            let data = node.data();
            if (data) {
                nodeIdMap[data.tf.type + "." + data.tf.stanza_name] = node.id();
            } else {
                return
            }
        }
        for (const node of r) {
            let data = node.data();
            let config = data.tf.config
            for (const attr in config.attributes) {
                const matches = [...config.attributes[attr].matchAll(regexp)];
                pushMatches(matches, nodeIdMap, node, edgeIds, edges)
            }
            for (const block in config.blocks) {
                switch (typeof config.blocks[block]) {
                    case "string":
                        const matches = [...config.blocks[block].matchAll(regexp)];
                        pushMatches(matches, nodeIdMap, node, edgeIds, edges)
                        break;
                    case "object":
                        switch (Array.isArray(config.blocks[block])) {
                            case true:
                                for (const blocki of config.blocks[block]) {
                                    const matches = [...blocki.matchAll(regexp)];
                                    pushMatches(matches, nodeIdMap, node, edgeIds, edges)
                                }
                                break;

                            case false:
                                for (const block_name in config.blocks[block]) {
                                    const matches = [...config.blocks[block][block_name].matchAll(regexp)]
                                    pushMatches(matches, nodeIdMap, node, edgeIds, edges)
                                }
                                break;
                        }
                        break;
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
                config: {
                    attributes: {},
                    blocks: {}
                },
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
        let data = ele.data();
        let type = data.tf.type;
        let stanzaType = data.tf.stanzaType;
        let stanzaName = data.tf.stanza_name;
        if (stanzaName === "") {
            return stanzaType === "resource" ? type : `data.${type}`
        } else {
            return stanzaType === "resource" ? `${type}.${stanzaName}` : `data.${type}.${stanzaName}`
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
                        'text-halign': 'center',
                        'text-valign': 'bottom',
                        'background-color': '#81007B',
                        'color': '#aaa'
                    }
                },
                {
                    selector: 'edge',
                    style: {
                        'target-arrow-shape': 'triangle',
                        'curve-style': 'bezier',
                        'line-color': '#81007B',
                        'target-arrow-color': '#81007B'
                    }
                },
                {
                    selector: ':selected',
                    style: {
                        'background-color': 'blue'
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
<style global lang="scss">
    @import "main.scss";
    #cy {
        width: 100%;
        height: 100%;
        top: 0;
        left: 0;
    }
    .columns {
        max-height: 85vh;
        overflow: hidden;
    }
    .tall-columns {
        min-height: 50vh;
    }
    .column {
        overflow: auto;
    }
    .navbar-item img {
      max-height: 4rem;
    }
    table {
      border-radius: 12px;
      -moz-border-radius: 12px;
    }
    .level {
      align-items: end;
    }

    .col {
      flex: 1 2 33.33333%;
      white-space: nowrap;
    }
    div.column.is-flex::after {
      content: '';
      flex-grow: 1000000000;
    }

    /* Tooltip container */
    .tooltip {
      position: relative;
      display: inline-block;
      border-bottom: 1px dotted black; /* If you want dots under the hoverable text */
    }

    /* Tooltip text */
    .tooltip .tooltiptext {
      visibility: hidden;
      background-color: black;
      color: #fff;
      text-align: center;
      padding: 5px 0;
      border-radius: 6px;

      /* Position the tooltip text - see examples below! */
      position: absolute;
      z-index: 1;
    }

    /* Show the tooltip text when you mouse over the tooltip container */
    .tooltip:hover .tooltiptext {
      visibility: visible;
    }

    .tooltip-right {
      top: -5px;
      left: 125%;
    }

    .tooltip .tooltiptext::after {
      content: " ";
      position: absolute;
      top: 50%;
      right: 100%; /* To the left of the tooltip */
      margin-top: -5px;
      border-width: 5px;
      border-style: solid;
      border-color: transparent black transparent transparent;
    }

    .tooltip .tooltiptext {
      opacity: 0;
      transition: opacity 1s;
    }

    .tooltip:hover .tooltiptext {
      opacity: 1;
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
            <div class="navbar-item has-dropdown is-hoverable">
                <a class="navbar-link">
                    Providers
                </a>
                <div class="navbar-dropdown">
                    <a class="navbar-item" on:click={runWizard}>
                        Wizard
                    </a>
                    <a class="navbar-item" on:click={uploadProvider}>
                        Upload Manually
                    </a>
                </div>
            </div>
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
            <a class="navbar-item" on:click={exportHCL}>
                Export HCL
            </a>
            <!-- <div class="navbar-item has-dropdown is-hoverable">
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
            </div> -->
        </div>
        <div class="navbar-end">
            <div class="navbar-item">
                <span class="icon is-large">
                  <a href="https://github.com/badarsebard/terraforge"><i class="fab fa-github fa-2x"></i></a>
                </span>
            </div>
        </div>
    </div>
</nav>

<div use:action>
<div class="columns tall-columns m-4">
    {#if editorOn}
        <div class="column is-narrow">
            <Editor stanzaType={stanzaType} resource={editNode} bind:cy={cy} bind:editorOn={editorOn}/>
        </div>
    {/if}
    <div class="column">
        <div id="cy"></div>
    </div>
    <div class="column is-narrow">
        {#if $providers}
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
                                    {#each Object.keys($providers) as provider}
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
<input id="design-input"   type="file" style="display: none;" bind:files={design} />
<input id="provider-input" type="file" style="display: none;" bind:files>
</div>
<div class="modal {wizard}">
    <div on:click={() => wizard = ""} class="modal-background"></div>
    <div class="modal-content">
        <div class="box">
            <div class="columns">
                <div class="column">
                    <div class="level">
                        <div class="level-item" style="display: block;">
                            <label class="label">Filters</label>
                            <div class="control">
                                <input bind:value={pfilter} class="input control is-rounded" type="text">
                            </div>
                        </div>
                        <div class="level-item">
                            <div class="control">
                                <label class="checkbox">
                                    <input type="checkbox" bind:group={ptypes} value="official">
                                    Official
                                </label>
                            </div>
                        </div>
                        <div class="level-item">
                            <div class="control">
                                <label class="checkbox">
                                    <input type="checkbox" bind:group={ptypes} value="partner">
                                    Partner
                                </label>
                            </div>
                        </div>
                        <div class="level-item">
                            <div class="control">
                                <label class="checkbox">
                                    <input type="checkbox" bind:group={ptypes} value="community">
                                    Community
                                </label>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="columns">
                <div class="column is-flex is-flex-wrap-wrap is-justify-content-flex-start">
                    {#each Object.keys(providerChoices) as pId}
                        {#if (providerChoices[pId].name.includes(pfilter) && pfilter.length > -1 && ptypes.includes(providerChoices[pId].type))}
                            <div class="control col is-inline-flex">
                                <label class="checkbox is-inline-flex tooltip">
                                    <input type="checkbox" bind:group={selectedProviders} value={pId} class="is-inline-flex mr-1">
                                    {providerChoices[pId].name}
                                    <span class="tooltiptext tooltip-right">{providerChoices[pId].fullname}</span>
                                </label>
                            </div>
                        {/if}
                    {/each}
                </div>
            </div>
            <hr class="has-background-grey-light">
            <div class="columns">
                <div class="column">
                    <div class="control is-pulled-right">
                        <button class="button is-primary" on:click={setProviders}>Submit</button>
                    </div>
                </div>
            </div>
        </div>
    </div>
    <button on:click={() => wizard = ""} class="modal-close is-large" aria-label="close"></button>
</div>