import { tfName } from "./utils";
import { resources, cy } from "./store";

export function parseDesignFile(f) {
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
        let cyObj;
        cy.subscribe(value => {cyObj = value});
        cyObj.json(data);
        for (const node of data.elements.nodes) {
            let n = cyObj.$id(node.data.id)
            resources.update(r => [...r, n]);
        }
    }

    fr.readAsText(f.item(0));
}