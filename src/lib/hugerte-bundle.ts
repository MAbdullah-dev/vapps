/**
 * Registers HugeRTE core, theme, skins, and plugins for bundling.
 * Must set `window.hugerte` so @hugerte/hugerte-react uses this instance (with plugins),
 * not a bare copy from the jsDelivr CDN.
 */
import hugerte from "hugerte";

import "hugerte/models/dom";
import "hugerte/icons/default";
import "hugerte/themes/silver";
import "hugerte/skins/ui/oxide/skin.js";
import "hugerte/skins/ui/oxide/content.js";
import "hugerte/skins/content/default/content.js";

import "hugerte/plugins/advlist";
import "hugerte/plugins/anchor";
import "hugerte/plugins/autolink";
import "hugerte/plugins/autoresize";
import "hugerte/plugins/charmap";
import "hugerte/plugins/code";
import "hugerte/plugins/codesample";
import "hugerte/plugins/directionality";
import "hugerte/plugins/fullscreen";
import "hugerte/plugins/image";
import "hugerte/plugins/insertdatetime";
import "hugerte/plugins/link";
import "hugerte/plugins/lists";
import "hugerte/plugins/media";
import "hugerte/plugins/nonbreaking";
import "hugerte/plugins/pagebreak";
import "hugerte/plugins/preview";
import "hugerte/plugins/searchreplace";
import "hugerte/plugins/table";
import "hugerte/plugins/visualblocks";
import "hugerte/plugins/visualchars";
import "hugerte/plugins/wordcount";
import "hugerte/plugins/emoticons";
import "hugerte/plugins/emoticons/js/emojis";
import "hugerte/plugins/help";
import "hugerte/plugins/help/js/i18n/keynav/en.js";

if (typeof window !== "undefined") {
  window.hugerte = hugerte;
}

export { hugerte };

/** Plugin list aligned with https://hugerte.org/#demo */
export const HUGERTE_PLUGINS =
  "advlist autolink lists link image charmap preview anchor searchreplace visualblocks code codesample fullscreen insertdatetime media table help wordcount emoticons";

export const HUGERTE_TOOLBAR =
  "undo redo | blocks | bold italic underline strikethrough | forecolor backcolor | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | link image media table codesample charmap emoticons | removeformat code fullscreen preview help";

export const HUGERTE_MENUBAR = "file edit view insert format tools table help";

export const HUGERTE_BLOCK_FORMATS =
  "Paragraph=p; Heading 1=h1; Heading 2=h2; Heading 3=h3; Heading 4=h4; Preformatted=pre";
