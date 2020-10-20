DrEdition Folio API
===================

The folio api will be called by Brokkr to render any customer specific elements on print pages.

This API has one endpoint:

- `POST /folio`, which will render the folio based on page data, and write the resulting HTML to Smooth Storage

It relies on `@aptoma/hapi-dredition-auth` for access to ASS credentials.

Customer files
--------------

The payload from Brokkr should contain a field `assetsPath`, which should point to the root of the customer folio repo. That repo should have two folders, files and stylesheets, where files should contain a single index.js with a `render(data, assetsPath[, http])` function.

The render function should return an array of layer objects:

- `name`: Can be anything, not really used, may be relevant for debugging
- `order`: `above|below`, to signify whether this layer should be rendered above or below the page content
- `html`: A full HTML page with all the content for this layer

It's currently expected that each layer will have the same size as the print page.

It's not yet decided how Brokkr will get the correct assetsPath, or whether that should come from somewhere else. It's expected that a customer may wish to have multiple repos, and quite possibly not the same commit for all products (at least when implementing new folio elements).
