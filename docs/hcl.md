# HCL

## Export
The primary purpose of Terraforge is to provide a visual way to create Terraform configurations. This is accomplished
through the `Export HCL` menu item in the navbar. This will take the existing diagram and all associated configuration 
data entered through the node pane will be converted to HCL and downloaded by the browser. Please note that currently
the HCL spacing is not properly formatted. The user can run `terraform fmt` to reformat the spacing of the file. The
exported configuration will also contain all variables, outputs, and locals defined through the app.

## Import
Terraforge supports existing Terraform projects by importing a single `.tf` file and generating the graph representing 
those resources. This is still an experimental feature. There are several known limitations to the capability including:
no meta-argument support, poor interpolation interpretation, no module support, lack of functions, or dynamic blocks.
Many of these features are forthcoming and in development and described in detail in the [roadmap](roadmap.md).