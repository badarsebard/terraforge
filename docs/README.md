# Terraforge

Terraform is a tool for managing infrastructure and APIs in a codified manner utilizing a combination of a command-line
application, a series of vendor specific plugins, and a declarative configuration language written in HCL. The 
configuration uses a flat file structure with layers of abstraction attained through local and remote modules. Writing 
Terraform configurations creates many complex relationships between resources. This is because the definition of a 
resource may rely on attributes of other resources. 

The Terraform application generates a Directed Acyclic Graph (DAG) based on the configuration which establishes the 
correct order of resource manipulation. There are several tools that allow users to input configuration files then 
output and visualize the DAG. However, Terraforge allows a user to create a DAG through a GUI and then generate the 
HCL configuration that corresponds to this graph. This allows users to visually diagram their architecture and establish
and view the relationships between the resources before having to write any HCL. The graph can then be exported as a 
single HCL Terraform configuration file.

## Get started
### Running the App
Install the dependencies...

```bash
cd terraforge
npm install
```

...then start [Rollup](https://rollupjs.org):

```bash
npm run dev
```

Navigate to [localhost:5000](http://localhost:5000). You should see the app running.

### Using the App
To get started right away you can download the [providers schema](https://raw.githubusercontent.com/badarsebard/terraforge/main/contrib/core_providers.json) for the core Terraform providers from the contrib
directory of the project. 
- Upload this file using the `Upload providers schema` button in the app. 
- Select a provider from the dropdown and choose either resource or data source radio buttons. 
- Once the file is uploaded and the inputs selected you will see a list of resources on the right-hand side of the page. 
- Double-click an entry to add a node of that type to the graph in the center of the page. 
- Zoom using mouse scrolling and pan by click, hold, and dragging the mouse. 
- Click a node to open a pane on the left-hand side of the window where the name and attributes of the node can be 
modified. 
- References between nodes can be made by entering `$type.name.attributes` in the attribute; e.g.`$aws_lb.front_end.arn`.
- After creating and editing some resources, export the Terraform configuration by clicking `Export HCL` in the navbar.

## Documentation
Learn about the [Providers Schema](providers_schema.md) and how to manage different kinds of resources from different 
providers.

See all the details about the [Editor](editor.md) and its components.

Save and load work using [Design](design.md) import and export.

Turn your graph into a [Terraform Config](hcl.md) by exporting HCL.

# License
The majority of this project is licensed under the [Mozilla Public License, v. 2.0](https://mozilla.org/MPL/2.0/). The
`contrib/` directory and its contents are licensed under the [MIT](https://www.mit.edu/~amini/LICENSE.md) license. Any
file which does not contain the MPL license header is still covered by the MPL if it is located in a directory 
containing a `LICENSE` with the header.