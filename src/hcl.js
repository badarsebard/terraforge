import { createResource } from "./utils";
import { resources, providers } from "./store";

export function exportHCL() {
    let hcl = ''
    let res;
    resources.subscribe(value => res = value);
    for (const r of res) {
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

const resourcePattern = /(?<blockType>data|resource)\s+"(?<resourceType>\w+)"\s+"(?<stanzaName>\w+)"\s+(?<stanzaConfig>{}|{[\s\S]*?^})/gm;
const attributePattern = /(?<block>(?<blockName>\w+) (?<blockConfig>{[\s\S]+?^ {2}}))|(?<attribute>(?<attributeName>\w+)\s+=\s+(?<attributeValue>[\S]+))/gm;
const providerPattern = /(?<name>\w+)\s+=\s+{[\s\S]+?source\s+=\s+"(?<fullname>\w+\/\w+)"[\s\S]+?}/gm;
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
        const res = [...config.matchAll(resourcePattern)];
        for (const r of res) {
            let provider = r.groups.resourceType.split("_")[0];
            let fullprovider = hclProviderMap[provider];
            let schemas;
            providers.subscribe(value => schemas = value);
            let stanzaType = r.groups.blockType === "resource" ? "resource" : "data_source";
            let rr = {
                tf: {
                    provider: fullprovider,
                    stanzaType: stanzaType,
                    type: r.groups.resourceType,
                    config: {
                        attributes: {},
                        blocks: {}
                    },
                    stanza_name: r.groups.stanzaName
                }
            }
            const attr = [...r.groups.stanzaConfig.matchAll(attributePattern)]
            for (const a of attr) {
                if (a.groups.block) {
                    let aSchema = schemas[fullprovider][stanzaType+"_schemas"][r.groups.resourceType].block.block_types[a.groups.blockName];
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
    }

    fr.readAsText(f.item(0));
}