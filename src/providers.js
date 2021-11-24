/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { providers } from "./store";

export async function getProviders(providerChoices) {
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
}
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
export function parseProviderSchema(data) {
    for (const pr in data.provider_schemas) {
        let p = pr.replace("registry.terraform.io/", "");
        providers.update(n => {
            let x = {...n};
            x[p] = {
                resource_schemas: data.provider_schemas[pr].resource_schemas,
                data_source_schemas: data.provider_schemas[pr].data_source_schemas
            };
            return x
        });
    }
}

export async function setProviders(s, sp, pc) {
    providers.update(() => {return {}});
    s = undefined;
    // create json frame
    let data = {
        format_version: "0.2",
        provider_schemas: {}
    }
    // iterate through selected providers
    for (const p of sp) {
        // grab the schema from github
        let pChoice = pc[p]
        let schema = await fetch(`https://raw.githubusercontent.com/badarsebard/terraform-schemas/main/schemas/${pChoice.type}/${pChoice.gitname}.json`).then(r => r.json())
        // attach to frame
        data.provider_schemas[`registry.terraform.io/${pChoice.fullname}`] = schema.provider_schemas[`registry.terraform.io/${pChoice.fullname}`];
    }
    parseProviderSchema(data);
}
