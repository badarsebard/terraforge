# Providers
Terraforge relies on the same schema used by Terraform when executing the provider plugins. In effect, this schema 
provides all the options for resources and data sources available for creation. Terraforge has two ways to provide the
schema: the wizard and direct upload.

## Wizard
The providers wizard is a modal that allows the user to select the providers they'd like to use and automatically 
generate the needed schema for the app. Providers come it in three tiers: official, partner, and community. The official
providers are written and maintained by Hashicorp. Partner providers are owned and maintained by third-party 
technology partners. Providers in this tier indicate HashiCorp has verified the authenticity of the Provider’s 
publisher, and that the partner is a member of the 
[HashiCorp Technology Partner Program](https://www.hashicorp.com/ecosystem/become-a-partner/). Community providers are 
published to the Terraform Registry by individual maintainers, groups of maintainers, or other members of the Terraform 
community. 

The modal has controls at the top that allow the user to filter the available provider options by their tier and name.
Select the desired providers by marking the checkboxes and clicking the submit button at the bottom of the modal. 

## Direct Upload
The wizard provides a quick user-friendly way to start working in Terraforge, but it lacks the ability to target 
specific versions of different providers. Additionally, it only has access to providers hosted on 
[registry.terraform.io](https://registry.terraform.io). In order to use custom providers or specific versions of a
provider the user should generate the schema and upload it to Terraforge.

### Creating the Schema
Create Terraform file `main.tf` file which contains the required providers. Ensure all providers
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

Once the Terraform configuration is in place the schema can be generated using the command:
```bash
terraform providers schema -json > providers.json
```

This schema is then uploaded to Terraforge using the `Upload manually` button in the `Providers` menu.