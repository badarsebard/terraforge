# Roadmap
Below is a list of features of Terraform that are currently unsupported and _may_ be implemented in the future.

- ~~Configure providers~~
- ~~Configure the `terraform` block~~
- ~~Declare and set variables~~
- ~~Declare and set outputs~~
- ~~Declare and set locals~~
- Support of dynamic blocks
- Support interpolation in strings
- Support comments
- Update graph based on the results of evaluating expressions and functions
- Support meta-arguments:
  - depends_on
  - count
  - for_each
  - lifecycle
  - provider
- Support modules and module expansion
- Support outputs from child modules
- Support provisioners
- Multi-file (archive) import
- Executing terraform commands like fmt, validate, and plan

## Improvement Ideas
- ~~HCL import sets provider configuration based on the provider blocks present~~
- Support provider aliases
- Support parsing expressions and functions during import
- Improve type support of strings, lists, maps, etc
- Handle quoted vs unquoted HCL strings (`resource` vs `"resource_name"`)
- Create a `raw edit` mode that allows the user to directly modify the stanza
