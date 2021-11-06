<!-- This Source Code Form is subject to the terms of the Mozilla Public
   - License, v. 2.0. If a copy of the MPL was not distributed with this
   - file, You can obtain one at https://mozilla.org/MPL/2.0/. -->
<script>
    import { providers } from "./store";
    export let resource;

    let schemas;
    let schema;
    let blocks = {};
    let data  = resource.data();
    $: resource.data(data);

    $: {
        data = resource.data();
        schemas = {...$providers[data.tf.provider]};
        schema = schemas[data.tf.stanzaType+"_schemas"][data.tf.type].block;

        for (const attribute in schema.attributes) {
            if (schema.attributes[attribute].computed && !schema.attributes[attribute].optional) {
                delete schema.attributes[attribute]
            }
        }
        for (const block_type in schema.block_types) {
            if (block_type === "required" || block_type === "optional") {
                continue
            }
            for (const attr in schema.block_types[block_type].block.attributes) {
                if (schema.block_types[block_type].block.attributes[attr].computed && !schema.block_types[block_type].block.attributes[attr].optional) {
                    delete schema.block_types[block_type].block.attributes[attr]
                }
            }
        }
        schema.block_types["required"] = {};
        schema.block_types["optional"] = {};
        for (const block_type in schema.block_types) {
            if (block_type === "required" || block_type === "optional") {
                continue
            }
            if (schema.block_types[block_type].min_items > 0) {
                schema.block_types.required[block_type] = Object.assign({}, schema.block_types[block_type])
                // blocks[block_type] = [];
            } else {
                schema.block_types.optional[block_type] = Object.assign({}, schema.block_types[block_type])
                // blocks[block_type] = [];
            }
        }
    }
    // update config with blocks changes
    $: {
        for (const bt in blocks) {
            data.tf.config[bt] = {}
        }
    }

    function addBlock(event) {
        let parent;
        for (const p of event.path) {
            if (p.localName === "button") {
                parent = p;
            }
        }
        if (parent) {
            let bt = parent.value;
            blocks[bt] ??= []
            let l = blocks[bt].length;
            let bt_attrs = Object.keys(schema.block_types.required[bt].block.attributes);
            let bt_schema = {};
            for (const a of bt_attrs) {
                bt_schema[a] = null;
            }
            if (l < (schema.block_types[bt].max_items ? schema.block_types[bt].max_items : (schema.block_types[bt].nesting_mode === "single" ? 1 : Infinity))) {
                blocks[bt] = blocks[bt].concat([bt_schema])
            }
        }
    }
</script>

<style>
    hr {
        border-top: 1px solid black;
    }
    .dotted {
        border-top:1px dotted;
    }
    .tree-row {
        display: flex;
    }
</style>

<div class="level">
    <div class="level-left">
        <h1 class="level-item">
            {data.tf.type}
        </h1>
    </div>
    <div class="level-right ml-4">
        <div class="field level-item">
            <div class="control">
                <input bind:value={data.tf.stanza_name} class="input is-small" type="text" placeholder="name">
            </div>
        </div>
    </div>
</div>
<div>
    <hr>
    <div>
        <p class="has-text-weight-bold">Required</p><br>
    </div>
    {#each Object.keys(schema.attributes) as attribute}
        {#if schema.attributes[attribute].optional === undefined || schema.attributes[attribute].optional === false}
            {#if schema.attributes[attribute].type === "bool"}
                <div class="field">
                    <div class="control">
                        <label class="checkbox required">
                            <input bind:checked={data.tf.config[attribute]} type="checkbox">
                            {attribute}
                        </label>
                    </div>
                </div>
            {:else}
                <div class="field">
                    <div class="control">
                        <input bind:value={data.tf.config[attribute]} class="input required" type="text" placeholder={attribute}>
                    </div>
                </div>
            {/if}
        {/if}
    {/each}
    {#each Object.keys(schema.block_types.required) as block_type}
        <div class="level">
            <p class="is-italic level-left">{block_type}</p>
            <button class="button is-pulled-right level-right" on:click={addBlock} value={block_type}>
                <span class="icon has-text-success">
                    <i class="fas fa-plus-circle"></i>
                </span>
            </button>
        </div>
        {#each (blocks[block_type] ?? []) as _, i}
            <hr class="dotted">
            {#each Object.keys(schema.block_types.required[block_type].block.attributes) as attribute}
                {#if schema.block_types.required[block_type].block.attributes.type === "bool"}
                    <div class="field">
                        <div class="control">
                            <label class="checkbox required">
                                <input bind:checked={blocks[block_type][i][attribute]} type="checkbox">
                                {attribute}
                            </label>
                        </div>
                    </div>
                {:else}
                    <div class="field">
                        <div class="control">
                            <input bind:value={data.tf.config[block_type+"."+attribute]} class="input required" type="text" placeholder={attribute}>
                        </div>
                    </div>
                {/if}
            {/each}
        {/each}
    {/each}
    <hr>
    <div>
        <p class="has-text-weight-bold">Optional</p><br>
    </div>
    {#each Object.keys(schema.attributes) as attribute}
        {#if schema.attributes[attribute].optional}
            {#if schema.attributes[attribute].type === "bool"}
                <div class="field">
                    <div class="control">
                        <label class="checkbox">
                            <input bind:checked={data.tf.config[attribute]} type="checkbox">
                            {attribute}
                        </label>
                    </div>
                </div>
            {:else}
                <div class="field">
                    <div class="control">
                        <input bind:value={data.tf.config[attribute]} class="input" type="text" placeholder={attribute}>
                    </div>
                </div>
            {/if}
        {/if}
    {/each}
    {#each Object.keys(schema.block_types.optional) as block_type}
        <div class="level">
            <p class="is-italic level-left">{block_type}</p>
            <button class="button is-pulled-right level-right" on:click={addBlock} value={block_type}>
            <span class="icon has-text-success">
                <i class="fas fa-plus-circle"></i>
            </span>
            </button>
        </div>
        {#each (blocks[block_type] ?? []) as _, i}
            {#each Object.keys(schema.block_types.optional[block_type].block.attributes) as attribute}
                {#if schema.block_types.optional[block_type].block.attributes.type === "bool"}
                    <div class="field">
                        <div class="control">
                            <label class="checkbox required">
                                <input bind:checked={blocks[block_type][i][attribute]} type="checkbox">
                                {attribute}
                            </label>
                        </div>
                    </div>
                {:else}
                    <div class="field">
                        <div class="control">
                            <input bind:value={data.tf.config[block_type+"."+attribute]} class="input required" type="text" placeholder={attribute}>
                        </div>
                    </div>
                {/if}
            {/each}
        {/each}
    {/each}
</div>