# HCL
The primary purpose of Terraforge is to provide a visual way to create Terraform configurations. This is accomplished
through the `Export HCL` menu item in the navbar. This will take the existing diagram and all associated configuration 
data entered through the node pane will be converted to HCL and downloaded by the browser. Please note that currently
the HCL spacing is not properly formatted. The user can run `terraform fmt` to reformat the spacing of the file.