# Graph Import/Export
Terraforge utilizes the cytoscape js library for the rendering and manipulation of the configuration graph. This library
can import and export a representation of the graph and its data in a JSON format. Terraforge utilizes this 
import/export capability to save and load various configurations that users develop and work on. This is key since the
application (currently) does not save state between sessions or even page loads. Refreshing or navigating to another 
page will lose any unsaved progress. The browser _should_ present a warning to the user if it detects any changes prior
to navigation or refresh but this mechanism should not be relied on exclusively. The recommended method is to export
the JSON data and save it for future import.

## Import/Export Walkthrough
The navbar at the top of the page has a dropdown menu labeled `Design`. Hovering over this menu item will present the 
option to Import or Export. Clicking export will cause the browser to immediately download a file called 
`terraforge.json`. Clicking the import button will open a file dialog to select the JSON file later on. Please note that
the diagram may not display immediately if a providers schema has not yet been loaded.