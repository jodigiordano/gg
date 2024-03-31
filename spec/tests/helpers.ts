import { load } from "../index";

export function loadExample(name: string) {
  return load([import.meta.dirname, `../examples/${name}.yml`].join("/"));
}
