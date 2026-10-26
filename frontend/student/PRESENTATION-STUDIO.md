# Presentation studio

The local editor has 20 structural templates: five electronics designs and fifteen general designs. Palette selection is independent. Text boxes and multiple images can be moved, resized, rotated, duplicated, deleted and ordered. Text font, size, alignment and color are independent of layout. The editor, player and exporters consume `presentationScene.ts`.

Drafts (including original PowerPoint packages) are saved in IndexedDB. Existing localStorage drafts still load. There is no backend/database integration in this change.

## PowerPoint import

- Open `.pptx` files, up to 25 MB compressed, 100 MB expanded and 40 slides. `.ppt` needs conversion to `.pptx` in PowerPoint first.
- The import confirmation shows compatibility notes before replacing the canvas. The current deck can be backed up, and opening a deck can be undone.
- Native text, basic shapes and embedded PNG/JPEG/GIF images become canvas objects. Master/layout decorations and grouped drawings remain locked. Original slide dimensions and source parts are retained.
- The source package is copied during export. Untouched original shapes, masters, themes, layouts, media and unsupported parts are retained; supported edited elements are patched and new elements are appended. Slide order and duplicates get their own slide/notes parts.
- This is not a full PowerPoint rendering engine. Charts, SmartArt, tables, effects, mixed text formatting, arbitrary paths, cropped/flipped pictures and some inherited formatting have simplified or missing previews. Animations/transitions are not played in the browser. Compatibility notes explain this. PDF uses the editor's representation, whereas the PowerPoint export retains untouched originals.
- External images are not fetched, XML entities are rejected, and compressed/expanded archive sizes are bounded.

OOXML structure reference: [Microsoft — working with slide masters](https://learn.microsoft.com/en-us/office/open-xml/presentation/working-with-slide-masters).

## Checks

`vitest run src/test/presentation.test.ts src/test/presentation-import.test.ts`

These check all twenty designs, palette independence, free object placement and validation, editable OOXML output, source master/theme preservation, unsupported-part retention, 4:3 sizing and import/edit/export/reopen.

Browser checks additionally cover dragging, corner resizing, duplicate text, multiple images, image fitting, saved-draft reload, template filters, actual `.pptx` import confirmation and export downloads, PDF generation and a 390px viewport. Full Microsoft PowerPoint/Keynote application interoperability still needs manual verification.
