/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { writable } from 'svelte/store';
import {tfSchema} from "./tfSchema";
export let resources = writable([]);
export let providerSchemas = writable({
    terraform: {
        provider: {
            block: tfSchema
        }
    }
});
export let unsaved = writable(false);
export let editNode = writable();
export let editorOn = writable(false);
export let cy = writable();