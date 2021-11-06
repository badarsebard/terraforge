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

Install the dependencies...

```bash
cd svelte-app
npm install
```

...then start [Rollup](https://rollupjs.org):

```bash
npm run dev
```

Navigate to [localhost:5000](http://localhost:5000). You should see the app running.

## Deploying to the web

### With [Vercel](https://vercel.com)

Install `vercel` if you haven't already:

```bash
npm install -g vercel
```

Then, from within your project folder:

```bash
cd public
vercel deploy --name my-project
```

### With [surge](https://surge.sh/)

Install `surge` if you haven't already:

```bash
npm install -g surge
```

Then, from within your project folder:

```bash
npm run build
surge public my-project.surge.sh
```

# License
The majority of this project is licensed under the [Mozilla Public License, v. 2.0](https://mozilla.org/MPL/2.0/). The
`contrib/` directory and its contents are licensed under the [MIT](https://www.mit.edu/~amini/LICENSE.md) license. Any
file which does not contain the MPL license header is still covered by the MPL if it is located in a directory 
containing a `LICENSE` with the header.