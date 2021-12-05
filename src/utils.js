/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import {resources, unsaved, editorOn, editNode, cy, providerSchemas, hclVariables, hclOutputs, hclLocals} from "./store";
import cytoscape from "cytoscape";
import panzoom from 'cytoscape-panzoom';
import {options} from "./klay";

function pushMatches(matches, nodeIdMap, node, edgeIds, edges) {
    for (const match of matches) {
        let source = nodeIdMap[match[1]];
        if (source) {
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
}

export async function computeEdges(r) {
    let edges = [];
    let edgeIds = [];
    let nodeIdMap = {};
    const regexp = /\$((?:data.\w+|\w+)\.\w+)/gm;
    for (const node of r) {
        let data = node.data();
        if (data.type === "provider") {
            continue
        }
        let dataPrefix = data.tf.stanzaType === "resource" ? "" : "data."
        if (data) {
            nodeIdMap[`${dataPrefix}${data.tf.type}.${data.tf.stanzaName}`] = node.id();
        }
    }
    for (const node of r) {
        let data = node.data();
        if (data.type === "provider") {
            continue
        }
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
    let cyObj;
    cy.subscribe(value => cyObj = value);
    cyObj.remove("edge");
    cyObj.add(edges);
}

export function saveDesign() {
    let cyObj;
    cy.subscribe(value => cyObj = value);
    let data = JSON.stringify(cyObj.json());
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
    unsaved.set(false);
}

export function startCy() {
    // the default values of each option are outlined below:
    let defaults = {
        zoomFactor: 0.05, // zoom factor per zoom tick
        zoomDelay: 45, // how many ms between zoom ticks
        minZoom: 0.1, // min zoom level
        maxZoom: 10, // max zoom level
        fitPadding: 50, // padding when fitting
        panSpeed: 10, // how many ms in between pan ticks
        panDistance: 10, // max pan distance per tick
        panDragAreaSize: 75, // the length of the pan drag box in which the vector for panning is calculated (bigger = finer control of pan speed and direction)
        panMinPercentSpeed: 0.25, // the slowest speed we can pan by (as a percent of panSpeed)
        panInactiveArea: 8, // radius of inactive area in pan drag box
        panIndicatorMinOpacity: 0.5, // min opacity of pan indicator (the draggable nib); scales from this to 1.0
        zoomOnly: false, // a minimal version of the ui only with zooming (useful on systems with bad mousewheel resolution)
        fitSelector: undefined, // selector of elements to fit
        animateOnFit: function(){ // whether to animate on fit
            return false;
        },
        fitAnimationDuration: 1000, // duration of animation on fit

        // icon class names
        sliderHandleIcon: 'fa fa-minus',
        zoomInIcon: 'fa fa-plus',
        zoomOutIcon: 'fa fa-minus',
        resetIcon: 'fa fa-expand'
    };
    panzoom( cytoscape );
    let cyto = cytoscape({
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
                selector: 'node[type = "provider"]',
                style: {
                    'display': 'none'
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
    cyto.panzoom( defaults );
    cyto.on('tap', 'node', function (evt) {
        editNode.set(evt.target);
        editorOn.set(true);
        let res;
        resources.subscribe(value => res = value)
        computeEdges(res, cyto);
    });
    cyto.on('data', 'node', function () {
        let res;
        resources.subscribe(value => res = value)
        computeEdges(res, cyto);
    });
    cyto.on('tap', function (event) {
        let evtTarget = event.target;
        if (evtTarget === cyto) {
            editorOn.set(false);
            editNode.set(null);
        }
    });
    return cyto
}

export function createResource(r) {
    // {
    //     type: stanzaType,
    //     tf: {
    //         provider: providerName,
    //             stanzaType: stanzaType,
    //             type: resourceType,
    //             config: {
    //             attributes: {},
    //             blocks: {}
    //         },
    //         stanzaName: ""
    //     }
    // }
    let cyObj;
    cy.subscribe(value => cyObj = value);
    if (r.type === 'provider') {
        r['id'] = r.tf.provider;
    }
    let n = cyObj.add({
        group: "nodes",
        data: r,
    });
    resources.update(r => [...r, n[0]]);
    cyObj.layout(options).run();
}

const attributePattern = /(?<block>(?<blockName>\w+) (?<blockConfig>{[\s\S]+?^ {2}}))|(?<attribute>(?<attributeName>\w+)\s+=\s+(?<attributeValue>{[\s\S]+?}|[\S ]+))/gm;
export function createTerraformBlockResource(r) {
    let schemas;
    providerSchemas.subscribe(value => schemas = value);
    let rr = {
        type: 'provider',
        tf: {
            provider: "terraform",
            stanzaType: "provider",
            type: "terraform",
            config: {
                attributes: {},
                blocks: {}
            },
            stanzaName: ""
        }
    }
    const attr = [...r.groups.stanzaConfig.matchAll(attributePattern)]
    for (const a of attr) {
        if (a.groups.block) {
            let aSchema = schemas.terraform.provider.block.block_types[a.groups.blockName];
            let nm = aSchema.nesting_mode;
            if (nm === "single") {
                rr.tf.config.blocks[a.groups.blockName] = [a.groups.blockConfig];
            } else if (nm === 'list' || nm === 'set') {
                rr.tf.config.blocks[a.groups.blockName] ??= [];
                if (rr.tf.config.blocks[a.groups.blockName].length < aSchema.max_items) {
                    rr.tf.config.blocks[a.groups.blockName] = rr.tf.config.blocks[a.groups.blockName].concat([a.groups.blockConfig]);
                }
            }
        } else {
            rr.tf.config.attributes[a.groups.attributeName] = a.groups.attributeValue;
        }
    }
    createResource(rr);
}
export function createProviderBlockResource(r, hclProviderMap) {
    let schemas;
    providerSchemas.subscribe(value => schemas = value);
    let provider = r.groups.resourceType.replaceAll('"', "")
    let fullprovider = hclProviderMap[provider];
    let rr = {
        type: 'provider',
        tf: {
            provider: fullprovider,
            stanzaType: "provider",
            type: fullprovider,
            config: {
                attributes: {},
                blocks: {}
            },
            stanzaName: ""
        }
    }
    const attr = [...r.groups.stanzaConfig.matchAll(attributePattern)]
    for (const a of attr) {
        if (a.groups.block) {
            let aSchema = schemas[fullprovider].provider.block.block_types[a.groups.blockName];
            let nm = aSchema.nesting_mode
            if (nm === "single") {
                rr.tf.config.blocks[a.groups.blockName] = [a.groups.blockConfig]
            } else if (nm === 'list' || nm === 'set') {
                rr.tf.config.blocks[a.groups.blockName] ??= [];
                if (rr.tf.config.blocks[a.groups.blockName].length < aSchema.max_items) {
                    rr.tf.config.blocks[a.groups.blockName] = rr.tf.config.blocks[a.groups.blockName].concat([a.groups.blockConfig]);
                }
            }
        } else {
            rr.tf.config.attributes[a.groups.attributeName] = a.groups.attributeValue;
        }
    }
    createResource(rr);
}
export function createVariableResource(r) {
    const attr = [...r.groups.stanzaConfig.matchAll(attributePattern)]
    let v = {name: r.groups.resourceType, default: "", type: "", description: "", validation: "", sensitive: false}
    for (const a of attr) {
        if (a.groups.block) {
            if (a.groups.blockName === "validation") {
                v.validation = a.groups.blockConfig
            }
        } else {
            v[a.groups.attributeName] = a.groups.attributeValue;
        }
    }
    hclVariables.update(r => [...r, v]);
}
export function createOutputResource(r) {
    const attr = [...r.groups.stanzaConfig.matchAll(attributePattern)]
    // {name: "", value: "", description: "", sensitive: false, depends_on: ""}
    let o = {name: r.groups.resourceType, value: "", description: "", sensitive: false, depends_on: ""}
    for (const a of attr) {
        o[a.groups.attributeName] = a.groups.attributeValue;
    }
    hclOutputs.update(r => [...r, o]);
}

export function addLocalResource(r) {
    const attr = [...r.groups.stanzaConfig.matchAll(attributePattern)]
    for (const a of attr) {
        hclLocals.update(r => [...r, {name: a.groups.attributeName, value: a.groups.attributeValue}]);
    }
}

export function createResourceOrDataBlockResource(r, hclProviderMap) {
    let schemas;
    providerSchemas.subscribe(value => schemas = value);
    let provider = r.groups.resourceType.split("_")[0].replaceAll('"', "")
    let fullprovider = hclProviderMap[provider];
    let blockType = r.groups.blockType === "resource" ? "resource" : "data_source";
    let resourceType = r.groups.resourceType.replaceAll('"', "");
    let stanzaName = r.groups.stanzaName.replaceAll('"', "");
    let rr = {
        type: blockType,
        tf: {
            provider: fullprovider,
            stanzaType: blockType,
            type: resourceType,
            config: {
                attributes: {},
                blocks: {}
            },
            stanzaName: stanzaName
        }
    }
    const attr = [...r.groups.stanzaConfig.matchAll(attributePattern)]
    let schemaName = blockType === "resource" ? "resource_schemas" : "data_source_schemas";
    for (const a of attr) {
        if (a.groups.block) {
            let blockName = a.groups.blockName;
            let blockConfig = a.groups.blockConfig
            let aSchema = schemas[fullprovider][schemaName][resourceType].block.block_types[blockName];
            let nm = aSchema.nesting_mode
            if (nm === "single") {
                rr.tf.config.blocks[blockName] = [blockConfig]
            } else if (nm === 'list' || nm === 'set') {
                rr.tf.config.blocks[blockName] ??= [];
                if (rr.tf.config.blocks[blockName].length < aSchema.max_items) {
                    rr.tf.config.blocks[blockName] = rr.tf.config.blocks[blockName].concat([blockConfig]);
                }
            }
        } else {
            rr.tf.config.attributes[a.groups.attributeName] = a.groups.attributeValue;
        }
    }
    createResource(rr);
}

export function tfName(ele) {
    let data = ele.data();
    let type = data.tf.type;
    let stanzaType = data.tf.stanzaType;
    let stanzaName = data.tf.stanzaName;
    if (stanzaName === "") {
        return stanzaType === "resource" ? type : `data.${type}`
    } else {
        return stanzaType === "resource" ? `${type}.${stanzaName}` : `data.${type}.${stanzaName}`
    }
}