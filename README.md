DrEdition Folio API
===================

The folio api will be called by Brokkr or DrEdition directly to render any customer specific elements on print pages.

This API has one endpoint:

- `POST /folio`, which will render the folio based on page data, and write the resulting HTML to Smooth Storage. It can also optionally create a PDF and preview image.

It relies on `@aptoma/hapi-dredition-auth` for access to ASS credentials.

We use https://github.com/patriksimek/vm2 to compile and execute the customer code in a presumed safe samdbox. We then upload each layer to Smooth Storage, and if `withPdf: true`, we also create a PDF and preview image using Brokkr.


Customer files
--------------

The expected payload is the same as can be fetched from `/print-editions/{id}/pages/{pageId}/folio-data` in the DrEdition API.

We use the `edition.data` field to determine how to fetch assets path. We either read `folioAssetsPath`, which should be the base url where `files/index.js` can be found, or we expect the name of an Aptoma GitHub repo connected to Asset Builder, ie. `aptoma/folio-nhst-fiskeribladet/master`.

`files/index.js` should have a `render(data, assetsPath[, http])` function.

The render function should return an array of layer objects:

- `name`: Can be anything, not really used, may be relevant for debugging
- `order`: `above|below`, to signify whether this layer should be rendered above or below the page content
- `html`: A full HTML page with all the content for this layer

It's currently expected that each layer will have the same size as the print page.

It's not yet decided how Brokkr will get the correct assetsPath, or whether that should come from somewhere else. It's expected that a customer may wish to have multiple repos, and quite possibly not the same commit for all products (at least when implementing new folio elements).
