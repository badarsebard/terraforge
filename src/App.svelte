<!-- This Source Code Form is subject to the terms of the Mozilla Public
   - License, v. 2.0. If a copy of the MPL was not distributed with this
   - file, You can obtain one at https://mozilla.org/MPL/2.0/. -->

<script>
    import Editor from "./Editor.svelte";
    import {providerSchemas, resources, editorOn, editNode, cy, hclVariables, hclOutputs, hclLocals} from "./store";
    import {onDestroy} from 'svelte';

    import cytoscape from 'cytoscape';
    import klay from 'cytoscape-klay';
    import {options} from "./klay";
    import {getProviders, parseProviderSchema, setProviders} from "./providers";
    import {exportHCL, importHCL} from "./hcl";
    import {parseDesignFile} from "./design";
    import {startCy, saveDesign, createResource} from "./utils";
    import {tfSchema} from "./tfSchema";

    import unsavedInputPreventNavigation from "./prevent_navigation";

    const {action} = unsavedInputPreventNavigation();

    let providerChoices = {};        // all potential providers from the terraform-schemas repo
    let selectedProviders = [];      // the providers selected through the wizard
    // providerSchemas               // the terraform schemas of the selected providers
    let providerConfigurations = {}; // the provider configurations for the selected providers
    let design;
    let files;
    let hclConfig;
    let filter = "";
    let pfilter = "";
    let ptypes = [];
    let selected;
    let stanzaType;
    let wizard = "";
    let hclVariablesModal = "";
    let hclOutputsModal = "";
    let hclLocalsModal = "";
    let cyStarted = false;
    let unsubscribe;
    let hVarSelected = "";
    let hOutSelected = "";
    let hLocalSelected = "";

    cytoscape.use(klay);
    getProviders(providerChoices);

    $: ((files) => {
        if (!files) {
            return
        }
        let fr = new FileReader();

        fr.onload = function (e) {
            $providerSchemas = {};
            $providerSchemas["terraform"] = {
                provider: {
                    block: tfSchema
                }
            }
            selected = undefined;
            let data = JSON.parse(e.target.result);
            parseProviderSchema(data);
        }

        fr.readAsText(files.item(0));
    })();

    $: parseDesignFile(design);
    $: importHCL(hclConfig);

    function setProvidersWrapper() {
        wizard = "";
        setProviders(selected, selectedProviders, providerChoices)
    }

    async function openProviderEditor() {
        let providerNode = $cy.$id(selected);
        if (providerNode.empty()) {
            let r = {
                type: 'provider',
                tf: {
                    provider: selected,
                    stanzaType: 'provider',
                    type: selected,
                    config: {
                        attributes: {},
                        blocks: {}
                    },
                    stanzaName: ""
                }
            }
            await createResource(r);
            providerNode = $cy.$id(selected);
        }
        $editorOn = true;
        $editNode = providerNode;
    }

    function createResourceWrapper(event) {
        let r = {
            type: stanzaType,
            tf: {
                provider: selected,
                stanzaType: stanzaType,
                type: event.target.innerText,
                config: {
                    attributes: {},
                    blocks: {}
                },
                stanzaName: ""
            }
        }
        createResource(r);
    }

    function parseVariableString(h) {
        let hcl = "";
        let out = {...h};
        delete out.name;
        hcl += `
variable ${h.name} {
`
        for (const a in out) {
            if (out[a]) {
                if (a === "validation") {
                    hcl += `  ${a} ${out[a]}
`
                } else {
                    hcl += `  ${a} = ${out[a]}
`
                }
            }
        }
        hcl += `}`
        return hcl
    }

    function parseOutputString(h) {
        let hcl = "";
        let out = {...h};
        delete out.name;
        hcl += `
output ${h.name} {
`
        for (const a in out) {
            if (out[a]) {
                hcl += `  ${a} = ${out[a]}
`
            }
        }
        hcl += `}`
        return hcl
    }

    function parseLocalsString(hclLocals) {
        let hcl = "";
        hcl += `
locals {
`
        for (const l of hclLocals) {
            if (l.value) {
                hcl += `  ${l.name} = ${l.value}
`
            }
        }
        hcl += `}`
        return hcl
    }

    document.addEventListener('DOMContentLoaded', () => {
        if (!cyStarted) {
            $cy = startCy();
            cyStarted = true;
            $cy.layout(options).run();
            unsubscribe = resources.subscribe(() => {
                $cy.layout(options).run();
            });
        }
    });

    function hVarToggle(evt) {
        let t = document.getElementById("hvar-toggle");
        for (const v of t.children) {
            v.classList.remove("is-active");
        }
        evt.target.parentNode.classList.add("is-active");
        hVarSelected = evt.target.parentNode.id;
    }

    function hOutToggle(evt) {
        let t = document.getElementById("hout-toggle");
        for (const v of t.children) {
            v.classList.remove("is-active");
        }
        evt.target.parentNode.classList.add("is-active");
        hOutSelected = evt.target.parentNode.id;
    }

    function hLocalToggle(evt) {
        let t = document.getElementById("hlocal-toggle");
        for (const v of t.children) {
            v.classList.remove("is-active");
        }
        evt.target.parentNode.classList.add("is-active");
        hLocalSelected = evt.target.parentNode.id;
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

  .is-clickable:hover {
    color: #7a8288;
  }

  .is-clickable:active {
    transform: scale(0.9);;
  }

</style>

<nav class="navbar" role="navigation" aria-label="main navigation">
    <div class="navbar-brand">
        <a class="navbar-item" href="https://www.terraforge.tf">
            <img src="/fulllogo_transparent_nobuffer.png" alt="Terraforge Logo">
        </a>
    </div>

    <div id="navbar" class="navbar-menu">
        <div class="navbar-start">
            <div class="navbar-item has-dropdown is-hoverable">
                <div class="navbar-link">
                    Providers
                </div>
                <div class="navbar-dropdown">
                    <div class="navbar-item is-clickable" on:click={() => wizard="is-active"}>
                        Wizard
                    </div>
                    <div class="navbar-item is-clickable"
                         on:click={() => document.getElementById("provider-input").click()}>
                        Upload Manually
                    </div>
                </div>
            </div>
            <div class="navbar-item has-dropdown is-hoverable">
                <div class="navbar-link">
                    Design
                </div>
                <div class="navbar-dropdown">
                    <div class="navbar-item is-clickable"
                         on:click={() => document.getElementById("design-input").click()}>
                        Load
                    </div>
                    <div class="navbar-item is-clickable" on:click={saveDesign}>
                        Save
                    </div>
                </div>
            </div>
            <div class="navbar-item has-dropdown is-hoverable">
                <div class="navbar-link">
                    HCL
                </div>
                <div class="navbar-dropdown">
                    {#if Object.keys($providerSchemas).length === 0}
                        <div class="navbar-item is-clickable tooltip" disabled>
                            Import
                            <span class="tooltiptext tooltip-right">Provider configuration required for import</span>
                        </div>
                    {:else}
                        <div class="navbar-item is-clickable"
                             on:click={() => document.getElementById("hcl-input").click()}>
                            Import
                        </div>
                    {/if}
                    <div class="navbar-item is-clickable" on:click={exportHCL}>
                        Export
                    </div>
                </div>
            </div>
            <div class="navbar-item is-clickable" on:click={() => hclVariablesModal="is-active"}>
                Variables
            </div>
            <div class="navbar-item is-clickable" on:click={() => hclOutputsModal="is-active"}>
                Outputs
            </div>
            <div class="navbar-item is-clickable" on:click={() => hclLocalsModal="is-active"}>
                Locals
            </div>
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
        {#if $editorOn}
            <div class="column is-narrow">
                <Editor stanzaType={stanzaType}/>
            </div>
        {/if}
        <div class="column">
            <div id="cy"></div>
        </div>
        <div class="column is-narrow">
            {#if $providerSchemas}
                <div class="table-container">
                    <table class="table is-hoverable">
                        <thead>
                        <tr>
                            <th>
                                <div class="is-inline pr-4 is-size-4">
                                    Provider
                                    <i class="fas fa-cog is-clickable" on:click={openProviderEditor}></i>
                                </div>
                                <div class="select is-inline is-pulled-right is-rounded">
                                    <select bind:value={selected}>
                                        {#each Object.keys($providerSchemas) as provider}
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
                                        <input type="radio" bind:group={stanzaType} name="stanzaType"
                                               value="data_source">
                                        Data Source
                                    </label>
                                </div>
                                <input bind:value={filter} class="input is-rounded" type="text">
                            </th>
                        </tr>
                        </thead>
                        <tbody>
                        {#if (selected && stanzaType && $providerSchemas[selected][stanzaType + "_schemas"])}
                            {#each Object.keys($providerSchemas[selected][stanzaType + "_schemas"]) as rt}
                                {#if (rt.includes(filter))}
                                    <tr on:dblclick={createResourceWrapper}>
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
<input id="design-input" type="file" style="display: none;" bind:files={design}/>
<input id="provider-input" type="file" style="display: none;" bind:files>
<input id="hcl-input" type="file" style="display: none;" bind:files={hclConfig}>
<div class="modal {wizard}">
    <div on:click={() => wizard = ""} class="modal-background"></div>
    <div class="modal-content">
        <div class="box">
            <div class="columns">
                <div class="column">
                    <div class="level">
                        <div class="level-item" style="display: block;">
                            <label class="label" for="providerFilter">Filters</label>
                            <div class="control" id="providerFilter">
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
                                    <input type="checkbox" bind:group={selectedProviders} value={pId}
                                           class="is-inline-flex mr-1">
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
                        <button class="button is-primary" on:click={setProvidersWrapper}>Submit</button>
                    </div>
                </div>
            </div>
        </div>
    </div>
    <button on:click={() => wizard = ""} class="modal-close is-large" aria-label="close"></button>
</div>
<div class="modal {hclVariablesModal}">
    <div on:click={() => hclVariablesModal = ""} class="modal-background"></div>
    <div class="modal-content" style="width: 50%">
        <div class="box">
            <h1 class="is-size-1" style="display: inline-block">Variables</h1>
            <button class="button is-pulled-right"
                    on:click={() => $hclVariables = $hclVariables.concat([{name: "new", default: "", type: "", description: "", validation: "", sensitive: false}])}>
        <span class="icon has-text-success">
            <i class="fas fa-plus-circle"></i>
        </span>
            </button>
            <div class="tabs is-toggle">
                <ul id="hvar-toggle">
                    {#each $hclVariables as hVar, i}
                        <li id="hvar-{i}" on:click={hVarToggle}><a>{hVar.name.replaceAll('"', '')}</a></li>
                    {/each}
                </ul>
            </div>
            <div class="columns">
                <div class="column is-one-third">
                    {#each $hclVariables as hVar, i}
                        {#if `hvar-${i}` === hVarSelected}
                            <div class="field">
                                <label class="label">
                                    Name
                                    <span class="icon has-text-danger is-pulled-right">
                                <i class="fas fa-times-circle" aria-hidden="true"
                                   on:click={() => {$hclVariables.splice(i, 1); $hclVariables = $hclVariables}}></i>
                            </span>
                                </label>
                                <div class="control">
                                    <input bind:value={hVar.name} class="input is-rounded is-small" type="text">
                                </div>
                            </div>
                            <div class="field">
                                <label class="label">Type</label>
                                <div class="control">
                                    <input bind:value={hVar.type} class="input is-rounded is-small" type="text">
                                </div>
                            </div>
                            <div class="field">
                                <label class="label">Default</label>
                                <div class="control">
                                    <input bind:value={hVar.default} class="input is-rounded is-small" type="text">
                                </div>
                            </div>
                            <div class="field">
                                <label class="label">Description</label>
                                <div class="control">
                                    <input bind:value={hVar.description} class="input is-rounded is-small"
                                           type="text">
                                </div>
                            </div>
                            <div class="field">
                                <label class="label">Validation</label>
                                <div class="control">
                                    <textarea bind:value={hVar.validation} class="input textarea is-small"></textarea>
                                </div>
                            </div>
                            <div class="field">
                                <label class="label">Sensitive</label>
                                <div class="control">
                                    <input bind:checked={hVar.sensitive} type="checkbox">
                                </div>
                            </div>
                        {/if}
                    {/each}
                </div>
                <div class="column">
                    {#each $hclVariables as hVar, i}
                        {#if `hvar-${i}` === hVarSelected}
                            <pre>{parseVariableString(hVar)}</pre>
                        {/if}
                    {/each}
                </div>
                <div class="columns">
                    <div class="column">
                        <hr class="has-background-grey-light">
                    </div>
                </div>
            </div>
            <button on:click={() => hclVariablesModal = ""} class="modal-close is-small is-rounded"
                    aria-label="close"></button>
        </div>
    </div>
</div>
<div class="modal {hclOutputsModal}">
    <div on:click={() => hclOutputsModal = ""} class="modal-background"></div>
    <div class="modal-content" style="width: 50%">
        <div class="box">
            <h1 class="is-size-1" style="display: inline-block">Outputs</h1>
            <button class="button is-pulled-right" on:click={() => $hclOutputs = $hclOutputs.concat([{name: "new", value: "", description: "", sensitive: false, depends_on: ""}])}>
                <span class="icon has-text-success">
                    <i class="fas fa-plus-circle"></i>
                </span>
            </button>
            <div class="tabs is-toggle">
                <ul id="hout-toggle">
                    {#each $hclOutputs as hOut, i}
                        <li id="hout-{i}" on:click={hOutToggle}><a>{hOut.name.replaceAll('"', '')}</a></li>
                    {/each}
                </ul>
            </div>
            <div class="columns">
                <div class="column is-one-third">
                    {#each $hclOutputs as hOut, i}
                        {#if `hout-${i}` === hOutSelected}
                            <div class="field">
                                <label class="label">
                                    Name
                                    <span class="icon has-text-danger is-pulled-right">
                                        <i class="fas fa-times-circle" aria-hidden="true" on:click={() => {$hclOutputs.splice(i, 1); $hclOutputs = $hclOutputs}}></i>
                                    </span>
                                </label>
                                <div class="control">
                                    <input bind:value={hOut.name} class="input is-rounded is-small" type="text">
                                </div>
                            </div>
                            <div class="field">
                                <label class="label">Value</label>
                                <div class="control">
                                    <input bind:value={hOut.value} class="input is-rounded is-small" type="text">
                                </div>
                            </div>
                            <div class="field">
                                <label class="label">Description</label>
                                <div class="control">
                                    <input bind:value={hOut.description} class="input is-rounded is-small" type="text">
                                </div>
                            </div>
                            <div class="field">
                                <label class="label">Sensitive</label>
                                <div class="control">
                                    <input bind:checked={hOut.sensitive} type="checkbox">
                                </div>
                            </div>
                            <div class="field">
                                <label class="label">Depends On (list)</label>
                                <div class="control">
                                    <input bind:value={hOut.depends_on} class="input is-rounded is-small" type="text">
                                </div>
                            </div>
                        {/if}
                    {/each}
                </div>
                <div class="column">
                    {#each $hclOutputs as hOut, i}
                        {#if `hout-${i}` === hOutSelected}
                            <pre>{parseOutputString(hOut)}</pre>
                        {/if}
                    {/each}
                </div>
                <div class="columns">
                    <div class="column">
                        <hr class="has-background-grey-light">
                    </div>
                </div>
            </div>
            <button on:click={() => hclOutputsModal = ""} class="modal-close is-small is-rounded" aria-label="close"></button>
        </div>
    </div>
</div>
<div class="modal {hclLocalsModal}">
        <div on:click={() => hclLocalsModal = ""} class="modal-background"></div>
        <div class="modal-content" style="width: 50%">
            <div class="box">
                <h1 class="is-size-1" style="display: inline-block">Locals</h1>
                <button class="button is-pulled-right" on:click={() => $hclLocals = $hclLocals.concat([{name: "new", value: ""}])}>
                    <span class="icon has-text-success">
                        <i class="fas fa-plus-circle"></i>
                    </span>
                </button>
                <div class="tabs is-toggle">
                    <ul id="hlocal-toggle">
                        {#each $hclLocals as hLocal, i}
                            <li id="hlocal-{i}" on:click={hLocalToggle}><a>{hLocal.name.replaceAll('"', '')}</a></li>
                        {/each}
                    </ul>
                </div>
                <div class="columns">
                    <div class="column is-one-third">
                        {#each $hclLocals as hLocal, i}
                            {#if `hlocal-${i}` === hLocalSelected}
                                <div class="field">
                                    <label class="label">
                                        Name
                                        <span class="icon has-text-danger is-pulled-right">
                                            <i class="fas fa-times-circle" aria-hidden="true" on:click={() => {$hclLocals.splice(i, 1); $hclLocals = $hclLocals}}></i>
                                        </span>
                                    </label>
                                    <div class="control">
                                        <input bind:value={hLocal.name} class="input is-rounded is-small" type="text">
                                    </div>
                                </div>
                                <div class="field">
                                    <label class="label">Value</label>
                                    <div class="control">
                                        <textarea bind:value={hLocal.value} class="input textarea is-small"></textarea>
                                    </div>
                                </div>
                            {/if}
                        {/each}
                    </div>
                    <div class="column">
                        <pre>{parseLocalsString($hclLocals)}</pre>
                    </div>
                    <div class="columns">
                        <div class="column">
                            <hr class="has-background-grey-light">
                        </div>
                    </div>
                </div>
                <button on:click={() => hclLocalsModal = ""} class="modal-close is-small is-rounded" aria-label="close"></button>
            </div>
        </div>
</div>
</div>
