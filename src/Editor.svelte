<!-- This Source Code Form is subject to the terms of the Mozilla Public
   - License, v. 2.0. If a copy of the MPL was not distributed with this
   - file, You can obtain one at https://mozilla.org/MPL/2.0/. -->

<script>
    import { cy, providerSchemas, resources, editorOn, editNode } from "./store";

    let schemas;
    let schema;
    let requiredCount = 0;
    let optionalCount = 0;
    let data  = $editNode.data();
    $: $editNode.data(data);

    $: {
        data = $editNode.data();
        schemas = {...$providerSchemas[data.tf.provider]};
        let schemaKey;
        if (data.tf.stanzaType === "resource") {
            schemaKey = "resource_schemas";
        } else if (data.tf.stanzaType === "data_source") {
            schemaKey = "data_source_schemas";
        } else if (data.tf.stanzaType === "provider") {
            schemaKey = "provider"
        }
        if (schemaKey === 'provider') {
            schema = schemas[schemaKey].block;
        } else {
            schema = schemas[schemaKey][data.tf.type].block;
        }
        for (const attribute in schema.attributes) {
            if (schema.attributes[attribute].computed && !schema.attributes[attribute].optional) {
                delete schema.attributes[attribute]
            }
        }

        schema.attributes ??= {};
        schema.attributes["required"] = {};
        schema.attributes["optional"] = {};
        for (const attr in schema.attributes) {
            if (attr === "required" || attr === "optional") {
                continue
            }
            if (schema.attributes[attr].optional) {
                schema.attributes.optional[attr] = schema.attributes[attr];
                optionalCount++
            } else {
                schema.attributes.required[attr] = schema.attributes[attr];
                requiredCount++
            }
        }
        schema.block_types ??= {};
        schema.block_types["required"] = {};
        schema.block_types["optional"] = {};
        for (const block_type in schema.block_types) {
            if (block_type === "required" || block_type === "optional") {
                continue
            }
            if (schema.block_types[block_type].min_items > 0) {
                schema.block_types.required[block_type] = Object.assign({}, schema.block_types[block_type])
                requiredCount++
            } else {
                schema.block_types.optional[block_type] = Object.assign({}, schema.block_types[block_type])
                optionalCount++
            }
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
            let blocks = data.tf.config.blocks;
            let bt = parent.value;
            blocks[bt] ??= []
            let l = blocks[bt].length;

            const nm = schema.block_types[bt].nesting_mode;
            if (nm === "single") {
                if (l < 1) {
                    blocks[bt] = blocks[bt].concat([""])
                }
            } else if (nm === "list" || nm === "set") {
                schema.block_types[bt].max_items ??= Infinity
                if (l < schema.block_types[bt].max_items) {
                    blocks[bt] = blocks[bt].concat([""])
                }
            } else if (nm === "map") {
                // this is basically never used from what I can tell so it can be left until later to figure out
            }
        }
    }

    function deleteResource() {
        for (let i = 0; i < $resources.length; i++) {
            if ($editNode === $resources[i]) {
                $resources.splice(i, 1);
                $cy.remove(`#${$editNode.id()}`);
                editorOn.set(false);
                break;
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
    textarea {
        font-family: SFMono-Regular,Consolas,"Liberation Mono",Menlo,Courier,monospace;
    }
    input::placeholder {
        text-align: right;
    }
</style>

<div class="level-left">
    <h1 class="level-item m-1">
        {data.tf.type}
    </h1>
    {#if data.type !== 'provider'}
        <div class="field level-item m-1">
            <div class="control">
                <input bind:value={data.tf.stanzaName} class="input is-small is-rounded" type="text" placeholder="name">
            </div>
        </div>
        <div class="level-item">
            <button class="button is-pulled-right level-right is-small" on:click={deleteResource}>
                    <span class="icon has-text-danger">
                        <i class="fas fa-times-circle"></i>
                    </span>
            </button>
        </div>
    {/if}
</div>
<div>
    <hr>
    {#if requiredCount > 0}
        <div>
            <p class="has-text-weight-bold">Required</p><br>
        </div>
        {#each Object.keys(schema.attributes.required) as attribute}
            {#if schema.attributes.required[attribute].type === "bool"}
                <div class="field">
                    <div class="control">
                        <label class="checkbox required">
                            <input bind:checked={data.tf.config.attributes[attribute]} type="checkbox">
                            {attribute}
                        </label>
                    </div>
                </div>
            {:else}
                <div class="field">
                    <label class="label">{attribute}</label>
                    <div class="control">
                        <input bind:value={data.tf.config.attributes[attribute]} class="input required is-rounded" type="text">
                    </div>
                </div>
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
            {#each (data.tf.config.blocks[block_type] ?? []) as _, i}
                <hr class="dotted">
                <div class="field">
                    <div class="control">
                        <textarea bind:value={data.tf.config.blocks[block_type][i]} class="textarea required is-rounded"></textarea>
                    </div>
                </div>
            {/each}
        {/each}
        <hr>
    {/if}
    {#if optionalCount > 0}
        <div>
            <p class="has-text-weight-bold">Optional</p><br>
        </div>
        {#each Object.keys(schema.attributes.optional) as attribute}
            {#if schema.attributes[attribute].type === "bool"}
                <div class="field">
                    <div class="control">
                        <label class="checkbox">
                            <input bind:checked={data.tf.config.attributes[attribute]} type="checkbox">
                            {attribute}
                        </label>
                    </div>
                </div>
            {:else}
                <div class="field">
                    <label class="label">{attribute}</label>
                    <div class="control">
                        <input bind:value={data.tf.config.attributes[attribute]} class="input is-rounded" type="text">
                    </div>
                </div>
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
            {#each (data.tf.config.blocks[block_type] ?? []) as _, i}
                <div class="field">
                    <div class="control">
                        <textarea bind:value={data.tf.config.blocks[block_type][i]} class="textarea is-rounded"></textarea>
                    </div>
                </div>
            {/each}
        {/each}
    {/if}
</div>
