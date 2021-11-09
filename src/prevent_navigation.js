import { writable, get } from "svelte/store";

export default function (eventName = "input", message = "Changes you made may not be saved. Are you sure?") {
    const unsaved = writable(false);
    // the action
    function action(node, params) {
        function markUnsaved(e) {
            unsaved.set(true);
        }
        function checkNavigation(e) {
            if (get(unsaved)) {
                if (!confirm(message)) {
                    e.preventDefault();
                    if (e.type === "beforeunload") {
                        e.returnValue = "";
                    }
                }
            }
        }
        for (let a of document.querySelectorAll("a[href]")) {
            a.addEventListener("click", checkNavigation);
        }
        window.addEventListener("beforeunload", checkNavigation);
        node.addEventListener(eventName, markUnsaved);
        return {
            destory() {
                node.removeEventListener("input", markUnsaved);
                for (let a of document.querySelectorAll("a[href]")) {
                    a.removeEventListener("click", checkNavigation);
                }
                window.removeEventListener("beforeunload", checkNavigation);
            },
        };
    }
    return { unsaved, action };
}