export const tfSchema = {
    attributes: {
        required_version: {
            type: "string",
            description_kind: "plain",
            optional: true
        },
        experiments: {
            type: [
                "list",
                "string"
            ],
            description_kind: "plain",
            optional: true
        }
    },
    block_types: {
        backend: {
            nesting_mode: "single",
            block: {
                max_items: 1
            }
        },
        required_providers: {
            nesting_mode: "single",
            block: {
                max_items: 1
            }
        }
    }
}