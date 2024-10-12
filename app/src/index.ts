import { getUrlParams } from "./persistence.js";

const urlParams = getUrlParams();

if (urlParams.file || urlParams.id) {
  window.location.replace(`/editor.html${window.location.hash}`);
}
