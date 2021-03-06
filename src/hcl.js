import {
    computeEdges,
    createProviderBlockResource,
    createResourceOrDataBlockResource,
    createTerraformBlockResource,
    createVariableResource,
    createOutputResource,
    addLocalResource
} from "./utils";
import {resources, cy, hclVariables, hclOutputs, hclLocals} from "./store";

export function exportHCL() {
    let hcl = '';
    let res;
    let vars;
    let outs;
    let locals;
    resources.subscribe(value => res = value);
    hclVariables.subscribe(value => vars = value);
    hclOutputs.subscribe(value => outs = value);
    hclLocals.subscribe(value => locals = value);
    for (const r of res) {
        let data = r.data()
        let stanzaType;
        let stanzaName = "";
        let type;
        if (data.tf.stanzaType === "resource") {
            stanzaType = "resource";
            stanzaName = ' "'+data.tf.stanzaName+'"';
            type = ' "'+data.tf.type+'"';
        } else if (data.tf.stanzaType === "data_source") {
            stanzaType = "data_source";
            stanzaName = ' "'+data.tf.stanzaName+'"';
            type = ' "'+data.tf.type+'"';
        } else if (data.tf.stanzaType === "provider") {
            stanzaType = "provider";
            type = data.tf.type
            if (type === "terraform") {
                stanzaType = "terraform"
                type = ""
            } else {
                type = ' "'+type.split("/")[1]+'"';
            }
        }
        hcl +=
            `${stanzaType.replace("_source", "")}${type}${stanzaName} {${Object.keys(data.tf.config.attributes).map((key) => {
                if (typeof data.tf.config.attributes[key] === "string") {
                    if (data.tf.config.attributes[key].startsWith("$")) {
                        return `
  ${key} = ${data.tf.config.attributes[key].slice(1)}`
                    } else {
                        return `
  ${key} = ${data.tf.config.attributes[key]}`
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
    for (const v of vars) {
        // {name: "", default: "", type: "", description: "", validation: "", sensitive: false}
        let out = {...v};
        delete out.name;
        hcl += `
variable ${v.name} {
`
        for (const a in out) {
            if (out[a]) {
                hcl += `  ${a} = ${out[a]}
`
            }
        }
        hcl += `}`
    }
    for (const o of outs) {
        // {name: "", value: "", description: "", sensitive: false, depends_on: ""}
        let out = {...o};
        delete out.name;
        hcl += `
output ${o.name} {
`
        for (const a in out) {
            if (out[a]) {
                hcl += `  ${a} = ${out[a]}
`
            }
        }
        hcl += `}`
    }
    // locals
    hcl += `
locals {
`
    for (const l of locals) {
        if (l.value) {
            hcl += `  ${l.name} = ${l.value}
`
        }
    }
    hcl += `}`
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

const resourcePattern = /(?<blockType>locals|output|variable|data|resource|provider|terraform)\s*(?<resourceType>"\w+")?\s*(?<stanzaName>"\w+")?\s*(?<stanzaConfig>{}|{[\s\S]*?^})/gm;
const providerPattern = /(?<name>\w+)\s+=\s+{[\s\S]+?source\s+=\s+"(?<fullname>\w+\/\w+)"[\s\S]+?}/gm;
const linkPattern     = /[^"]\b(\w+(?:\.\w+)+)\b(?:[^"]|$)/gm;
export function importHCL(f) {
    if (!f) {
        return
    }
    let fr = new FileReader();

    fr.onload = function (e) {
        let config = e.target.result;
        let hclProviderMap = {};
        const pro = [...config.matchAll(providerPattern)];
        for (const p of pro) {
            hclProviderMap[p.groups.name] = p.groups.fullname;
        }
        let res = [...config.matchAll(resourcePattern)];
        // find all interconnections between stanzas
        for (let i = 0; i < res.length; i++) {
            let links = [...res[i].groups.stanzaConfig.matchAll(linkPattern)];
            let linkMatches = [];
            for (let i = 0; i < links.length; i++) {
                if (linkMatches.includes(links[i][1])) {
                    links.splice(i, 1);
                    i--;
                } else {
                    linkMatches.push(links[i][1])
                }
            }
            for (const l of links) {
                let linkPieces = l[1].split(".");
                if (linkPieces[0] !== "data") {
                    linkPieces.splice(0, 0, "resource")
                }
                let setLink = false;
                for (const r of res) {
                    if (r.groups.blockType === "terraform" || r.groups.blockType === "provider") {
                        continue
                    }
                    if (linkPieces[0] === r.groups.blockType.replaceAll('"', "") &&
                        linkPieces[1] === r.groups.resourceType.replaceAll('"', "") &&
                        linkPieces[2] === r.groups.stanzaName.replaceAll('"', "")) {
                        setLink = true;
                    }
                }
                if (setLink) {
                    res[i].groups.stanzaConfig = res[i].groups.stanzaConfig.replaceAll(l[1], `$${l[1]}`);
                }
            }
        }
        // create resource objects from stanzas
        for (const r of res) {
            let bt = r.groups.blockType;
            if (bt === "terraform") {
                createTerraformBlockResource(r);
            } else if (bt === "provider") {
                createProviderBlockResource(r, hclProviderMap);
            } else if (bt === "resource" || bt === "data") {
                createResourceOrDataBlockResource(r, hclProviderMap);
            } else if (bt === "variable") {
                createVariableResource(r);
            } else if (bt === "output") {
                createOutputResource(r);
            } else if (bt === "locals") {
                addLocalResource(r);
            }
        }
        let cyto;
        cy.subscribe(value => cyto = value);
        resources.subscribe(value => res = value);
        computeEdges(res, cyto);
    }

    fr.readAsText(f.item(0));
}