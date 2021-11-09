# Providers Schema
Terraforge relies on the same schema used by Terraform when executing the provider plugins. In effect, this schema 
provides all the options for resources and data sources available for creation. 

## Create
The schema is a JSON file that can be generated directly by Terraform. 

Terraform requires the presence of a Terraform `.tf` file which contains the required providers. Ensure all providers
that are needed in Terraforge are listed together.
```terraform
terraform {
  required_providers {
    aws = {
      source = "hashicorp/aws"
      version = "3.63.0"
    }
    kubernetes = {
      source = "hashicorp/kubernetes"
      version = "2.6.1"
    }
  }
}
```
Within the `contrib/` section of the Terraforge project there is a pre-built schema `core_providers.json` which contains
the following providers: AWS, Azure, Google Cloud Platform, Kubernetes, and Oracle Cloud Infrastructure.

Once the Terraform configuration is in place the schema can be generated using the command:
```bash
terraform providers schema -json
```

This schema is then uploaded to Terraforge using the `Upload providers schema` button. The schema file can be changed 
while working by clicking the navbar button of the same name and choosing a new schema file. This will not impact the 
working area.