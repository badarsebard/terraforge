/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import {resources, unsaved, editorOn, editNode, cy} from "./store";
import cytoscape from "cytoscape";
import {options} from "./klay";

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

export async function computeEdges(r) {
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
    //     tf: {
    //         provider: providerName,
    //             stanzaType: stanzaType,
    //             type: resourceType,
    //             config: {
    //             attributes: {},
    //             blocks: {}
    //         },
    //         stanza_name: ""
    //     }
    // }
    let cyObj;
    cy.subscribe(value => cyObj = value);
    let n = cyObj.add({
        group: "nodes",
        data: r,
    });
    resources.update(r => [...r, n[0]]);
    cyObj.layout(options).run();
}

export function tfName(ele) {
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