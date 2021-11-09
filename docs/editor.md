# Editor
The editor has three main components: the resource selector, diagram, and node pane.

## Resource Selector
The resource selector will appear on the right-hand side of the page once the providers schema is uploaded. Each 
provider will appear as an option in the dropdown and the radio buttons select between resource and data source types.
Once both are selected a list of available resource for that provider and resource type. Double-clicking on a resource
will add a new node to the diagram.

## Diagram
The center portion of the page contains the current diagram of nodes and edges corresponding to the resources and their 
relationships. This area can be used to reposition the nodes and has the ability to pan and zoom. Clicking a node will
open the node pane where the attributes of the node can be modified.

## Node Pane
While a node on the diagram is selected (highlighted in blue) the node pane will open on the left-hand side of the page.
This pane can be used to set each of the attributes and blocks associated with the resource or data source. The 
uppermost input is the name of the resource and will be reflected in the label of the node in the diagram. To the right
of this input is a button with a times-circle icon that, when clicked, will delete the resource from the graph.

The names of the attributes will appear as placeholders within text box inputs or labels to checkboxes for boolean 
values. If the resource accepts configuration blocks then the name of each block type will appear along with a button 
and green plus icon. Pushing the icon will add a textarea input for that block type. The user will need to enter the 
properly formatted HCL configuration for the block. Future versions of the app will provide independent inputs for the 
attributes of the block. Some resources accept multiple of the same kind of block. Pressing the button will add 
additional textarea inputs. If the schema specifies a maximum number of these configuration blocks, then no additional 
textarea will be added.

As resources are configured throughout the diagram there will likely be need to make references between resources. 
These relationships are specified by referencing the type and name of a resource, prepended by a dollar-sign (`$`); 
e.g. `$aws_lb.front_end`. Like a Terraform configuration the user can specify attributes of the resource by adding 
additional segments separated by a period (`.`); e.g. `$aws_lb.front_end.arn`. However, only the type and name of the 
resource are required to create an edge between the two nodes.