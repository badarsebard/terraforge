<!-- This Source Code Form is subject to the terms of the Mozilla Public
   - License, v. 2.0. If a copy of the MPL was not distributed with this
   - file, You can obtain one at https://mozilla.org/MPL/2.0/. -->

<script>
    import Editor from "./Editor.svelte";
    import { providers, resources, editorOn, cy } from "./store";
    import { onDestroy } from 'svelte';

    import cytoscape from 'cytoscape';
    import klay from 'cytoscape-klay';
    import { options } from "./klay";
    import { getProviders, parseProviderSchema, setProviders } from "./providers";
    import { exportHCL, importHCL } from "./hcl";
    import { parseDesignFile } from "./design";
    import { startCy, saveDesign, createResource } from "./utils";

    import unsavedInputPreventNavigation from "./prevent_navigation";
    const { action } = unsavedInputPreventNavigation();

    let providerChoices = {};
    let selectedProviders = [];
    let design;
    let files;
    let hclConfig;
    let filter = "";
    let pfilter = "";
    let ptypes = [];
    let selected;
    let stanzaType
    let wizard = "";
    let cyStarted = false;
    let unsubscribe;

    cytoscape.use(klay);
    getProviders(providerChoices);

    // can definitely redo this and maybe consolidate between the upload and wizard
    $: ((files) => {
        if (!files) {
            return
        }
        let fr = new FileReader();

        fr.onload = function (e) {
            $providers = {};
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

    function createResourceWrapper(event) {
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
        createResource(r);
    }

    document.addEventListener('DOMContentLoaded', () => {
        if (!cyStarted) {
            $cy = startCy();
            cyStarted = true;
            $cy.layout(options).run();
            unsubscribe = resources.subscribe(value => {
                $cy.layout(options).run();
            });
        }
    });

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
                    <a class="navbar-item" on:click={() => wizard="is-active"}>
                        Wizard
                    </a>
                    <a class="navbar-item" on:click={() => document.getElementById("provider-input").click()}>
                        Upload Manually
                    </a>
                </div>
            </div>
            <div class="navbar-item has-dropdown is-hoverable">
                <a class="navbar-link">
                    Design
                </a>
                <div class="navbar-dropdown">
                    <a class="navbar-item" on:click={() => document.getElementById("design-input").click()}>
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
                    <a class="navbar-item" on:click={() => document.getElementById("hcl-input").click()}>
                        Import
                    </a>
                    <a class="navbar-item" on:click={exportHCL}>
                        Export
                    </a>
                </div>
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
                    {#if (selected && stanzaType && $providers[selected][stanzaType+"_schemas"])}
                        {#each Object.keys($providers[selected][stanzaType+"_schemas"]) as rt}
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
<input id="design-input"   type="file" style="display: none;" bind:files={design} />
<input id="provider-input" type="file" style="display: none;" bind:files>
<input id="hcl-input" type="file" style="display: none;" bind:files={hclConfig}>
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
                        <button class="button is-primary" on:click={setProvidersWrapper}>Submit</button>
                    </div>
                </div>
            </div>
        </div>
    </div>
    <button on:click={() => wizard = ""} class="modal-close is-large" aria-label="close"></button>
</div>